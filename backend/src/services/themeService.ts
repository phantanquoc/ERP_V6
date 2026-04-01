import prisma from '@config/database';
import logger from '@config/logger';
import { NotFoundError, ConflictError } from '@utils/errors';

export interface ThemeData {
  id: string;
  name: string;
  displayName: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  bgColor: string;
  sidebarColor: string;
  sidebarText: string;
  logo: string | null;
  isActive: boolean;
  isDefault: boolean;
  startDate: Date | null;
  endDate: Date | null;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateThemeInput {
  name: string;
  displayName: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  bgColor?: string;
  sidebarColor?: string;
  sidebarText?: string;
  logo?: string;
  isActive?: boolean;
  startDate?: string;
  endDate?: string;
  description?: string;
}

export class ThemeService {
  /**
   * Lấy tất cả themes (chỉ active).
   */
  async getAllThemes(): Promise<ThemeData[]> {
    return prisma.theme.findMany({
      where: { isActive: true },
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    });
  }

  /**
   * Lấy theme đang active dựa trên ngày hiện tại.
   * - Nếu hôm nay nằm trong startDate–endDate của event theme → trả về event theme
   * - Ngược lại trả về theme isDefault = true
   */
  async getActiveTheme(): Promise<ThemeData> {
    const now = new Date();

    // Tìm event theme khớp ngày hôm nay
    const eventTheme = await prisma.theme.findFirst({
      where: {
        isActive: true,
        isDefault: false,
        startDate: { lte: now },
        endDate: { gte: now },
      },
      orderBy: { startDate: 'desc' },
    });

    if (eventTheme) {
      logger.info(`Active event theme: ${eventTheme.name}`);
      return eventTheme;
    }

    // Fallback về default theme
    const defaultTheme = await prisma.theme.findFirst({
      where: { isDefault: true, isActive: true },
    });

    if (!defaultTheme) {
      throw new NotFoundError('No default theme found. Please seed themes.');
    }

    return defaultTheme;
  }

  /**
   * Lấy theme theo ID.
   */
  async getThemeById(id: string): Promise<ThemeData> {
    const theme = await prisma.theme.findUnique({ where: { id } });
    if (!theme) throw new NotFoundError('Theme không tồn tại');
    return theme;
  }

  /**
   * Tạo theme mới.
   */
  async createTheme(data: CreateThemeInput): Promise<ThemeData> {
    const existing = await prisma.theme.findUnique({ where: { name: data.name } });
    if (existing) throw new ConflictError(`Theme "${data.name}" đã tồn tại`);

    return prisma.theme.create({
      data: {
        name: data.name,
        displayName: data.displayName,
        primaryColor: data.primaryColor,
        secondaryColor: data.secondaryColor,
        accentColor: data.accentColor,
        bgColor: data.bgColor ?? '#f3f4f6',
        sidebarColor: data.sidebarColor ?? '#1e3a5f',
        sidebarText: data.sidebarText ?? '#ffffff',
        logo: data.logo,
        isActive: data.isActive ?? true,
        isDefault: false,
        startDate: data.startDate ? new Date(data.startDate) : null,
        endDate: data.endDate ? new Date(data.endDate) : null,
        description: data.description,
      },
    });
  }

  /**
   * Cập nhật theme.
   */
  async updateTheme(id: string, data: Partial<CreateThemeInput>): Promise<ThemeData> {
    await this.getThemeById(id);
    return prisma.theme.update({
      where: { id },
      data: {
        ...data,
        startDate: data.startDate !== undefined ? (data.startDate ? new Date(data.startDate) : null) : undefined,
        endDate: data.endDate !== undefined ? (data.endDate ? new Date(data.endDate) : null) : undefined,
      },
    });
  }

  /**
   * Xoá theme (không cho xoá default theme).
   */
  async deleteTheme(id: string): Promise<void> {
    const theme = await this.getThemeById(id);
    if (theme.isDefault) throw new ConflictError('Không thể xoá theme mặc định');
    await prisma.theme.delete({ where: { id } });
  }
}

export default new ThemeService();
