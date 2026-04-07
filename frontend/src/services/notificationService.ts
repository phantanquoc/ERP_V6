import apiClient, { ApiResponse } from './apiClient';

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
  leaveRequestId?: string;
  payrollId?: string;
  orderId?: string;
  supplyRequestId?: string;
  warehouseReceiptId?: string;
  overtimePlanId?: string;
  meetingId?: string;
  supplyAdjustmentId?: string;
  privateFeedbackId?: string;
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
}

class NotificationService {
  /**
   * Fetches employee notifications from GET /api/notifications.
   * The backend returns { success: true, data: [...] }, so we unwrap the array.
   */
  async getEmployeeNotifications(limit: number = 50): Promise<Notification[]> {
    try {
      const response = await apiClient.get<Notification[]>('/notifications', {
        params: { limit },
      });
      // Backend wraps in { success: true, data: [...] } — unwrap to get the array
      if (response && typeof response === 'object' && 'success' in response) {
        return (response as ApiResponse<Notification[]>).data ?? [];
      }
      return Array.isArray(response) ? response : [];
    } catch (error) {
      console.error('Error fetching notifications:', error);
      return [];
    }
  }

  async getUnreadNotifications(): Promise<Notification[]> {
    try {
      const response = await apiClient.get<Notification[]>('/notifications/unread');
      if (response && typeof response === 'object' && 'success' in response) {
        return (response as ApiResponse<Notification[]>).data ?? [];
      }
      return Array.isArray(response) ? response : [];
    } catch (error) {
      console.error('Error fetching unread notifications:', error);
      return [];
    }
  }

  async getLatestEvaluationNotification(): Promise<Notification | null> {
    try {
      const response = await apiClient.get<Notification>('/notifications/evaluation/latest');
      if (response && typeof response === 'object' && 'success' in response) {
        return (response as ApiResponse<Notification | null>).data ?? null;
      }
      return (response as Notification | null) ?? null;
    } catch (error) {
      console.error('Error fetching latest evaluation notification:', error);
      return null;
    }
  }

  async markAsRead(notificationId: string): Promise<void> {
    try {
      await apiClient.patch(`/notifications/${notificationId}/read`, {});
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }

  async markAllAsRead(): Promise<void> {
    try {
      await apiClient.patch('/notifications/read-all', {});
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  }

  async deleteNotification(notificationId: string): Promise<void> {
    try {
      await apiClient.delete(`/notifications/${notificationId}`);
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  }
}

export default new NotificationService();
