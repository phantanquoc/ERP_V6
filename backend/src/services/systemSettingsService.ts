import prisma from '@config/database';

class SystemSettingsService {
  async getSettings() {
    let settings = await prisma.systemSettings.findFirst();
    if (!settings) {
      settings = await prisma.systemSettings.create({
        data: {
          activeTheme: 'DEFAULT',
          slogan: 'Nếu có ngôi nhà thứ 2 đó chính là nơi làm việc của mình, nơi có những người đồng nghiệp tuyệt vời, sẻ chia và tri kỷ.',
        },
      });
    }
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
      return settings;
    }

    return await prisma.systemSettings.update({
      where: { id: settings.id },
      data: {
        ...(data.activeTheme !== undefined && { activeTheme: data.activeTheme }),
        ...(data.slogan !== undefined && { slogan: data.slogan }),
        updatedBy,
      },
    });
  }
}

export default new SystemSettingsService();
