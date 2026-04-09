/**
 * SystemSettingService — Cài đặt hệ thống toàn cục (key-value store)
 * Hỗ trợ key: "bannerOverride" (auto | default | tet | liberation | labor), "slogan",
 * "attendance_reminder_checkin", "attendance_reminder_checkout", "attendance_reminder_auto_absent"
 */
import prisma from '@config/database';
import logger from '@config/logger';
import { broadcast } from './websocket';

const BANNER_KEY = 'bannerOverride';
const SLOGAN_KEY = 'slogan';
const VALID_BANNER_VALUES = ['auto', 'default', 'tet', 'liberation', 'labor'] as const;
type BannerValue = (typeof VALID_BANNER_VALUES)[number];

// Attendance reminder setting keys
const REMINDER_CHECKIN_KEY = 'attendance_reminder_checkin';
const REMINDER_CHECKOUT_KEY = 'attendance_reminder_checkout';
const REMINDER_AUTO_ABSENT_KEY = 'attendance_reminder_auto_absent';

// Defaults: nhắc nhở chấm công vào lúc 8:30, chấm công ra lúc 17:30, tự động vắng lúc 22:00
const DEFAULT_REMINDER_CHECKIN = '08:30';
const DEFAULT_REMINDER_CHECKOUT = '17:30';
const DEFAULT_REMINDER_AUTO_ABSENT = '22:00';

export interface AttendanceReminderSettings {
  checkinReminder: string;   // HH:mm
  checkoutReminder: string;  // HH:mm
  autoAbsent: string;        // HH:mm
}

export class SystemSettingService {
  /**
   * Lấy giá trị banner hiện tại.
   * Mặc định trả về 'auto' nếu chưa có trong DB.
   */
  async getBanner(): Promise<BannerValue> {
    const row = await prisma.systemSetting.findUnique({
      where: { key: BANNER_KEY },
    });
    const val = row?.value ?? 'auto';
    return (VALID_BANNER_VALUES.includes(val as BannerValue) ? val : 'auto') as BannerValue;
  }

  /**
   * Cập nhật banner và broadcast realtime đến tất cả client qua WebSocket.
   */
  async setBanner(value: string, updatedBy?: string): Promise<BannerValue> {
    if (!VALID_BANNER_VALUES.includes(value as BannerValue)) {
      throw new Error(`Invalid banner value: ${value}. Must be one of: ${VALID_BANNER_VALUES.join(', ')}`);
    }

    await prisma.systemSetting.upsert({
      where: { key: BANNER_KEY },
      update: { value, updatedBy: updatedBy ?? null },
      create: { key: BANNER_KEY, value, updatedBy: updatedBy ?? null },
    });

    // Broadcast realtime đến TẤT CẢ client đang kết nối WebSocket
    broadcast({ type: 'SYSTEM_BANNER_CHANGED', value });

    logger.info(`SystemSetting: bannerOverride set to "${value}" by ${updatedBy ?? 'unknown'}`);
    return value as BannerValue;
  }

  /**
   * Lấy slogan hiện tại.
   * Trả về chuỗi rỗng nếu chưa cài đặt.
   */
  async getSlogan(): Promise<string> {
    const row = await prisma.systemSetting.findUnique({ where: { key: SLOGAN_KEY } });
    return row?.value ?? '';
  }

  /**
   * Cập nhật slogan và broadcast realtime đến tất cả client qua WebSocket.
   * Cho phép giá trị rỗng (xoá slogan).
   */
  async setSlogan(value: string, updatedBy?: string): Promise<string> {
    await prisma.systemSetting.upsert({
      where: { key: SLOGAN_KEY },
      update: { value, updatedBy: updatedBy ?? null },
      create: { key: SLOGAN_KEY, value, updatedBy: updatedBy ?? null },
    });

    // Broadcast realtime đến TẤT CẢ client đang kết nối WebSocket
    broadcast({ type: 'SYSTEM_SLOGAN_CHANGED', value });

    logger.info(`SystemSetting: slogan set to "${value}" by ${updatedBy ?? 'unknown'}`);
    return value;
  }

  // ─── Attendance Reminder Settings ───────────────────────────────────────────

  // In-memory cache để scheduler không cần query DB mỗi phút
  private reminderCache: AttendanceReminderSettings | null = null;

  /**
   * Lấy cài đặt nhắc nhở chấm công.
   * Trả về defaults nếu chưa cài đặt trong DB.
   */
  async getAttendanceReminderSettings(): Promise<AttendanceReminderSettings> {
    if (this.reminderCache) return this.reminderCache;

    const rows = await prisma.systemSetting.findMany({
      where: { key: { in: [REMINDER_CHECKIN_KEY, REMINDER_CHECKOUT_KEY, REMINDER_AUTO_ABSENT_KEY] } },
    });

    const map = new Map(rows.map(r => [r.key, r.value]));

    this.reminderCache = {
      checkinReminder: map.get(REMINDER_CHECKIN_KEY) ?? DEFAULT_REMINDER_CHECKIN,
      checkoutReminder: map.get(REMINDER_CHECKOUT_KEY) ?? DEFAULT_REMINDER_CHECKOUT,
      autoAbsent: map.get(REMINDER_AUTO_ABSENT_KEY) ?? DEFAULT_REMINDER_AUTO_ABSENT,
    };

    return this.reminderCache;
  }

  /**
   * Cập nhật cài đặt nhắc nhở chấm công. Admin only.
   * Invalidate cache sau khi cập nhật.
   */
  async setAttendanceReminderSettings(
    settings: Partial<AttendanceReminderSettings>,
    updatedBy?: string,
  ): Promise<AttendanceReminderSettings> {
    const updates: { key: string; value: string }[] = [];

    if (settings.checkinReminder) {
      updates.push({ key: REMINDER_CHECKIN_KEY, value: settings.checkinReminder });
    }
    if (settings.checkoutReminder) {
      updates.push({ key: REMINDER_CHECKOUT_KEY, value: settings.checkoutReminder });
    }
    if (settings.autoAbsent) {
      updates.push({ key: REMINDER_AUTO_ABSENT_KEY, value: settings.autoAbsent });
    }

    for (const { key, value } of updates) {
      await prisma.systemSetting.upsert({
        where: { key },
        update: { value, updatedBy: updatedBy ?? null },
        create: { key, value, updatedBy: updatedBy ?? null },
      });
    }

    // Invalidate cache
    this.reminderCache = null;

    const result = await this.getAttendanceReminderSettings();
    logger.info(`SystemSetting: attendance reminder updated to ${JSON.stringify(result)} by ${updatedBy ?? 'unknown'}`);
    return result;
  }

  /**
   * Invalidate cache — gọi khi cần force reload từ DB
   */
  invalidateReminderCache(): void {
    this.reminderCache = null;
  }
}

export default new SystemSettingService();
