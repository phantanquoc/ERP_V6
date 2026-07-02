import prisma from '@config/database';
import { NotificationType, NotificationEvent, NotificationContext } from '@types';
import type { CursorPaginatedResponse } from '@types';
import logger from '@config/logger';
import pushNotificationService from './pushNotificationService';
import { pushNotification } from './wsManager';
import { notificationRegistry } from './notificationRegistry';
import { NotFoundError } from '@utils/errors';
import { getCursorPaginationParams, encodeCursor } from '@utils/helpers';
import { getTodayInAppTz } from '@utils/dateUtils';

export class NotificationService {

  /* ─── Core Event-Driven Method ───────────────────────────────────────────── */

  /**
   * Unified notification dispatch. Looks up the event in the registry,
   * builds the message, resolves recipients, persists to DB, and fans out
   * via WebSocket + Web Push.
   */
  async notify(event: NotificationEvent, ctx: NotificationContext): Promise<void> {
    const def = notificationRegistry.get(event);
    if (!def) {
      logger.warn(`[NotificationService] No registry entry for event: ${event}`);
      return;
    }

    let recipientEmployeeIds = await def.resolveRecipients(ctx);
    if (recipientEmployeeIds.length === 0) return;

    // Filter out employees whose user has muted this notification type
    try {
      const mutedPrefs = await prisma.notificationPreference.findMany({
        where: {
          notificationType: def.notificationType,
          muted: true,
          user: {
            employees: {
              id: { in: recipientEmployeeIds },
            },
          },
        },
        select: { userId: true },
      });

      if (mutedPrefs.length > 0) {
        const mutedUserIds = mutedPrefs.map((p) => p.userId);
        const mutedEmployees = await prisma.employee.findMany({
          where: { userId: { in: mutedUserIds } },
          select: { id: true },
        });
        const mutedEmployeeIdSet = new Set(mutedEmployees.map((e) => e.id));
        recipientEmployeeIds = recipientEmployeeIds.filter(
          (id) => !mutedEmployeeIdSet.has(id)
        );
      }
    } catch (err) {
      logger.warn(
        `[NotificationService] Preference filter failed for event ${event}, falling back to all recipients: ${err}`
      );
    }

    if (recipientEmployeeIds.length === 0) return;

    const { title, message } = def.buildMessage(ctx);

    const metadataJson = {
      event,
      entityId: ctx.entityId,
      ...ctx.metadata,
    };

    // Persist to DB
    await prisma.notification.createMany({
      data: recipientEmployeeIds.map(employeeId => ({
        employeeId,
        type: def.notificationType,
        title,
        message,
        metadata: metadataJson,
        // Legacy FK columns for backward compat
        evaluationId: (ctx.metadata?.evaluationId as string) ?? undefined,
        taskId: (ctx.metadata?.taskId as string) ?? undefined,
        acceptanceHandoverId: (ctx.metadata?.acceptanceHandoverId as string) ?? undefined,
        leaveRequestId: (ctx.metadata?.leaveRequestId as string) ?? undefined,
        supplyRequestId: (ctx.metadata?.supplyRequestId as string) ?? undefined,
        period: (ctx.metadata?.period as string) ?? undefined,
        isRead: false,
      })),
    });

    // Fan-out: WS + Web Push (non-blocking)
    const wsPayload = { type: def.notificationType, title, message, metadata: metadataJson };

    await Promise.allSettled(
      recipientEmployeeIds.map(async (employeeId) => {
        // WebSocket push
        pushNotification(employeeId, wsPayload);
        // Web Push (VAPID)
        pushNotificationService
          .sendPushToEmployee(employeeId, title, message)
          .catch(() => {});
      })
    );
  }

  /* ─── Legacy Methods (kept for backward compatibility) ───────────────────── */

  /** Push notification via WebSocket to an employee */
  private wsPush(employeeId: string, type: string, title: string, message: string): void {
    pushNotification(employeeId, { type, title, message });
  }

  async createNotification(data: {
    userId: string;
    type: string;
    title: string;
    message: string;
    evaluationId?: string;
    period?: string;
    taskId?: string;
  }): Promise<any> {
    const user = await prisma.user.findUnique({
      where: { id: data.userId },
      include: { employees: true },
    });

    if (!user?.employees) {
      throw new Error('Employee not found for user');
    }

    const notification = await prisma.notification.create({
      data: {
        employeeId: user.employees.id,
        type: data.type,
        title: data.title,
        message: data.message,
        evaluationId: data.evaluationId,
        period: data.period,
        taskId: data.taskId,
        isRead: false,
      },
    });

    this.wsPush(user.employees.id, data.type, data.title, data.message);
    pushNotificationService
      .sendPushToEmployee(user.employees.id, data.title, data.message)
      .catch(() => {});

    return notification;
  }

