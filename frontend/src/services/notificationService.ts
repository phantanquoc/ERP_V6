import apiClient from './apiClient';

export interface AppNotification {
  id: string;
  employeeId: string;
  type: string;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
  period?: string;
  evaluationId?: string;
  taskId?: string;
  acceptanceHandoverId?: string;
  leaveRequestId?: string;
  supplyRequestId?: string;
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
}

class NotificationService {
  async getEmployeeNotifications(limit: number = 10, since?: string): Promise<AppNotification[]> {
    try {
      const params: Record<string, string | number> = { limit };
      if (since) params.since = since;
      const response = await apiClient.get('/notifications', { params });
      return response.data || [];
    } catch (error) {
      console.error('Error fetching notifications:', error);
      throw error;
    }
  }

  async getUnreadCount(): Promise<number> {
    try {
      const response = await apiClient.get('/notifications/unread/count');
      return response.data?.count ?? 0;
    } catch (error) {
      console.error('Error fetching unread count:', error);
      return 0;
    }
  }

  async getUnreadNotifications(): Promise<AppNotification[]> {
    try {
      const response = await apiClient.get('/notifications/unread');
      return response.data || [];
    } catch (error) {
      console.error('Error fetching unread notifications:', error);
      throw error;
    }
  }

  async getLatestEvaluationNotification(): Promise<AppNotification | null> {
    try {
      const response = await apiClient.get('/notifications/evaluation/latest');
      return response.data || null;
    } catch (error) {
      console.error('Error fetching latest evaluation notification:', error);
      throw error;
    }
  }

  async getUnreadCountByType(): Promise<Record<string, number>> {
    try {
      const response = await apiClient.get('/notifications/unread/count-by-type');
      return response.data || {};
    } catch (error) {
      console.error('Error fetching unread count by type:', error);
      return {};
    }
  }

  async markAsRead(notificationId: string): Promise<AppNotification> {
    try {
      const response = await apiClient.patch(`/notifications/${notificationId}/read`, {});
      return response.data;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  async markAllAsRead(): Promise<any> {
    try {
      const response = await apiClient.patch('/notifications/read-all', {});
      return response.data;
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  }

  async deleteNotification(notificationId: string): Promise<void> {
    try {
      await apiClient.delete(`/notifications/${notificationId}`);
    } catch (error) {
      console.error('Error deleting notification:', error);
      throw error;
    }
  }
}

export default new NotificationService();

