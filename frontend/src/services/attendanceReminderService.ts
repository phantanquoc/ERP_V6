import apiClient from './apiClient';

export interface AttendanceReminderSettings {
  checkinReminder: string;   // HH:mm
  checkoutReminder: string;  // HH:mm
  autoAbsent: string;        // HH:mm
}

class AttendanceReminderService {
  async getSettings(): Promise<AttendanceReminderSettings> {
    const response = await apiClient.get('/system-settings/attendance-reminder');
    return response.data;
  }

  async updateSettings(data: Partial<AttendanceReminderSettings>): Promise<AttendanceReminderSettings> {
    const response = await apiClient.put('/system-settings/attendance-reminder', data);
    return response.data;
  }
}

export default new AttendanceReminderService();
