import apiClient from './apiClient';

export interface LoginHistory {
  id: string;
  ipAddress?: string;
  userAgent?: string;
  device?: string;
  browser?: string;
  location?: string;
  status: 'success' | 'failed';
  loginAt: string;
}

interface LoginHistoryResponse {
  success: boolean;
  data: LoginHistory[];
  total: number;
  message?: string;
}

class LoginHistoryService {
  /**
   * Get login history for the current user
   */
  async getMyHistory(limit: number = 10, offset: number = 0): Promise<LoginHistory[]> {
    try {
      const response = await apiClient.get<LoginHistory[]>(
        '/login-history/my-history',
        { params: { limit, offset } }
      );

      if (response.success) {
        return response.data;
      }

      throw new Error(response.message || 'Failed to fetch login history');
    } catch (error: any) {
      console.error('Error fetching login history:', error);
      throw new Error(error.message || 'Failed to fetch login history');
    }
  }

  /**
   * Get all login history (admin only)
   */
  async getAllHistory(options?: {
    limit?: number;
    offset?: number;
    userId?: string;
    status?: 'success' | 'failed';
  }): Promise<{ data: LoginHistory[]; total: number }> {
    try {
      const response = await apiClient.get<LoginHistory[]>(
        '/login-history',
        { params: options }
      );

      if (response.success) {
        return {
          data: response.data,
          total: (response as any).total,
        };
      }

      throw new Error(response.message || 'Failed to fetch login history');
    } catch (error: any) {
      console.error('Error fetching all login history:', error);
      throw new Error(error.message || 'Failed to fetch login history');
    }
  }
}

export default new LoginHistoryService();

