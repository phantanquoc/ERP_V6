import { API_BASE_URL } from '../config/api';

export interface NotificationRoutingTarget {
  id: string;
  type: 'role' | 'department' | 'subDepartment';
  value: string;
  label: string;
}

export interface NotificationRoutingRule {
  eventKey: string;
  enabled: boolean;
  recipients: NotificationRoutingTarget[];
}

export interface NotificationSettings {
  channels: {
    inAppEnabled: boolean;
    webPushEnabled: boolean;
  };
  ui: {
    unreadPollingIntervalSeconds: number;
    recentLimit: number;
    historyWindowDays: number;
    showAdminFlowOverview: boolean;
  };
  categories: Record<string, boolean>;
  routingRules: Record<string, NotificationRoutingRule>;
}

export interface SystemSettings {
  id: string;
  activeTheme: string;
  slogan: string;
  notificationSettings?: NotificationSettings;
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

  async updateSettings(settings: {
    activeTheme?: string;
    slogan?: string;
    notificationSettings?: Partial<NotificationSettings>;
  }): Promise<SystemSettings> {
    const response = await fetch(`${API_BASE_URL}/system-settings`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(settings),
    });
    if (!response.ok) throw new Error('Không thể cập nhật cài đặt hệ thống');
    const data = await response.json();
    return data.data;
  }

  async updateRoutingRule(eventKey: string, rule: Partial<NotificationRoutingRule>): Promise<SystemSettings> {
    const response = await fetch(`${API_BASE_URL}/system-settings/notifications/routing/${encodeURIComponent(eventKey)}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify({ rule }),
    });
    if (!response.ok) throw new Error('Không thể cập nhật quy tắc định tuyến');
    const data = await response.json();
    return data.data;
  }
}

const systemSettingsService = new SystemSettingsService();
export default systemSettingsService;

