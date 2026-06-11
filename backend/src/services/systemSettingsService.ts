import prisma from '@config/database';
import { cacheGet, cacheSet, cacheDel, CACHE_KEYS } from '@utils/cache';

class SystemSettingsService {
  async getSettings() {
    const cached = await cacheGet<any>(CACHE_KEYS.SYSTEM_SETTINGS);
    if (cached) return cached;

    let settings = await prisma.systemSettings.findFirst();
    if (!settings) {
      settings = await prisma.systemSettings.create({
        data: {
          activeTheme: 'DEFAULT',
          slogan: 'Nếu có ngôi nhà thứ 2 đó chính là nơi làm việc của mình, nơi có những người đồng nghiệp tuyệt vời, sẻ chia và tri kỷ.',
        },
      });
    }

    await cacheSet(CACHE_KEYS.SYSTEM_SETTINGS, settings);
    return settings;
  }

  async updateSettings(data: { activeTheme?: string; slogan?: string }, updatedBy: string) {
    let settings = await prisma.systemSettings.findFirst();
    if (!settings) {
      settings = await prisma.systemSettings.create({
        data: {
          activeTheme: data.activeTheme || 'DEFAULT',
          slogan: data.slogan || '',
          updatedBy,
        },
      });
      await cacheDel(CACHE_KEYS.SYSTEM_SETTINGS);
      return settings;
    }

    const updated = await prisma.systemSettings.update({
      where: { id: settings.id },
      data: {
        ...(data.activeTheme !== undefined && { activeTheme: data.activeTheme }),
        ...(data.slogan !== undefined && { slogan: data.slogan }),
        updatedBy,
      },
    });
    await cacheDel(CACHE_KEYS.SYSTEM_SETTINGS);
    return updated;
  }
}

export default new SystemSettingsService();
