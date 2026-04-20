import prisma from '@config/database';
import { NotificationType } from '@types';
import pushNotificationService from './pushNotificationService';

export class NotificationService {
  async createNotification(data: {
    userId: string;
    type: string;
    title: string;
    message: string;
    evaluationId?: string;
    period?: string;
    taskId?: string;
  }): Promise<any> {
    // Get employee by userId
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

    pushNotificationService
      .sendPushToEmployee(employeeId, title, message)
      .catch(() => {});

    return notification;
  }

  async getEmployeeNotifications(employeeId: string, limit: number = 10): Promise<any[]> {
    const notifications = await prisma.notification.findMany({
      where: { employeeId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return notifications;
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

  async markAsRead(notificationId: string): Promise<any> {
    const notification = await prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });

    return notification;
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

  async deleteNotification(notificationId: string): Promise<void> {
    await prisma.notification.delete({
      where: { id: notificationId },
    });
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
      include: { employees: true },
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

    await Promise.allSettled(
      adminEmployeeIds.map((employeeId) =>
        pushNotificationService.sendPushToEmployee(employeeId, title, message).catch(() => {})
      )
    );
  }
}

export default new NotificationService();
