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

// ---- My Notifications Page types ----------------------------------------

export interface MyNotificationsParams {
  types?: string[];
  isRead?: boolean;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  page?: number;
  limit?: number;
  sort?: 'newest' | 'oldest';
}

export interface MyNotificationsResponse {
  items: AppNotification[];
  total: number;
  page: number;
  totalPages: number;
}

export interface MyNotificationsStatsParams {
  types?: string[];
  dateFrom?: string;
  dateTo?: string;
}

export interface MyNotificationsStats {
  total: number;
  unread: number;
  today: number;
  byType: Record<string, number>;
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

  // ---- My Notifications Page methods ------------------------------------

  async getMyNotifications(params: MyNotificationsParams): Promise<MyNotificationsResponse> {
    const searchParams = new URLSearchParams();
    if (params.types && params.types.length > 0) {
      params.types.forEach((t) => searchParams.append('types', t));
    }
    if (params.isRead !== undefined) searchParams.set('isRead', String(params.isRead));
    if (params.dateFrom) searchParams.set('dateFrom', params.dateFrom);
    if (params.dateTo) searchParams.set('dateTo', params.dateTo);
    if (params.search) searchParams.set('search', params.search);
    if (params.page !== undefined) searchParams.set('page', String(params.page));
    if (params.limit !== undefined) searchParams.set('limit', String(params.limit));
    if (params.sort) searchParams.set('sort', params.sort);

    const response = await apiClient.get(`/notifications?${searchParams.toString()}`);
    return response.data as MyNotificationsResponse;
  }

  async getMyNotificationsStats(params: MyNotificationsStatsParams): Promise<MyNotificationsStats> {
    const searchParams = new URLSearchParams();
    if (params.types && params.types.length > 0) {
      params.types.forEach((t) => searchParams.append('types', t));
    }
    if (params.dateFrom) searchParams.set('dateFrom', params.dateFrom);
    if (params.dateTo) searchParams.set('dateTo', params.dateTo);

    const response = await apiClient.get(`/notifications/stats?${searchParams.toString()}`);
    return response.data as MyNotificationsStats;
  }
}

export default new NotificationService();

