import apiClient from './apiClient';

export interface Machine {
  id: string;
  maMay: string;
  tenMay: string;
  moTa?: string;
  trangThai: 'HOAT_DONG' | 'BẢO_TRÌ' | 'NGỪNG_HOẠT_ĐỘNG';
  ghiChu?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMachineRequest {
  tenMay: string;
  moTa?: string;
  trangThai?: 'HOAT_DONG' | 'BẢO_TRÌ' | 'NGỪNG_HOẠT_ĐỘNG';
  ghiChu?: string;
}

export interface UpdateMachineRequest {
  tenMay?: string;
  moTa?: string;
  trangThai?: 'HOAT_DONG' | 'BẢO_TRÌ' | 'NGỪNG_HOẠT_ĐỘNG';
  ghiChu?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

class MachineService {
  async getAllMachines(page: number = 1, limit: number = 100): Promise<PaginatedResponse<Machine>> {
    try {
      const response = await apiClient.get<PaginatedResponse<Machine>>('/machines', { params: { page, limit } });
      return response as unknown as PaginatedResponse<Machine>;
    } catch (error: any) {
      throw new Error(error.message || 'Lỗi tải danh sách máy');
    }
  }

  async getMachineById(id: string): Promise<Machine> {
    try {
      const response = await apiClient.get<Machine>(`/machines/${id}`);
      return response.data as Machine;
    } catch (error: any) {
      throw new Error(error.message || 'Lỗi tải thông tin máy');
    }
  }

  async generateMachineCode(): Promise<string> {
    try {
      const response = await apiClient.get<any>('/machines/generate-code');
      return response.data;
    } catch (error: any) {
      throw new Error(error.message || 'Lỗi tạo mã máy');
    }
  }

  async createMachine(data: CreateMachineRequest): Promise<Machine> {
    try {
      const response = await apiClient.post<Machine>('/machines', data);
      return response.data as Machine;
    } catch (error: any) {
      throw new Error(error.message || 'Lỗi tạo máy mới');
    }
  }

  async updateMachine(id: string, data: UpdateMachineRequest): Promise<Machine> {
    try {
      const response = await apiClient.patch<Machine>(`/machines/${id}`, data);
      return response.data as Machine;
    } catch (error: any) {
      throw new Error(error.message || 'Lỗi cập nhật máy');
    }
  }

  async deleteMachine(id: string): Promise<void> {
    try {
      await apiClient.delete(`/machines/${id}`);
    } catch (error: any) {
      throw new Error(error.message || 'Lỗi xóa máy');
    }
  }

  async exportToExcel(filters?: { search?: string }): Promise<void> {
    const token = localStorage.getItem('accessToken');
    const params = new URLSearchParams();
    if (filters?.search) params.append('search', filters.search);
    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    const url = `${API_BASE_URL}/machines/export/excel${params.toString() ? `?${params.toString()}` : ''}`;
    const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) throw new Error('Failed to export to Excel');
    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `danh-sach-may-moc-${Date.now()}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  }
}

export default new MachineService();

