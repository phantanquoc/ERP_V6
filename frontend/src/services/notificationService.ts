import apiClient from './apiClient';

export interface Notification {
  id: string;
  employeeId: string;
  type: string;
  title: string;
  message: string;
  period?: string;
  evaluationId?: string;
  taskId?: string;
  acceptanceHandoverId?: string;
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
}

class NotificationService {
  async getEmployeeNotifications(limit: number = 10): Promise<Notification[]> {
    try {
      const response = await apiClient.get('/notifications', {
        params: { limit },
      });
      return response.data || [];
    } catch (error) {
      console.error('Error fetching notifications:', error);
      throw error;
    }
  }

  async getUnreadNotifications(): Promise<Notification[]> {
    try {
      const response = await apiClient.get('/notifications/unread');
      return response.data || [];
    } catch (error) {
      console.error('Error fetching unread notifications:', error);
      throw error;
    }
  }

  async getLatestEvaluationNotification(): Promise<Notification | null> {
    try {
      const response = await apiClient.get('/notifications/evaluation/latest');
      return response.data || null;
    } catch (error) {
      console.error('Error fetching latest evaluation notification:', error);
      throw error;
    }
  }

  async markAsRead(notificationId: string): Promise<Notification> {
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

