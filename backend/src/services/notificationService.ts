import prisma from '@config/database';
import { NotificationType } from '@types';
import { pushNotification, WsNotificationPayload } from '@services/websocket';

interface NotificationInput {
  employeeId: string;
  type: string;
  title: string;
  message: string;
  period?: string;
  evaluationId?: string;
  taskId?: string;
  acceptanceHandoverId?: string;
  leaveRequestId?: string;
  supplyRequestId?: string;
}

export class NotificationService {
  private buildPayload(notification: any): WsNotificationPayload {
    const data: Record<string, unknown> = {};

    if (notification.period) data.period = notification.period;
    if (notification.evaluationId) data.evaluationId = notification.evaluationId;
    if (notification.taskId) data.taskId = notification.taskId;
    if (notification.acceptanceHandoverId) data.acceptanceHandoverId = notification.acceptanceHandoverId;
    if (notification.leaveRequestId) data.leaveRequestId = notification.leaveRequestId;
    if (notification.supplyRequestId) data.supplyRequestId = notification.supplyRequestId;

    return {
      id: notification.id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      isRead: notification.isRead,
      data: Object.keys(data).length > 0 ? data : undefined,
      createdAt: notification.createdAt.toISOString(),
    };
  }

  private async pushToEmployee(employeeId: string, notification: any): Promise<void> {
    pushNotification(employeeId, this.buildPayload(notification));

    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: { userId: true },
    });

    if (employee?.userId) {
      pushNotification(`u:${employee.userId}`, this.buildPayload(notification));
    }
  }

  private async createEmployeeNotification(data: NotificationInput): Promise<any> {
    const notification = await prisma.notification.create({
      data: {
        employeeId: data.employeeId,
        type: data.type,
        title: data.title,
        message: data.message,
        period: data.period,
        evaluationId: data.evaluationId,
        taskId: data.taskId,
        acceptanceHandoverId: data.acceptanceHandoverId,
        leaveRequestId: data.leaveRequestId,
        supplyRequestId: data.supplyRequestId,
        isRead: false,
      },
    });

    await this.pushToEmployee(data.employeeId, notification);
    return notification;
  }

  private async createEmployeeNotifications(entries: NotificationInput[]): Promise<void> {
    for (const entry of entries) {
      await this.createEmployeeNotification(entry);
    }
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
    // Get employee by userId
    const user = await prisma.user.findUnique({
      where: { id: data.userId },
      include: { employees: true },
    });

    if (!user?.employees) {
      throw new Error('Employee not found for user');
    }

    const notification = await this.createEmployeeNotification({
      employeeId: user.employees.id,
      type: data.type,
      title: data.title,
      message: data.message,
      evaluationId: data.evaluationId,
      period: data.period,
      taskId: data.taskId,
    });

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

    const notification = await this.createEmployeeNotification({
      employeeId,
      type: NotificationType.EVALUATION,
      title: `Đánh giá tháng ${monthName}`,
      message: 'Bạn có 1 đánh giá mới',
      period,
      evaluationId,
    });

    return notification;
  }

  async getEmployeeNotifications(employeeId: string, limit: number = 10): Promise<any[]> {
    return prisma.notification.findMany({
      where: { employeeId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
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
    const notification = await this.createEmployeeNotification({
      employeeId,
      type: NotificationType.TASK,
      title: 'Nhiệm vụ mới',
      message: `${assignerName} đã giao cho bạn nhiệm vụ: "${taskTitle}"`,
      taskId,
    });

    return notification;
  }

  async createTaskNotifications(
    employeeIds: string[],
    taskId: string,
    taskTitle: string,
    assignerName: string
  ): Promise<void> {
    if (employeeIds.length === 0) return;

    const notifications = employeeIds.map((employeeId) => ({
      employeeId,
      type: NotificationType.TASK,
      title: 'Nhiệm vụ mới',
      message: `${assignerName} đã giao cho bạn nhiệm vụ: "${taskTitle}"`,
      taskId,
    }));

    await this.createEmployeeNotifications(notifications);
  }

  async createLeaveRequestNotification(
    employeeIds: string[],
    employeeName: string,
    leaveTypeLabel: string,
    leaveRequestId?: string
  ): Promise<void> {
    if (employeeIds.length === 0) return;

    const notifications = employeeIds.map((employeeId) => ({
      employeeId,
      type: NotificationType.LEAVE_REQUEST,
      title: 'Đơn nghỉ phép mới',
      message: `${employeeName} đã gửi đơn nghỉ phép ${leaveTypeLabel}`,
      leaveRequestId,
    }));

    await this.createEmployeeNotifications(notifications);
  }

  async createLeaveRequestResponseNotification(
    employeeId: string,
    leaveCode: string,
    status: 'APPROVED' | 'REJECTED'
  ): Promise<void> {
    const message = status === 'APPROVED'
      ? `Đơn nghỉ phép ${leaveCode} của bạn đã được phê duyệt`
      : `Đơn nghỉ phép ${leaveCode} của bạn đã bị từ chối`;

    await this.createEmployeeNotification({
      employeeId,
      type: NotificationType.LEAVE_REQUEST_RESPONSE,
      title: status === 'APPROVED' ? 'Đơn nghỉ phép được duyệt' : 'Đơn nghỉ phép bị từ chối',
      message,
    });
  }
  async createPayrollNotifications(
    employeeIds: string[],
    month: number,
    year: number,
    period: string
  ): Promise<void> {
    if (employeeIds.length === 0) return;

    const notifications = employeeIds.map((employeeId) => ({
      employeeId,
      type: NotificationType.PAYROLL,
      title: `Bảng lương tháng ${month}/${year}`,
      message: `Bảng lương tháng ${month}/${year} của bạn đã sẵn sàng. Nhấn để xem chi tiết.`,
      period,
    }));

    await this.createEmployeeNotifications(notifications);
  }

  async createAcceptanceHandoverNotification(
    employeeId: string,
    maNghiemThu: string,
    tenThietBi: string,
    nguoiBanGiao: string,
    acceptanceHandoverId: string
  ): Promise<void> {
    await this.createEmployeeNotification({
      employeeId,
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
    await this.createEmployeeNotification({
      employeeId,
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
    if (employeeIds.length === 0) return;

    const notifications = employeeIds.map((employeeId) => ({
      employeeId,
      type,
      title,
      message,
      supplyRequestId,
    }));

    await this.createEmployeeNotifications(notifications);
  }
}

export default new NotificationService();
