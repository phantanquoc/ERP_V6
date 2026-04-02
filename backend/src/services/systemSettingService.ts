/**
 * SystemSettingService — Cài đặt hệ thống toàn cục (key-value store)
 * Hỗ trợ key: "bannerOverride" (auto | default | tet | liberation | labor), "slogan"
 */
import prisma from '@config/database';
import logger from '@config/logger';
import { broadcast } from './websocket';

const BANNER_KEY = 'bannerOverride';
const SLOGAN_KEY = 'slogan';
const VALID_BANNER_VALUES = ['auto', 'default', 'tet', 'liberation', 'labor'] as const;
type BannerValue = (typeof VALID_BANNER_VALUES)[number];

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
}

export default new SystemSettingService();
