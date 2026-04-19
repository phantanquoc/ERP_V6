import logger from '@config/logger';
import prisma from '@config/database';
import { Notification as PrismaNotification, Prisma, UserRole } from '@prisma/client';
import {
  NotificationCategory,
  NotificationEnvelope,
  NotificationMetadata,
  NotificationRoutingEvent,
  NotificationRoutingTargetType,
  NotificationSettings,
  NotificationType,
} from '@types';
import { NotFoundError } from '@utils/errors';
import pushNotificationService from './pushNotificationService';
import notificationRecipientService from './notificationRecipientService';
import systemSettingsService from './systemSettingsService';
import { wsManager } from './wsManager';

interface NotificationWriteData {
  type: string;
  title: string;
  message: string;
  metadata?: NotificationMetadata;
  period?: string;
  evaluationId?: string;
  taskId?: string;
  acceptanceHandoverId?: string;
  leaveRequestId?: string;
  supplyRequestId?: string;
}

interface NotificationDescriptor {
  eventName: string;
  category: NotificationCategory;
  entityType?: string;
  entityId?: string;
}

interface NotificationWriteClient {
  notification: {
    create: typeof prisma.notification.create;
    createMany: typeof prisma.notification.createMany;
  };
}

interface NotificationWriteOptions {
  dbClient?: NotificationWriteClient;
  sendPush?: boolean;
}

interface WorkflowNotificationMetadataInput {
  actorUserId?: string;
  actionType: 'created' | 'updated' | 'status_changed' | 'confirmed';
  actionLabel: string;
  summary?: string;
  changedFields?: string[];
  entityType?: string;
  entityId?: string;
  entityCode?: string;
  entityName?: string;
}

interface NotificationRecipientRoutingQuery {
  employeeIds?: string[];
  userIds?: string[];
  roles?: UserRole[];
  departmentCodes?: string[];
  subDepartmentCodes?: string[];
  excludeEmployeeIds?: string[];
  excludeUserIds?: string[];
}

export class NotificationService {
  private async getNotificationRuntimeSettings(): Promise<NotificationSettings> {
    const settings = await systemSettingsService.getSettings();
    return settings.notificationSettings;
  }

  private getCategoryForType(type: string): NotificationCategory {
    return this.getDescriptor({ type } as PrismaNotification).category;
  }

  private async canDisplayNotificationType(type: string): Promise<boolean> {
    const settings = await this.getNotificationRuntimeSettings();
    if (!settings.channels.inAppEnabled) {
      return false;
    }

    return settings.categories[this.getCategoryForType(type)] !== false;
  }

  private async canSendPushForType(type: string): Promise<boolean> {
    const settings = await this.getNotificationRuntimeSettings();
    if (!settings.channels.webPushEnabled) {
      return false;
    }

    return settings.categories[this.getCategoryForType(type)] !== false;
  }

