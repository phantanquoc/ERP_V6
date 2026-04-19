import prisma from '@config/database';
import {
  DEFAULT_NOTIFICATION_ROUTING_RULES,
  DEFAULT_NOTIFICATION_SETTINGS,
  NotificationRoutingEvent,
  NotificationRoutingRule,
  NotificationSettings,
} from '@types';

class SystemSettingsService {
  private mergeNotificationSettings(saved: any): NotificationSettings {
    if (!saved) return DEFAULT_NOTIFICATION_SETTINGS;
    return {
      channels: { ...DEFAULT_NOTIFICATION_SETTINGS.channels, ...(saved.channels || {}) },
      ui: { ...DEFAULT_NOTIFICATION_SETTINGS.ui, ...(saved.ui || {}) },
      categories: { ...DEFAULT_NOTIFICATION_SETTINGS.categories, ...(saved.categories || {}) },
      routingRules: this.mergeRoutingRules(saved.routingRules),
    };
  }

  private mergeRoutingRules(saved: any): any {
    const merged: any = { ...DEFAULT_NOTIFICATION_ROUTING_RULES };
    if (!saved) return merged;
    for (const key of Object.keys(DEFAULT_NOTIFICATION_ROUTING_RULES) as NotificationRoutingEvent[]) {
      if (saved[key]) {
        merged[key] = { ...merged[key], ...saved[key] };
      }
    }
    return merged;
  }

  async getSettings() {
    let settings = await prisma.systemSettings.findFirst();
    if (!settings) {
      settings = await prisma.systemSettings.create({
        data: {
          activeTheme: 'DEFAULT',
          slogan: 'Nếu có ngôi nhà thứ 2 đó chính là nơi làm việc của mình, nơi có những người đồng nghiệp tuyệt vời, sẻ chia và tri kỷ.',
          notificationSettings: DEFAULT_NOTIFICATION_SETTINGS as any,
        },
      });
    }
    return {
      ...settings,
      notificationSettings: this.mergeNotificationSettings(settings.notificationSettings),
    };
  }

  async updateSettings(
    data: { activeTheme?: string; slogan?: string; notificationSettings?: Partial<NotificationSettings> },
    updatedBy: string
  ) {
    let settings = await prisma.systemSettings.findFirst();
    const updateData: any = { updatedBy };
    if (data.activeTheme !== undefined) updateData.activeTheme = data.activeTheme;
    if (data.slogan !== undefined) updateData.slogan = data.slogan;
    if (data.notificationSettings !== undefined) {
      // Merge with existing
      const existing = settings?.notificationSettings as any;
      updateData.notificationSettings = {
        ...(existing || DEFAULT_NOTIFICATION_SETTINGS),
        ...data.notificationSettings,
      };
    }

    if (!settings) {
      settings = await prisma.systemSettings.create({
        data: {
          activeTheme: data.activeTheme || 'DEFAULT',
          slogan: data.slogan || '',
          notificationSettings: data.notificationSettings ? (data.notificationSettings as any) : DEFAULT_NOTIFICATION_SETTINGS as any,
          updatedBy,
        },
      });
      return { ...settings, notificationSettings: this.mergeNotificationSettings(settings.notificationSettings) };
    }

    const updated = await prisma.systemSettings.update({
      where: { id: settings.id },
      data: updateData,
    });
    return { ...updated, notificationSettings: this.mergeNotificationSettings(updated.notificationSettings) };
  }

  async updateNotificationRoutingRule(
    eventKey: NotificationRoutingEvent,
    rule: Partial<NotificationRoutingRule>,
    updatedBy: string
  ) {
    const settings = await this.getSettings();
    const currentRules = (settings.notificationSettings as NotificationSettings).routingRules;
    const updatedRules = {
      ...currentRules,
      [eventKey]: { ...(currentRules[eventKey] || {}), ...rule, eventKey },
    };
    return this.updateSettings(
      { notificationSettings: { ...(settings.notificationSettings as NotificationSettings), routingRules: updatedRules } },
      updatedBy
    );
  }

  async getNotificationSettings(): Promise<NotificationSettings> {
    const settings = await this.getSettings();
    return settings.notificationSettings as NotificationSettings;
  }
}

export default new SystemSettingsService();

