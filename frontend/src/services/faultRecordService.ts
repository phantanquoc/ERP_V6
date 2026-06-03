import apiClient from './apiClient';

export interface FaultRecord {
  id: string;
  maLoi: string;
  tenLoi: string;
  moTa: string;
  maHeThong?: string;
  mucDo: string;
  trangThai: string;
  nguoiPhatHien: string;
  ngayPhatHien: string;
  fileDinhKem?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFaultRecordRequest {
  tenLoi: string;
  moTa: string;
  maHeThong?: string;
  mucDo: string;
  trangThai?: string;
  nguoiPhatHien: string;
  ngayPhatHien?: string;
}

export interface UpdateFaultRecordRequest extends Partial<CreateFaultRecordRequest> {}

export interface FaultRecordFilters {
  page?: number;
  limit?: number;
  search?: string;
  trangThai?: string;
  mucDo?: string;
}

class FaultRecordService {
  async getAll(filters: FaultRecordFilters = {}) {
    try {
      const params: Record<string, unknown> = {
        page: filters.page ?? 1,
        limit: filters.limit ?? 10,
      };
      if (filters.search) params.search = filters.search;
      if (filters.trangThai) params.trangThai = filters.trangThai;
      if (filters.mucDo) params.mucDo = filters.mucDo;

      return await apiClient.get('/fault-records', { params });
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Lỗi khi lấy danh sách lỗi');
    }
  }

  async getById(id: string) {
    try {
      return await apiClient.get(`/fault-records/${id}`);
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Không tìm thấy bản ghi lỗi');
    }
  }

  async create(data: CreateFaultRecordRequest, file?: File) {
    try {
      const formData = new FormData();
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined) formData.append(key, String(value));
      });
      if (file) formData.append('file', file);

      return await apiClient.post('/fault-records', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Lỗi khi tạo bản ghi lỗi');
    }
  }

  async update(id: string, data: UpdateFaultRecordRequest, file?: File) {
    try {
      const formData = new FormData();
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined) formData.append(key, String(value));
      });
      if (file) formData.append('file', file);

      return await apiClient.put(`/fault-records/${id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Lỗi khi cập nhật bản ghi lỗi');
    }
  }

  async delete(id: string) {
    try {
      return await apiClient.delete(`/fault-records/${id}`);
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Lỗi khi xóa bản ghi lỗi');
    }
  }

  async exportExcel(filters: Omit<FaultRecordFilters, 'page' | 'limit'> = {}) {
    try {
      const params: Record<string, unknown> = {};
      if (filters.search) params.search = filters.search;
      if (filters.trangThai) params.trangThai = filters.trangThai;
      if (filters.mucDo) params.mucDo = filters.mucDo;

      const response = await apiClient.get('/fault-records/export/excel', {
        params,
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response as unknown as BlobPart]));
      const link = document.createElement('a');
      link.href = url;
      link.download = `danh-sach-loi-${Date.now()}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Lỗi khi xuất Excel');
    }
  }
}

export default new FaultRecordService();
