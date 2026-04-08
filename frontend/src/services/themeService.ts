import apiClient from './apiClient';
import type { ApiResponse } from './apiClient';

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
  startDate: string | null;
  endDate: string | null;
  description: string | null;
  createdAt: string;
  updatedAt: string;
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

class ThemeService {
  /** Lấy tất cả themes active */
  async getAllThemes(): Promise<ThemeData[]> {
    const response = await apiClient.get<ThemeData[]>('/themes');
    return (response as ApiResponse<ThemeData[]>).data ?? [];
  }

  /** Lấy theme đang áp dụng hôm nay (auto-detect event) */
  async getActiveTheme(): Promise<ThemeData | null> {
    const response = await apiClient.get<ThemeData>('/themes/active');
    return (response as ApiResponse<ThemeData>).data ?? null;
  }

  /** Lấy theme theo ID */
  async getThemeById(id: string): Promise<ThemeData | null> {
    const response = await apiClient.get<ThemeData>(`/themes/${id}`);
    return (response as ApiResponse<ThemeData>).data ?? null;
  }

  /** Tạo theme mới (Admin only) */
  async createTheme(data: CreateThemeInput): Promise<ThemeData> {
    const response = await apiClient.post<ThemeData>('/themes', data);
    return (response as ApiResponse<ThemeData>).data!;
  }

  /** Cập nhật theme (Admin only) */
  async updateTheme(id: string, data: Partial<CreateThemeInput>): Promise<ThemeData> {
    const response = await apiClient.put<ThemeData>(`/themes/${id}`, data);
    return (response as ApiResponse<ThemeData>).data!;
  }

  /** Xoá theme (Admin only) */
  async deleteTheme(id: string): Promise<void> {
    await apiClient.delete(`/themes/${id}`);
  }
}

export default new ThemeService();
