import apiClient, { ApiResponse } from './apiClient';
import { API_BASE_URL } from '../config/api';
import type { MachineSystem, MachineSystemDetail } from './machineSystemService';

export interface RepairRequestItem {
  id: string;
  repairRequestId: number;
  machineSystemId?: string | null;
  machineSystemDetailId?: string | null;
  machineId?: string | null;
  tenHeThong: string;
  tinhTrangThietBi: string;
  loaiLoi: string;
  noiDungLoi: string;
  createdAt?: string;
  updatedAt?: string;
  machineSystem?: MachineSystem | null;
  machineSystemDetail?: MachineSystemDetail | null;
  machine?: { id: string; maMay: string; tenMay: string; trangThai: string } | null;
}

export interface AcceptanceHandoverSummary {
  id: string;
  maNghiemThu: string;
  ngayNghiemThu: string;
  tenHeThongThietBi?: string | null;
  tinhTrangTruocSuaChua?: string | null;
  tinhTrangSauSuaChua?: string | null;
  nguoiBanGiao?: string | null;
  nguoiNhan?: string | null;
}

export interface RepairRequest {
  id: number;
  ngayThang: string;
  maYeuCau: string;
  tenHeThong?: string | null;
  tinhTrangThietBi?: string | null;
  loaiLoi?: string | null;
  mucDoUuTien: string;
  noiDungLoi?: string | null;
  ghiChu?: string | null;
  trangThai: string;
  fileDinhKem?: string | null;
  createdAt: string;
  updatedAt: string;
  items?: RepairRequestItem[];
  acceptanceHandovers?: AcceptanceHandoverSummary[];
}

export interface RepairRequestItemInput {
  machineSystemId?: string;
  machineSystemDetailId?: string;
  tenHeThong: string;
  tinhTrangThietBi: string;
  loaiLoi: string;
  noiDungLoi: string;
}

export interface CreateRepairRequestRequest {
  ngayThang: string;
  maYeuCau: string;
  tenHeThong?: string;
  tinhTrangThietBi?: string;
  loaiLoi?: string;
  mucDoUuTien: string;
  noiDungLoi?: string;
  ghiChu?: string;
  trangThai?: string;
  items?: RepairRequestItemInput[];
}

export type UpdateRepairRequestRequest = Partial<Omit<CreateRepairRequestRequest, 'maYeuCau'>>;

export interface RepairRequestFilters {
  page?: number;
  limit?: number;
  search?: string;
  trangThai?: string;
}

const appendFormFields = (formData: FormData, data: Record<string, unknown>) => {
  Object.entries(data).forEach(([key, value]) => {
    if (value === undefined) return;
    if (Array.isArray(value)) {
      formData.append(key, JSON.stringify(value));
      return;
    }
    formData.append(key, value === null ? '' : String(value));
  });
};

class RepairRequestService {
  async getAll(filters: RepairRequestFilters = {}): Promise<ApiResponse<RepairRequest[]>> {
    return apiClient.get<RepairRequest[]>('/repair-requests', {
      params: {
        page: filters.page ?? 1,
        limit: filters.limit ?? 10,
        search: filters.search,
        trangThai: filters.trangThai,
      },
    });
  }

  async getById(id: number | string): Promise<ApiResponse<RepairRequest>> {
    return apiClient.get<RepairRequest>(`/repair-requests/${id}`);
  }

  async create(data: CreateRepairRequestRequest, file?: File): Promise<ApiResponse<RepairRequest>> {
    const formData = new FormData();
    appendFormFields(formData, data as Record<string, unknown>);
    if (file) formData.append('file', file);
    return apiClient.post<RepairRequest>('/repair-requests', formData);
  }

  async update(id: number | string, data: UpdateRepairRequestRequest, file?: File): Promise<ApiResponse<RepairRequest>> {
    const formData = new FormData();
    appendFormFields(formData, data as Record<string, unknown>);
    if (file) formData.append('file', file);
    return apiClient.put<RepairRequest>(`/repair-requests/${id}`, formData);
  }

  async delete(id: number | string): Promise<ApiResponse<void>> {
    return apiClient.delete<void>(`/repair-requests/${id}`);
  }

  async generateCode(): Promise<string> {
    const response = await apiClient.get<{ code: string }>('/repair-requests/generate-code');
    return response.data?.code ?? '';
  }

  async exportExcel(filters: Pick<RepairRequestFilters, 'search'> = {}): Promise<void> {
    const token = localStorage.getItem('accessToken');
    const params = new URLSearchParams();
    if (filters.search) params.append('search', filters.search);
    const url = `${API_BASE_URL}/repair-requests/export/excel${params.toString() ? `?${params.toString()}` : ''}`;
    const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) throw new Error('Lỗi khi xuất Excel yêu cầu sửa chữa');
    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `danh-sach-yeu-cau-sua-chua-${Date.now()}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  }
}

export default new RepairRequestService();
