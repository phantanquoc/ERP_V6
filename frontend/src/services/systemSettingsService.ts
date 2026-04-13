import { API_BASE_URL } from '../config/api';

export interface SystemSettings {
  id: string;
  activeTheme: string;
  slogan: string;
  updatedAt: string;
  updatedBy?: string;
}

class SystemSettingsService {
  private getHeaders(): Record<string, string> {
    const token = localStorage.getItem('accessToken');
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  async getSettings(): Promise<SystemSettings> {
    const response = await fetch(`${API_BASE_URL}/system-settings`, {
      headers: this.getHeaders(),
    });
    if (!response.ok) throw new Error('Không thể tải cài đặt hệ thống');
    const data = await response.json();
    return data.data;
  }

  async updateSettings(settings: { activeTheme?: string; slogan?: string }): Promise<SystemSettings> {
    const response = await fetch(`${API_BASE_URL}/system-settings`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(settings),
    });
    if (!response.ok) throw new Error('Không thể cập nhật cài đặt hệ thống');
    const data = await response.json();
    return data.data;
  }
}

const systemSettingsService = new SystemSettingsService();
export default systemSettingsService;