  async createEvaluationNotification(
    employeeId: string,
    month: number,
    year: number,
    evaluationId: string
  ): Promise<any> {
    const period = `${year}-${String(month).padStart(2, '0')}`;
    const monthName = new Date(year, month - 1).toLocaleDateString('vi-VN', {
      month: 'long',
      year: 'numeric',
    });

    const title = `Đánh giá tháng ${monthName}`;
    const message = `Bạn có 1 đánh giá mới`;

    const notification = await prisma.notification.create({
      data: {
        employeeId,
        type: NotificationType.EVALUATION,
        title,
        message,
        period,
        evaluationId,
        isRead: false,
      },
    });

    this.wsPush(employeeId, NotificationType.EVALUATION, title, message);
    pushNotificationService
      .sendPushToEmployee(employeeId, title, message)
      .catch(() => {});

    return notification;
  }

  async getEmployeeNotifications(employeeId: string, limit: number = 10, since?: Date): Promise<any[]> {
    const notifications = await prisma.notification.findMany({
      where: {
        employeeId,
        ...(since ? { createdAt: { gte: since } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return notifications;
  }

  async getEmployeeNotificationsCursor(
    employeeId: string,
    cursor?: string,
    limit?: number
  ): Promise<CursorPaginatedResponse<any>> {
    const { cursorPayload, take } = getCursorPaginationParams(cursor, limit);

    const where: any = { employeeId };

    if (cursorPayload) {
      where.OR = [
        { createdAt: { lt: new Date(cursorPayload.createdAt) } },
        { createdAt: new Date(cursorPayload.createdAt), id: { lt: cursorPayload.id } },
      ];
    }

    const rows = await prisma.notification.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: take + 1,
    });

    const hasMore = rows.length > take;
    const data = hasMore ? rows.slice(0, take) : rows;
    const last = data[data.length - 1];
    const nextCursor = hasMore && last ? encodeCursor(last.createdAt, last.id) : null;

    return { data, nextCursor, hasMore };
  }

  async getUnreadCount(employeeId: string): Promise<number> {
    return prisma.notification.count({
      where: { employeeId, isRead: false },
    });
  }

  async getUnreadNotifications(employeeId: string): Promise<any[]> {
    const notifications = await prisma.notification.findMany({
      where: {
        employeeId,
        isRead: false,
      },
      orderBy: { createdAt: 'desc' },
    });

    return notifications;
  }

  async markAsRead(notificationId: string, employeeId: string): Promise<any> {
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification || notification.employeeId !== employeeId) {
      throw new NotFoundError('Không tìm thấy thông báo');
    }

    return prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });
  }

  async markAllAsRead(employeeId: string): Promise<any> {
    const result = await prisma.notification.updateMany({
      where: {
        employeeId,
        isRead: false,
      },
      data: { isRead: true },
    });

    return result;
  }

  async getUnreadCountByType(employeeId: string): Promise<Record<string, number>> {
    const counts = await prisma.notification.groupBy({
      by: ['type'],
      where: { employeeId, isRead: false },
      _count: { type: true },
    });

    const result: Record<string, number> = {};
    for (const item of counts) {
      result[item.type] = item._count.type;
    }
    return result;
  }

  async deleteNotification(notificationId: string, employeeId: string): Promise<void> {
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification || notification.employeeId !== employeeId) {
      throw new NotFoundError('Không tìm thấy thông báo');
    }

