import apiClient from './apiClient';

export interface SparePart {
  id: string;
  maLinhKien: string;
  tenLinhKien: string;
  loai: string;
  donVi: string;
  soLuongTon: number;
  giaNhap?: number;
  nhaCungCap?: string;
  trangThai: string;
  ngayMua?: string;
  fileDinhKem?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SparePartStats {
  total: number;
  hetHang: number;
  dangSuDung: number;
  chuaSuDung: number;
}

export interface CreateSparePartRequest {
  tenLinhKien: string;
  loai: string;
  donVi: string;
  soLuongTon?: number;
  giaNhap?: number;
  nhaCungCap?: string;
  trangThai?: string;
  ngayMua?: string;
}

export interface SparePartFilters {
  page?: number;
  limit?: number;
  search?: string;
  trangThai?: string;
  loai?: string;
}

class SparePartService {
  async getAll(filters: SparePartFilters = {}) {
    try {
      const params: Record<string, unknown> = { page: filters.page ?? 1, limit: filters.limit ?? 10 };
      if (filters.search) params.search = filters.search;
      if (filters.trangThai) params.trangThai = filters.trangThai;
      if (filters.loai) params.loai = filters.loai;
      return await apiClient.get('/spare-parts', { params });
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Lỗi khi lấy danh sách linh kiện');
    }
  }

  async getStats() {
    try {
      return await apiClient.get('/spare-parts/stats');
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Lỗi khi lấy thống kê linh kiện');
    }
  }

  async getById(id: string) {
    try {
      return await apiClient.get(`/spare-parts/${id}`);
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Không tìm thấy linh kiện');
    }
  }

  async create(data: CreateSparePartRequest, file?: File) {
    try {
      const formData = new FormData();
      Object.entries(data).forEach(([k, v]) => { if (v !== undefined) formData.append(k, String(v)); });
      if (file) formData.append('file', file);
      return await apiClient.post('/spare-parts', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Lỗi khi tạo linh kiện');
    }
  }

  async update(id: string, data: Partial<CreateSparePartRequest>, file?: File) {
    try {
      const formData = new FormData();
      Object.entries(data).forEach(([k, v]) => { if (v !== undefined) formData.append(k, String(v)); });
      if (file) formData.append('file', file);
      return await apiClient.put(`/spare-parts/${id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Lỗi khi cập nhật linh kiện');
    }
  }

  async delete(id: string) {
    try {
      return await apiClient.delete(`/spare-parts/${id}`);
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Lỗi khi xóa linh kiện');
    }
  }
}

export default new SparePartService();
