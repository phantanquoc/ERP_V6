import prisma from '@config/database';

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

    const notification = await prisma.notification.create({
      data: {
        employeeId,
        type: 'EVALUATION',
        title: `Đánh giá tháng ${monthName}`,
        message: `Bạn có một bản đánh giá mới cho tháng ${monthName}. Vui lòng hoàn thành đánh giá của bạn.`,
        period,
        evaluationId,
        isRead: false,
      },
    });

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

  async deleteNotification(notificationId: string): Promise<void> {
    await prisma.notification.delete({
      where: { id: notificationId },
    });
  }

  async getLatestEvaluationNotification(employeeId: string): Promise<any | null> {
    const notification = await prisma.notification.findFirst({
      where: {
        employeeId,
        type: 'EVALUATION',
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
    const notification = await prisma.notification.create({
      data: {
        employeeId,
        type: 'TASK',
        title: 'Nhiệm vụ mới',
        message: `${assignerName} đã giao cho bạn nhiệm vụ: "${taskTitle}"`,
        taskId,
        isRead: false,
      },
    });

    return notification;
  }

  async createTaskNotifications(
    employeeIds: string[],
    taskId: string,
    taskTitle: string,
    assignerName: string
  ): Promise<any[]> {
    const notifications = await Promise.all(
      employeeIds.map(employeeId =>
        this.createTaskNotification(employeeId, taskId, taskTitle, assignerName)
      )
    );

    return notifications;
  }
}

export default new NotificationService();