    await prisma.notification.delete({
      where: { id: notificationId },
    });
  }

  /* ─── Filter + Stats API (My Notifications Page) ────────────────────────── */

  /**
   * Build a Prisma `where` clause for notification filters.
   * Shared between getFilteredNotificationsForEmployee and getNotificationStatsForEmployee.
   */
  private buildNotificationFilterWhere(
    employeeId: string,
    filters: {
      types?: string[];
      isRead?: boolean;
      dateFrom?: Date;
      dateTo?: Date;
      search?: string;
    }
  ) {
    // Default date range: last 30 days when both bounds are absent
    const now = new Date();
    const defaultFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const gte = filters.dateFrom ?? defaultFrom;
    const lte = filters.dateTo ?? now;

    const where: any = {
      employeeId,
      createdAt: { gte, lte },
    };

    if (filters.types && filters.types.length > 0) {
      where.type = { in: filters.types };
    }

    if (filters.isRead !== undefined) {
      where.isRead = filters.isRead;
    }

    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { message: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    return where;
  }

  /**
   * Paginated filtered list of notifications for the My Notifications page.
   * Returns { items, total, page, totalPages }.
   */
  async getFilteredNotificationsForEmployee(
    employeeId: string,
    filters: {
      types?: string[];
      isRead?: boolean;
      dateFrom?: Date;
      dateTo?: Date;
      search?: string;
      page?: number;
      limit?: number;
      sort?: 'newest' | 'oldest';
    }
  ): Promise<{ items: any[]; total: number; page: number; totalPages: number }> {
    const page = Math.max(1, filters.page ?? 1);
    const limit = Math.min(100, Math.max(1, filters.limit ?? 20));
    const dir = filters.sort === 'oldest' ? 'asc' : 'desc';
    const skip = (page - 1) * limit;

    const where = this.buildNotificationFilterWhere(employeeId, filters);

    const [items, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: [{ createdAt: dir }, { id: dir }],
        skip,
        take: limit,
      }),
      prisma.notification.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return { items, total, page, totalPages };
  }

  /**
   * Aggregate stats for the My Notifications page stats card.
   * Returns { total, unread, today, byType } — byType strips zero counts.
   */
  async getNotificationStatsForEmployee(
    employeeId: string,
    filters: {
      types?: string[];
      dateFrom?: Date;
      dateTo?: Date;
    }
  ): Promise<{ total: number; unread: number; today: number; byType: Record<string, number> }> {
    const now = new Date();
    const defaultFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const gte = filters.dateFrom ?? defaultFrom;
    const lte = filters.dateTo ?? now;

    // Start-of-today in APP_TZ (shared helper — không tự tính offset ở đây).
    const startOfToday = getTodayInAppTz();

    const baseWhere: any = { employeeId, createdAt: { gte, lte } };
    if (filters.types && filters.types.length > 0) {
      baseWhere.type = { in: filters.types };
    }

    const [total, unread, today, groupByResult] = await Promise.all([
      prisma.notification.count({ where: baseWhere }),
      prisma.notification.count({ where: { ...baseWhere, isRead: false } }),
      prisma.notification.count({
        where: {
          employeeId,
          createdAt: { gte: startOfToday },
          ...(filters.types && filters.types.length > 0 ? { type: { in: filters.types } } : {}),
        },
      }),
      prisma.notification.groupBy({
        by: ['type'],
        where: baseWhere,
        _count: { type: true },
      }),
    ]);

    const byType: Record<string, number> = {};
    for (const item of groupByResult) {
      if (item._count.type > 0) {
        byType[item.type] = item._count.type;
      }
    }

    return { total, unread, today, byType };
  }

  async getLatestEvaluationNotification(employeeId: string): Promise<any | null> {
    const notification = await prisma.notification.findFirst({
      where: {
        employeeId,
        type: NotificationType.EVALUATION,
      },
      orderBy: { createdAt: 'desc' },
    });

    return notification;
  }

  async createTaskNotification(
    employeeId: string,
    taskId: string,
    taskTitle: string,
    assignerName: string
  ): Promise<any> {
    const title = 'Nhiệm vụ mới';
    const message = `${assignerName} đã giao cho bạn nhiệm vụ: "${taskTitle}"`;

    const notification = await prisma.notification.create({
      data: {
        employeeId,
        type: NotificationType.TASK,
        title,
        message,
        taskId,
        isRead: false,
      },
    });

    this.wsPush(employeeId, NotificationType.TASK, title, message);
    pushNotificationService
      .sendPushToEmployee(employeeId, title, message)
      .catch(() => {});

    return notification;
  }

  async createTaskNotifications(
    employeeIds: string[],
    taskId: string,
    taskTitle: string,
    assignerName: string
  ): Promise<void> {
    if (employeeIds.length === 0) return;

    const title = 'Nhiệm vụ mới';
    const message = `${assignerName} đã giao cho bạn nhiệm vụ: "${taskTitle}"`;

    const notifications = employeeIds.map((employeeId) => ({
      employeeId,
      type: NotificationType.TASK,
      title,
      message,
      taskId,
      isRead: false,
    }));

    await prisma.notification.createMany({
      data: notifications,
    });

    employeeIds.forEach(id => this.wsPush(id, NotificationType.TASK, title, message));
    await Promise.allSettled(
      employeeIds.map((employeeId) =>
        pushNotificationService.sendPushToEmployee(employeeId, title, message).catch(() => {})
      )
    );
  }

  async createLeaveRequestNotification(
    employeeIds: string[],
    employeeName: string,
    leaveTypeLabel: string,
    leaveRequestId?: string
  ): Promise<void> {
    if (employeeIds.length === 0) return;

    const title = 'Đơn nghỉ phép mới';
    const message = `${employeeName} đã gửi đơn nghỉ phép ${leaveTypeLabel}`;

    const notifications = employeeIds.map((employeeId) => ({
      employeeId,
      type: NotificationType.LEAVE_REQUEST,
      title,
      message,
      leaveRequestId,
      isRead: false,
    }));

    await prisma.notification.createMany({
      data: notifications,
    });

    employeeIds.forEach(id => this.wsPush(id, NotificationType.LEAVE_REQUEST, title, message));
    await Promise.allSettled(
      employeeIds.map((employeeId) =>
        pushNotificationService.sendPushToEmployee(employeeId, title, message).catch(() => {})
      )
    );
  }

  async createLeaveRequestResponseNotification(
    employeeId: string,
    leaveCode: string,
    status: 'APPROVED' | 'REJECTED'
  ): Promise<void> {
    const title = status === 'APPROVED' ? 'Đơn nghỉ phép được duyệt' : 'Đơn nghỉ phép bị từ chối';
    const message = status === 'APPROVED'
      ? `Đơn nghỉ phép ${leaveCode} của bạn đã được phê duyệt`
      : `Đơn nghỉ phép ${leaveCode} của bạn đã bị từ chối`;

    await prisma.notification.create({
      data: {
        employeeId,
        type: NotificationType.LEAVE_REQUEST_RESPONSE,
        title,
        message,
        isRead: false,
      },
    });

    this.wsPush(employeeId, NotificationType.LEAVE_REQUEST_RESPONSE, title, message);
    pushNotificationService
      .sendPushToEmployee(employeeId, title, message)
      .catch(() => {});
  }

  async createPayrollNotifications(
    employeeIds: string[],
    month: number,
    year: number,
    period: string
  ): Promise<void> {
    if (employeeIds.length === 0) return;

    const title = `Bảng lương tháng ${month}/${year}`;
    const message = `Bảng lương tháng ${month}/${year} của bạn đã sẵn sàng. Nhấn để xem chi tiết.`;

    const notifications = employeeIds.map((employeeId) => ({
      employeeId,
      type: NotificationType.PAYROLL,
      title,
      message,
      period,
      isRead: false,
    }));

    await prisma.notification.createMany({
      data: notifications,
    });

    employeeIds.forEach(id => this.wsPush(id, NotificationType.PAYROLL, title, message));
    await Promise.allSettled(
      employeeIds.map((employeeId) =>
        pushNotificationService.sendPushToEmployee(employeeId, title, message).catch(() => {})
      )
    );
  }

  async createAcceptanceHandoverNotification(
    employeeId: string,
    maNghiemThu: string,
    tenThietBi: string,
    nguoiBanGiao: string,
    acceptanceHandoverId: string
  ): Promise<void> {
    const title = 'Nghiệm thu bàn giao mới';
    const message = `${nguoiBanGiao} đã tạo nghiệm thu bàn giao ${maNghiemThu} cho thiết bị "${tenThietBi}". Vui lòng kiểm tra và xác nhận.`;

    await prisma.notification.create({
      data: {
        employeeId,
        type: NotificationType.ACCEPTANCE_HANDOVER,
        title,
        message,
        acceptanceHandoverId,
        isRead: false,
      },
    });

    this.wsPush(employeeId, NotificationType.ACCEPTANCE_HANDOVER, title, message);
    pushNotificationService
      .sendPushToEmployee(employeeId, title, message)
      .catch(() => {});
  }

  async createSupplyRequestNotification(
    employeeId: string,
    type: string,
    title: string,
    message: string,
    supplyRequestId?: string
  ): Promise<void> {
    await prisma.notification.create({
      data: {
        employeeId,
        type,
        title,
        message,
        supplyRequestId,
        isRead: false,
      },
    });

    this.wsPush(employeeId, type, title, message);
    pushNotificationService
      .sendPushToEmployee(employeeId, title, message)
      .catch(() => {});
  }

  async createSupplyRequestNotifications(
    employeeIds: string[],
    type: string,
    title: string,
    message: string,
    supplyRequestId?: string
  ): Promise<void> {
    if (employeeIds.length === 0) return;

    const notifications = employeeIds.map((employeeId) => ({
      employeeId,
      type,
      title,
      message,
      supplyRequestId,
      isRead: false,
    }));

    await prisma.notification.createMany({
      data: notifications,
    });

    employeeIds.forEach(id => this.wsPush(id, type, title, message));
    await Promise.allSettled(
      employeeIds.map((employeeId) =>
        pushNotificationService.sendPushToEmployee(employeeId, title, message).catch(() => {})
      )
    );
  }

  async getAdminEmployeeIds(excludeUserId?: string): Promise<string[]> {
    const adminUsers = await prisma.user.findMany({
      where: {
        role: 'ADMIN',
        ...(excludeUserId ? { id: { not: excludeUserId } } : {}),
      },
      select: {
        id: true,
        employees: {
          select: {
            id: true,
          },
        },
      },
    });
    return adminUsers
      .filter(u => u.employees)
      .map(u => u.employees!.id);
  }

  async createAdminTaskNotification(
    taskTitle: string,
    assignerName: string,
    taskId: string,
    excludeUserId?: string,
    recipientNames?: string
  ): Promise<void> {
    const adminEmployeeIds = await this.getAdminEmployeeIds(excludeUserId);
    if (adminEmployeeIds.length === 0) return;

    const title = 'Nhiệm vụ mới trong hệ thống';
    const message = recipientNames
      ? `${assignerName} đã giao cho ${recipientNames} nhiệm vụ: "${taskTitle}"`
      : `${assignerName} đã giao nhiệm vụ: "${taskTitle}"`;

    const notifications = adminEmployeeIds.map(employeeId => ({
      employeeId,
      type: NotificationType.TASK_ADMIN,
      title,
      message,
      taskId,
      isRead: false,
    }));
    await prisma.notification.createMany({ data: notifications });

    adminEmployeeIds.forEach(id => this.wsPush(id, NotificationType.TASK_ADMIN, title, message));
    await Promise.allSettled(
      adminEmployeeIds.map((employeeId) =>
        pushNotificationService.sendPushToEmployee(employeeId, title, message).catch(() => {})
      )
    );
  }

  async createAdminFeedbackNotification(
    employeeName: string,
    excludeUserId?: string
  ): Promise<void> {
    const adminEmployeeIds = await this.getAdminEmployeeIds(excludeUserId);
    if (adminEmployeeIds.length === 0) return;

    const title = 'Góp ý mới';
    const message = `${employeeName} đã gửi góp ý mới`;

    const notifications = adminEmployeeIds.map(employeeId => ({
      employeeId,
      type: NotificationType.PRIVATE_FEEDBACK,
      title,
      message,
      isRead: false,
    }));
    await prisma.notification.createMany({ data: notifications });

    adminEmployeeIds.forEach(id => this.wsPush(id, NotificationType.PRIVATE_FEEDBACK, title, message));
    await Promise.allSettled(
      adminEmployeeIds.map((employeeId) =>
        pushNotificationService.sendPushToEmployee(employeeId, title, message).catch(() => {})
      )
    );
  }

  async createAdminDailyReportNotification(
    employeeName: string,
    reportDate: string,
    excludeUserId?: string
  ): Promise<void> {
    const adminEmployeeIds = await this.getAdminEmployeeIds(excludeUserId);
    if (adminEmployeeIds.length === 0) return;

    const title = 'Báo cáo công việc mới';
    const message = `${employeeName} đã nộp báo cáo công việc ngày ${reportDate}`;

    const notifications = adminEmployeeIds.map(employeeId => ({
      employeeId,
      type: NotificationType.DAILY_WORK_REPORT,
      title,
      message,
      isRead: false,
    }));
    await prisma.notification.createMany({ data: notifications });

    adminEmployeeIds.forEach(id => this.wsPush(id, NotificationType.DAILY_WORK_REPORT, title, message));
    await Promise.allSettled(
      adminEmployeeIds.map((employeeId) =>
        pushNotificationService.sendPushToEmployee(employeeId, title, message).catch(() => {})
      )
    );
  }
}

export default new NotificationService();