  private async resolveEmployeeIdByUserId(userId: string): Promise<string> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { employees: true },
    });

    if (!user?.employees) {
      throw new Error('Employee not found for user');
    }

    return user.employees.id;
  }

  private async resolveRecipientEmployeeIdsForEvent(
    eventKey: NotificationRoutingEvent,
    fallbackQuery: NotificationRecipientRoutingQuery
  ): Promise<string[]> {
    const settings = await this.getNotificationRuntimeSettings();
    const rule = settings.routingRules[eventKey];

    if (!rule) {
      return notificationRecipientService.resolveEmployeeIds(fallbackQuery);
    }

    if (!rule.enabled) {
      return [];
    }

    const configuredQuery: NotificationRecipientRoutingQuery = {
      roles: [],
      departmentCodes: [],
      subDepartmentCodes: [],
      employeeIds: [],
      userIds: [],
      excludeEmployeeIds: fallbackQuery.excludeEmployeeIds,
      excludeUserIds: fallbackQuery.excludeUserIds,
    };

    for (const recipient of rule.recipients) {
      switch (recipient.type) {
        case NotificationRoutingTargetType.ROLE:
          configuredQuery.roles?.push(recipient.value as UserRole);
          break;
        case NotificationRoutingTargetType.DEPARTMENT:
          configuredQuery.departmentCodes?.push(recipient.value);
          break;
        case NotificationRoutingTargetType.SUB_DEPARTMENT:
          configuredQuery.subDepartmentCodes?.push(recipient.value);
          break;
        default:
          break;
      }
    }

    return notificationRecipientService.resolveEmployeeIds(configuredQuery);
  }

  private buildMetadata(notification: PrismaNotification): NotificationMetadata {
    const storedMetadata = notification.metadata
      && typeof notification.metadata === 'object'
      && !Array.isArray(notification.metadata)
      ? (notification.metadata as unknown as Partial<NotificationMetadata>)
      : {};

    return {
      ...storedMetadata,
      legacyType: notification.type,
      period: storedMetadata.period ?? notification.period ?? undefined,
      evaluationId: storedMetadata.evaluationId ?? notification.evaluationId ?? undefined,
      taskId: storedMetadata.taskId ?? notification.taskId ?? undefined,
      acceptanceHandoverId: storedMetadata.acceptanceHandoverId ?? notification.acceptanceHandoverId ?? undefined,
      leaveRequestId: storedMetadata.leaveRequestId ?? notification.leaveRequestId ?? undefined,
      supplyRequestId: storedMetadata.supplyRequestId ?? notification.supplyRequestId ?? undefined,
    };
  }

  private async resolveActorMetadata(actorUserId?: string): Promise<NotificationMetadata['actor'] | undefined> {
    if (!actorUserId) {
      return undefined;
    }

    const actor = await prisma.user.findUnique({
      where: { id: actorUserId },
      include: {
        employees: {
          include: {
            subDepartment: {
              include: {
                department: true,
              },
            },
          },
        },
      },
    });

    if (!actor) {
      return undefined;
    }

    const fullName = `${actor.firstName} ${actor.lastName}`.trim() || actor.email;

    return {
      userId: actor.id,
      employeeId: actor.employees?.id,
      name: fullName,
      role: actor.role,
      departmentCode: actor.employees?.subDepartment?.department?.code,
      departmentName: actor.employees?.subDepartment?.department?.name,
      subDepartmentCode: actor.employees?.subDepartment?.code,
      subDepartmentName: actor.employees?.subDepartment?.name,
    } as NotificationMetadata['actor'] & Record<string, unknown>;
  }

  async buildWorkflowMetadata(input: WorkflowNotificationMetadataInput): Promise<NotificationMetadata | undefined> {
    const actor = await this.resolveActorMetadata(input.actorUserId);

    if (!actor && !input.entityCode && !input.entityName && !input.summary && (!input.changedFields || input.changedFields.length === 0)) {
      return undefined;
    }

    return {
      legacyType: '',
      actor,
      action: {
        type: input.actionType,
        label: input.actionLabel,
        summary: input.summary,
        changedFields: input.changedFields?.filter(Boolean),
      },
      entity: {
        type: input.entityType,
        id: input.entityId,
        code: input.entityCode,
        name: input.entityName,
      },
    };
  }

  private getDescriptor(notification: PrismaNotification): NotificationDescriptor {
    switch (notification.type) {
      case NotificationType.EVALUATION:
        return {
          eventName: 'evaluation.assigned',
          category: NotificationCategory.EVALUATION,
          entityType: 'evaluation',
          entityId: notification.evaluationId ?? undefined,
        };
      case NotificationType.QUOTATION_REQUEST:
        return {
          eventName: 'quotation-request.created',
          category: NotificationCategory.REPORT,
          entityType: 'quotation-request',
        };
      case NotificationType.QUOTATION:
        return {
          eventName: 'quotation.created',
          category: NotificationCategory.REPORT,
          entityType: 'quotation',
        };
      case NotificationType.ORDER:
        return {
          eventName: 'order.created',
          category: NotificationCategory.REPORT,
          entityType: 'order',
        };
      case NotificationType.TAX_REPORT:
        return {
          eventName: 'tax-report.created',
          category: NotificationCategory.REPORT,
          entityType: 'tax-report',
        };
      case NotificationType.INVOICE:
        return {
          eventName: 'invoice.created',
          category: NotificationCategory.REPORT,
          entityType: 'invoice',
        };
      case NotificationType.CUSTOMER_FEEDBACK:
        return {
          eventName: 'customer-feedback.created',
          category: NotificationCategory.FEEDBACK,
          entityType: 'customer-feedback',
        };
      case NotificationType.EVALUATION_SUPERVISOR1:
        return {
          eventName: 'evaluation.supervisor1.pending',
          category: NotificationCategory.EVALUATION,
          entityType: 'evaluation',
          entityId: notification.evaluationId ?? undefined,
        };
      case NotificationType.EVALUATION_SUPERVISOR2:
        return {
          eventName: 'evaluation.supervisor2.pending',
          category: NotificationCategory.EVALUATION,
          entityType: 'evaluation',
          entityId: notification.evaluationId ?? undefined,
        };
      case NotificationType.EVALUATION_COMPLETED:
        return {
          eventName: 'evaluation.completed',
          category: NotificationCategory.EVALUATION,
          entityType: 'evaluation',
          entityId: notification.evaluationId ?? undefined,
        };
      case NotificationType.TASK:
        return {
          eventName: 'task.assigned',
          category: NotificationCategory.TASK,
          entityType: 'task',
          entityId: notification.taskId ?? undefined,
        };
      case NotificationType.TASK_EVALUATED:
        return {
          eventName: 'task.evaluated',
          category: NotificationCategory.TASK,
          entityType: 'task',
          entityId: notification.taskId ?? undefined,
        };
      case NotificationType.TASK_ADMIN:
        return {
          eventName: 'task.admin.visible',
          category: NotificationCategory.TASK,
          entityType: 'task',
          entityId: notification.taskId ?? undefined,
        };
      case NotificationType.LEAVE_REQUEST:
        return {
          eventName: 'leave.request.created',
          category: NotificationCategory.LEAVE,
          entityType: 'leave-request',
          entityId: notification.leaveRequestId ?? undefined,
        };
      case NotificationType.LEAVE_REQUEST_RESPONSE:
        return {
          eventName: 'leave.request.responded',
          category: NotificationCategory.LEAVE,
          entityType: 'leave-request',
          entityId: notification.leaveRequestId ?? undefined,
        };
      case NotificationType.PAYROLL:
        return {
          eventName: 'payroll.ready',
          category: NotificationCategory.PAYROLL,
          entityType: 'payroll-period',
          entityId: notification.period ?? undefined,
        };
      case NotificationType.ACCEPTANCE_HANDOVER:
        return {
          eventName: 'acceptance-handover.created',
          category: NotificationCategory.ACCEPTANCE,
          entityType: 'acceptance-handover',
          entityId: notification.acceptanceHandoverId ?? undefined,
        };
      case NotificationType.OVERTIME_PLAN:
        return {
          eventName: 'overtime-plan.updated',
          category: NotificationCategory.OVERTIME,
        };
      case NotificationType.OVERTIME_PLAN_APPROVAL:
        return {
          eventName: 'overtime-plan.approval-required',
          category: NotificationCategory.OVERTIME,
        };
      case NotificationType.SUPPLY_REQUEST:
        return {
          eventName: 'supply.request.visible',
          category: NotificationCategory.SUPPLY,
          entityType: 'supply-request',
          entityId: notification.supplyRequestId ?? undefined,
        };
      case NotificationType.SUPPLY_REQUEST_PROCESSING:
        return {
          eventName: 'supply.request.processing',
          category: NotificationCategory.SUPPLY,
          entityType: 'supply-request',
          entityId: notification.supplyRequestId ?? undefined,
        };
      case NotificationType.SUPPLY_REQUEST_APPROVED:
        return {
          eventName: 'supply.request.approved',
          category: NotificationCategory.SUPPLY,
          entityType: 'supply-request',
          entityId: notification.supplyRequestId ?? undefined,
        };
      case NotificationType.SUPPLY_REQUEST_FULFILLED:
        return {
          eventName: 'supply.request.fulfilled',
          category: NotificationCategory.SUPPLY,
          entityType: 'supply-request',
          entityId: notification.supplyRequestId ?? undefined,
        };
      case NotificationType.PURCHASE_REQUEST:
        return {
          eventName: 'purchase-request.created',
          category: NotificationCategory.SUPPLY,
          entityType: 'purchase-request',
          entityId: notification.supplyRequestId ?? undefined,
        };
      case NotificationType.PURCHASE_REQUEST_COMPLETED:
        return {
          eventName: 'purchase-request.completed',
          category: NotificationCategory.SUPPLY,
          entityType: 'purchase-request',
          entityId: notification.supplyRequestId ?? undefined,
        };
      case NotificationType.PASSWORD_RESET:
        return {
          eventName: 'auth.password-reset',
          category: NotificationCategory.AUTH,
        };
      case NotificationType.PRIVATE_FEEDBACK:
        return {
          eventName: 'feedback.private.created',
          category: NotificationCategory.FEEDBACK,
        };
      case NotificationType.DAILY_WORK_REPORT:
        return {
          eventName: 'daily-work-report.created',
          category: NotificationCategory.REPORT,
        };
      case NotificationType.WORK_PLAN:
        return {
          eventName: 'work-plan.created',
          category: NotificationCategory.WORK_PLAN,
        };
      default:
        return {
          eventName: 'system.notification',
          category: NotificationCategory.SYSTEM,
        };
    }
  }

  private toEnvelope(notification: PrismaNotification): NotificationEnvelope {
    const descriptor = this.getDescriptor(notification);

    return {
      id: notification.id,
      employeeId: notification.employeeId,
      type: notification.type,
      eventName: descriptor.eventName,
      category: descriptor.category,
      title: notification.title,
      message: notification.message,
      period: notification.period ?? undefined,
      evaluationId: notification.evaluationId ?? undefined,
      taskId: notification.taskId ?? undefined,
      acceptanceHandoverId: notification.acceptanceHandoverId ?? undefined,
      leaveRequestId: notification.leaveRequestId ?? undefined,
      supplyRequestId: notification.supplyRequestId ?? undefined,
      entityType: descriptor.entityType,
      entityId: descriptor.entityId,
      metadata: this.buildMetadata(notification),
      isRead: notification.isRead,
      readAt: notification.isRead ? notification.updatedAt.toISOString() : undefined,
      createdAt: notification.createdAt,
      updatedAt: notification.updatedAt,
    };
  }

  private async createNotificationForEmployee(
    employeeId: string,
    data: NotificationWriteData,
    dbClient: NotificationWriteClient = prisma
  ): Promise<NotificationEnvelope> {
    const notification = await dbClient.notification.create({
        data: {
          employeeId,
          type: data.type,
          title: data.title,
          message: data.message,
          metadata: data.metadata as Prisma.InputJsonValue | undefined,
          period: data.period,
          evaluationId: data.evaluationId,
          taskId: data.taskId,
        acceptanceHandoverId: data.acceptanceHandoverId,
        leaveRequestId: data.leaveRequestId,
        supplyRequestId: data.supplyRequestId,
        isRead: false,
      },
    });

    if (await this.canSendPushForType(data.type)) {
      pushNotificationService
        .sendPushToEmployee(employeeId, data.title, data.message)
        .catch((error) => {
          logger.error('[NotificationService] Failed to send push notification', {
            employeeId,
            type: data.type,
            error,
          });
        });
    }

    // Push via WebSocket for immediate realtime delivery
    wsManager.send(employeeId, this.toEnvelope(notification));

    return this.toEnvelope(notification);
  }

  private async createNotificationsForEmployees(
    employeeIds: string[],
    data: NotificationWriteData,
    options: NotificationWriteOptions = {}
  ): Promise<void> {
    if (employeeIds.length === 0) return;
    const { dbClient = prisma, sendPush = true } = options;

    await dbClient.notification.createMany({
      data: employeeIds.map((employeeId) => ({
        employeeId,
        type: data.type,
        title: data.title,
        message: data.message,
        metadata: data.metadata as Prisma.InputJsonValue | undefined,
        period: data.period,
        evaluationId: data.evaluationId,
        taskId: data.taskId,
        acceptanceHandoverId: data.acceptanceHandoverId,
        leaveRequestId: data.leaveRequestId,
        supplyRequestId: data.supplyRequestId,
        isRead: false,
      })),
    });

    if (!sendPush) {
      // Still push WS even when VAPID push is disabled
      employeeIds.forEach((employeeId) => {
        wsManager.send(employeeId, { type: data.type, title: data.title, message: data.message, metadata: data.metadata });
      });
      return;
    }

    if (!(await this.canSendPushForType(data.type))) {
      employeeIds.forEach((employeeId) => {
        wsManager.send(employeeId, { type: data.type, title: data.title, message: data.message, metadata: data.metadata });
      });
      return;
    }

    await Promise.allSettled(
      employeeIds.map((employeeId) => {
        wsManager.send(employeeId, { type: data.type, title: data.title, message: data.message, metadata: data.metadata });
        return pushNotificationService.sendPushToEmployee(employeeId, data.title, data.message).catch((error) => {
          logger.error('[NotificationService] Failed to send push notification', {
            employeeId,
            type: data.type,
            error,
          });
        });
      })
    );
  }

  async createNotification(data: {
    userId: string;
    type: string;
    title: string;
    message: string;
    evaluationId?: string;
    period?: string;
    taskId?: string;
    acceptanceHandoverId?: string;
    leaveRequestId?: string;
    supplyRequestId?: string;
  }): Promise<NotificationEnvelope> {
    const employeeId = await this.resolveEmployeeIdByUserId(data.userId);
    return this.createNotificationForEmployee(employeeId, data);
  }

  async createNotificationForResolvedEmployee(
    employeeId: string,
    data: NotificationWriteData,
    options?: NotificationWriteOptions
  ): Promise<NotificationEnvelope> {
    return this.createNotificationForEmployee(employeeId, data, options?.dbClient || prisma);
  }

  async getConfiguredRecipientEmployeeIds(
    eventKey: NotificationRoutingEvent,
    fallbackQuery: NotificationRecipientRoutingQuery
  ): Promise<string[]> {
    return this.resolveRecipientEmployeeIdsForEvent(eventKey, fallbackQuery);
  }

  async createNotificationsForResolvedEmployees(
    employeeIds: string[],
    data: NotificationWriteData,
    options?: NotificationWriteOptions
  ): Promise<void> {
    return this.createNotificationsForEmployees(employeeIds, data, options);
  }

  async createEvaluationNotification(
    employeeId: string,
    month: number,
    year: number,
    evaluationId: string
  ): Promise<NotificationEnvelope> {
    const period = `${year}-${String(month).padStart(2, '0')}`;
    const monthName = new Date(year, month - 1).toLocaleDateString('vi-VN', {
      month: 'long',
      year: 'numeric',
    });

    return this.createNotificationForEmployee(employeeId, {
      type: NotificationType.EVALUATION,
      title: `Đánh giá tháng ${monthName}`,
      message: 'Bạn có 1 đánh giá mới',
      period,
      evaluationId,
    });
  }

  async getEmployeeNotifications(employeeId: string, limit: number = 10): Promise<NotificationEnvelope[]> {
    const settings = await this.getNotificationRuntimeSettings();
    if (!settings.channels.inAppEnabled) {
      return [];
    }

    const notifications = await prisma.notification.findMany({
      where: { employeeId },
      orderBy: { createdAt: 'desc' },
      take: Math.min(Math.max(limit * 4, 50), 500),
    });

    return notifications
      .filter((notification) => settings.categories[this.getCategoryForType(notification.type)] !== false)
      .slice(0, limit)
      .map((notification) => this.toEnvelope(notification));
  }

  async getUnreadCount(employeeId: string): Promise<number> {
    const settings = await this.getNotificationRuntimeSettings();
    if (!settings.channels.inAppEnabled) {
      return 0;
    }

    const notifications = await prisma.notification.findMany({
      where: { employeeId, isRead: false },
      select: { type: true },
    });

    return notifications.filter((notification) => settings.categories[this.getCategoryForType(notification.type)] !== false).length;
  }

  async getUnreadNotifications(employeeId: string): Promise<NotificationEnvelope[]> {
    const settings = await this.getNotificationRuntimeSettings();
    if (!settings.channels.inAppEnabled) {
      return [];
    }

    const notifications = await prisma.notification.findMany({
      where: {
        employeeId,
        isRead: false,
      },
      orderBy: { createdAt: 'desc' },
    });

    return notifications
      .filter((notification) => settings.categories[this.getCategoryForType(notification.type)] !== false)
      .map((notification) => this.toEnvelope(notification));
  }

  async markAsReadForEmployee(notificationId: string, employeeId: string): Promise<NotificationEnvelope> {
    const notification = await prisma.notification.findFirst({
      where: { id: notificationId, employeeId },
    });

    if (!notification) {
      throw new NotFoundError('Notification not found');
    }

    const updated = await prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });

    return this.toEnvelope(updated);
  }

  async markAllAsRead(employeeId: string): Promise<{ count: number }> {
    const result = await prisma.notification.updateMany({
      where: {
        employeeId,
        isRead: false,
      },
      data: { isRead: true },
    });

    return { count: result.count };
  }

  async getUnreadCountByType(employeeId: string): Promise<Record<string, number>> {
    const settings = await this.getNotificationRuntimeSettings();
    if (!settings.channels.inAppEnabled) {
      return {};
    }

    const notifications = await prisma.notification.findMany({
      where: { employeeId, isRead: false },
      select: { type: true },
    });

    return notifications.reduce<Record<string, number>>((result, item) => {
      if (settings.categories[this.getCategoryForType(item.type)] === false) {
        return result;
      }

      result[item.type] = (result[item.type] || 0) + 1;
      return result;
    }, {});
  }

  async deleteNotificationForEmployee(notificationId: string, employeeId: string): Promise<void> {
    const notification = await prisma.notification.findFirst({
      where: { id: notificationId, employeeId },
    });

    if (!notification) {
      throw new NotFoundError('Notification not found');
    }

    await prisma.notification.delete({
      where: { id: notificationId },
    });
  }

  async getLatestEvaluationNotification(employeeId: string): Promise<NotificationEnvelope | null> {
    if (!(await this.canDisplayNotificationType(NotificationType.EVALUATION))) {
      return null;
    }

    const notification = await prisma.notification.findFirst({
      where: {
        employeeId,
        type: NotificationType.EVALUATION,
      },
      orderBy: { createdAt: 'desc' },
    });

    return notification ? this.toEnvelope(notification) : null;
  }

  async createTaskNotification(
    employeeId: string,
    taskId: string,
    taskTitle: string,
    assignerName: string
  ): Promise<NotificationEnvelope> {
    return this.createNotificationForEmployee(employeeId, {
      type: NotificationType.TASK,
      title: 'Nhiệm vụ mới',
      message: `${assignerName} đã giao cho bạn nhiệm vụ: "${taskTitle}"`,
      taskId,
    });
  }

  async createTaskNotifications(
    employeeIds: string[],
    taskId: string,
    taskTitle: string,
    assignerName: string
  ): Promise<void> {
    await this.createNotificationsForEmployees(employeeIds, {
      type: NotificationType.TASK,
      title: 'Nhiệm vụ mới',
      message: `${assignerName} đã giao cho bạn nhiệm vụ: "${taskTitle}"`,
      taskId,
    });
  }

  async createTaskEvaluationNotifications(
    employeeIds: string[],
    taskId: string,
    taskTitle: string,
    evaluatorName: string,
    score: number,
    options?: NotificationWriteOptions
  ): Promise<void> {
    await this.createNotificationsForEmployees(employeeIds, {
      type: NotificationType.TASK_EVALUATED,
      title: 'Nhiệm vụ đã được đánh giá',
      message: `${evaluatorName} đã đánh giá nhiệm vụ: "${taskTitle}". Điểm: ${score}/100`,
      taskId,
    }, options);
  }

  async sendPushNotifications(employeeIds: string[], title: string, message: string, type?: string): Promise<void> {
    if (employeeIds.length === 0) {
      return;
    }

    if (type && !(await this.canSendPushForType(type))) {
      return;
    }

    await Promise.allSettled(
      employeeIds.map((employeeId) =>
        pushNotificationService.sendPushToEmployee(employeeId, title, message).catch((error) => {
          logger.error('[NotificationService] Failed to send push notification', {
            employeeId,
            title,
            error,
          });
        })
      )
    );
  }

  async createLeaveRequestNotification(
    employeeIds: string[],
    employeeName: string,
    leaveTypeLabel: string,
    leaveRequestId?: string
  ): Promise<void> {
    await this.createNotificationsForEmployees(employeeIds, {
      type: NotificationType.LEAVE_REQUEST,
      title: 'Đơn nghỉ phép mới',
      message: `${employeeName} đã gửi đơn nghỉ phép ${leaveTypeLabel}`,
      leaveRequestId,
    });
  }

  async createLeaveRequestResponseNotification(
    employeeId: string,
    leaveCode: string,
    status: 'APPROVED' | 'REJECTED'
  ): Promise<void> {
    await this.createNotificationForEmployee(employeeId, {
      type: NotificationType.LEAVE_REQUEST_RESPONSE,
      title: status === 'APPROVED' ? 'Đơn nghỉ phép được duyệt' : 'Đơn nghỉ phép bị từ chối',
      message: status === 'APPROVED'
        ? `Đơn nghỉ phép ${leaveCode} của bạn đã được phê duyệt`
        : `Đơn nghỉ phép ${leaveCode} của bạn đã bị từ chối`,
    });
  }

  async createPayrollNotifications(
    employeeIds: string[],
    month: number,
    year: number,
    period: string
  ): Promise<void> {
    await this.createNotificationsForEmployees(employeeIds, {
      type: NotificationType.PAYROLL,
      title: `Bảng lương tháng ${month}/${year}`,
      message: `Bảng lương tháng ${month}/${year} của bạn đã sẵn sàng. Nhấn để xem chi tiết.`,
      period,
    });
  }

  async createAcceptanceHandoverNotification(
    employeeId: string,
    maNghiemThu: string,
    tenThietBi: string,
    nguoiBanGiao: string,
    acceptanceHandoverId: string
  ): Promise<void> {
    await this.createNotificationForEmployee(employeeId, {
      type: NotificationType.ACCEPTANCE_HANDOVER,
      title: 'Nghiệm thu bàn giao mới',
      message: `${nguoiBanGiao} đã tạo nghiệm thu bàn giao ${maNghiemThu} cho thiết bị "${tenThietBi}". Vui lòng kiểm tra và xác nhận.`,
      acceptanceHandoverId,
    });
  }

  async createSupplyRequestNotification(
    employeeId: string,
    type: string,
    title: string,
    message: string,
    supplyRequestId?: string
  ): Promise<void> {
    await this.createNotificationForEmployee(employeeId, {
      type,
      title,
      message,
      supplyRequestId,
    });
  }

  async createSupplyRequestNotifications(
    employeeIds: string[],
    type: string,
    title: string,
    message: string,
    supplyRequestId?: string
  ): Promise<void> {
    await this.createNotificationsForEmployees(employeeIds, {
      type,
      title,
      message,
      supplyRequestId,
    });
  }

  async createWorkflowNotifications(
    employeeIds: string[],
    data: NotificationWriteData,
    options?: NotificationWriteOptions
  ): Promise<void> {
    await this.createNotificationsForEmployees(employeeIds, data, options);
  }

  async getAdminEmployeeIds(excludeUserId?: string): Promise<string[]> {
    return this.resolveRecipientEmployeeIdsForEvent(NotificationRoutingEvent.TASK_ADMIN_VISIBLE, {
      roles: ['ADMIN'],
      excludeUserIds: excludeUserId ? [excludeUserId] : undefined,
    });
  }

  async createAdminTaskNotification(
    taskTitle: string,
    assignerName: string,
    taskId: string,
    excludeUserId?: string,
    recipientNames?: string
  ): Promise<void> {
    const adminEmployeeIds = await this.resolveRecipientEmployeeIdsForEvent(NotificationRoutingEvent.TASK_ADMIN_VISIBLE, {
      roles: ['ADMIN'],
      excludeUserIds: excludeUserId ? [excludeUserId] : undefined,
    });
    if (adminEmployeeIds.length === 0) return;

    await this.createNotificationsForEmployees(adminEmployeeIds, {
      type: NotificationType.TASK_ADMIN,
      title: 'Nhiệm vụ mới trong hệ thống',
      message: recipientNames
        ? `${assignerName} đã giao cho ${recipientNames} nhiệm vụ: "${taskTitle}"`
        : `${assignerName} đã giao nhiệm vụ: "${taskTitle}"`,
      taskId,
    });
  }

  async createAdminFeedbackNotification(
    employeeName: string,
    excludeUserId?: string
  ): Promise<void> {
    const adminEmployeeIds = await this.resolveRecipientEmployeeIdsForEvent(NotificationRoutingEvent.FEEDBACK_ADMIN_VISIBLE, {
      roles: ['ADMIN'],
      excludeUserIds: excludeUserId ? [excludeUserId] : undefined,
    });
    if (adminEmployeeIds.length === 0) return;

    await this.createNotificationsForEmployees(adminEmployeeIds, {
      type: NotificationType.PRIVATE_FEEDBACK,
      title: 'Góp ý mới',
      message: `${employeeName} đã gửi góp ý mới`,
    });
  }

  async createAdminDailyReportNotification(
    employeeName: string,
    reportDate: string,
    excludeUserId?: string
  ): Promise<void> {
    const adminEmployeeIds = await this.resolveRecipientEmployeeIdsForEvent(NotificationRoutingEvent.DAILY_REPORT_ADMIN_VISIBLE, {
      roles: ['ADMIN'],
      excludeUserIds: excludeUserId ? [excludeUserId] : undefined,
    });
    if (adminEmployeeIds.length === 0) return;

    await this.createNotificationsForEmployees(adminEmployeeIds, {
      type: NotificationType.DAILY_WORK_REPORT,
      title: 'Báo cáo công việc mới',
      message: `${employeeName} đã nộp báo cáo công việc ngày ${reportDate}`,
    });
  }

  // ─── Order Flow Notifications ────────────────────────────────────────────────

  async createQuotationRequestNotification(params: {
    actorName: string;
    code: string;
    action?: 'created' | 'updated';
  }): Promise<void> {
    const { actorName, code, action = 'created' } = params;
    const isCreate = action === 'created';
    const employeeIds = await this.resolveRecipientEmployeeIdsForEvent(
      NotificationRoutingEvent.QUOTATION_REQUEST_CREATED,
      { roles: ['ADMIN'], subDepartmentCodes: ['SUBDEPT_GENERAL_PRICING'] }
    );
    if (employeeIds.length === 0) return;
    await this.createNotificationsForEmployees(employeeIds, {
      type: NotificationType.QUOTATION_REQUEST,
      title: isCreate ? 'Yêu cầu báo giá mới' : 'Yêu cầu báo giá được cập nhật',
      message: isCreate
        ? `${actorName} vừa tạo yêu cầu báo giá ${code}`
        : `${actorName} vừa cập nhật yêu cầu báo giá ${code}`,
    });
  }

  async createQuotationNotification(params: {
    actorName: string;
    code: string;
    action?: 'created' | 'updated' | 'confirmed';
  }): Promise<void> {
    const { actorName, code, action = 'created' } = params;
    const eventKey =
      action === 'confirmed'
        ? NotificationRoutingEvent.QUOTATION_CUSTOMER_CONFIRMED
        : NotificationRoutingEvent.QUOTATION_CREATED;
    const fallbackQuery =
      action === 'confirmed'
        ? {
            roles: ['ADMIN'] as UserRole[],
            departmentCodes: ['DEPT_BUSINESS'],
            subDepartmentCodes: ['SUBDEPT_PRODUCTION_MANAGEMENT', 'SUBDEPT_ACCOUNTING_ADMIN'],
          }
        : { roles: ['ADMIN'] as UserRole[], departmentCodes: ['DEPT_BUSINESS'] };
    const employeeIds = await this.resolveRecipientEmployeeIdsForEvent(eventKey, fallbackQuery);
    if (employeeIds.length === 0) return;
    const titleMap: Record<string, string> = {
      created: 'Báo giá mới',
      updated: 'Báo giá được cập nhật',
      confirmed: 'Khách hàng xác nhận báo giá',
    };
    const messageMap: Record<string, string> = {
      created: `${actorName} vừa tạo báo giá ${code}`,
      updated: `${actorName} vừa cập nhật báo giá ${code}`,
      confirmed: `${actorName} xác nhận khách hàng đã chốt báo giá ${code}`,
    };
    await this.createNotificationsForEmployees(employeeIds, {
      type: NotificationType.QUOTATION,
      title: titleMap[action],
      message: messageMap[action],
    });
  }

  async createOrderNotification(params: {
    actorName: string;
    code: string;
    action?: 'created' | 'updated';
    statusLabel?: string;
  }): Promise<void> {
    const { actorName, code, action = 'created', statusLabel } = params;
    const employeeIds = await this.resolveRecipientEmployeeIdsForEvent(
      NotificationRoutingEvent.ORDER_CREATED,
      { roles: ['ADMIN'], subDepartmentCodes: ['SUBDEPT_PRODUCTION_MANAGEMENT'] }
    );
    if (employeeIds.length === 0) return;
    const isCreate = action === 'created';
    await this.createNotificationsForEmployees(employeeIds, {
      type: NotificationType.ORDER,
      title: isCreate ? 'Đơn hàng mới' : 'Đơn hàng được cập nhật',
      message: isCreate
        ? `${actorName} vừa tạo đơn hàng ${code}`
        : statusLabel
        ? `${actorName} cập nhật đơn hàng ${code}: ${statusLabel}`
        : `${actorName} vừa cập nhật đơn hàng ${code}`,
    });
  }

  async createTaxReportNotification(params: {
    actorName: string;
    code: string;
    action?: 'created' | 'updated';
  }): Promise<void> {
    const { actorName, code, action = 'created' } = params;
    const isCreate = action === 'created';
    const employeeIds = await this.resolveRecipientEmployeeIdsForEvent(
      NotificationRoutingEvent.TAX_REPORT_CREATED,
      { roles: ['ADMIN'], subDepartmentCodes: ['SUBDEPT_ACCOUNTING_TAX'] }
    );
    if (employeeIds.length === 0) return;
    await this.createNotificationsForEmployees(employeeIds, {
      type: NotificationType.TAX_REPORT,
      title: isCreate ? 'Báo cáo thuế mới' : 'Báo cáo thuế được cập nhật',
      message: isCreate
        ? `${actorName} vừa tạo báo cáo thuế ${code}`
        : `${actorName} vừa cập nhật báo cáo thuế ${code}`,
    });
  }

  async createInvoiceNotification(params: {
    actorName: string;
    code: string;
    action?: 'created' | 'updated';
  }): Promise<void> {
    const { actorName, code, action = 'created' } = params;
    const isCreate = action === 'created';
    const employeeIds = await this.resolveRecipientEmployeeIdsForEvent(
      NotificationRoutingEvent.INVOICE_CREATED,
      { roles: ['ADMIN'], subDepartmentCodes: ['SUBDEPT_ACCOUNTING_ADMIN'], departmentCodes: ['DEPT_BUSINESS'] }
    );
    if (employeeIds.length === 0) return;
    await this.createNotificationsForEmployees(employeeIds, {
      type: NotificationType.INVOICE,
      title: isCreate ? 'Hóa đơn mới' : 'Hóa đơn được cập nhật',
      message: isCreate
        ? `${actorName} vừa tạo hóa đơn ${code}`
        : `${actorName} vừa cập nhật hóa đơn ${code}`,
    });
  }

  async createCustomerFeedbackNotification(params: {
    actorName: string;
    customerName: string;
    action?: 'created' | 'updated';
  }): Promise<void> {
    const { actorName, customerName, action = 'created' } = params;
    const isCreate = action === 'created';
    const employeeIds = await this.resolveRecipientEmployeeIdsForEvent(
      NotificationRoutingEvent.CUSTOMER_FEEDBACK_CREATED,
      { roles: ['ADMIN'], departmentCodes: ['DEPT_BUSINESS'] }
    );
    if (employeeIds.length === 0) return;
    await this.createNotificationsForEmployees(employeeIds, {
      type: NotificationType.CUSTOMER_FEEDBACK,
      title: isCreate ? 'Phản hồi khách hàng mới' : 'Phản hồi khách hàng được cập nhật',
      message: isCreate
        ? `${actorName} vừa ghi nhận phản hồi từ khách hàng ${customerName}`
        : `${actorName} vừa cập nhật phản hồi từ khách hàng ${customerName}`,
    });
  }
}

export default new NotificationService();
