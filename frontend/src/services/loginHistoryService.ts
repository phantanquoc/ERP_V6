import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

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
  private getAuthToken(): string {
    return localStorage.getItem('accessToken') || '';
  }

  private getAuthHeaders() {
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.getAuthToken()}`,
    };
  }

  /**
   * Get login history for the current user
   */
  async getMyHistory(limit: number = 10, offset: number = 0): Promise<LoginHistory[]> {
    try {
      const response = await axios.get<LoginHistoryResponse>(
        `${API_BASE_URL}/login-history/my-history`,
        {
          params: { limit, offset },
          headers: this.getAuthHeaders(),
        }
      );

      if (response.data.success) {
        return response.data.data;
      }

      throw new Error(response.data.message || 'Failed to fetch login history');
    } catch (error: any) {
      console.error('Error fetching login history:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to fetch login history');
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
      const response = await axios.get<LoginHistoryResponse>(
        `${API_BASE_URL}/login-history`,
        {
          params: options,
          headers: this.getAuthHeaders(),
        }
      );

      if (response.data.success) {
        return {
          data: response.data.data,
          total: response.data.total,
        };
      }

      throw new Error(response.data.message || 'Failed to fetch login history');
    } catch (error: any) {
      console.error('Error fetching all login history:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to fetch login history');
    }
  }
}

export default new LoginHistoryService();

