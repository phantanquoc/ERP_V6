import apiClient from './apiClient';

export enum OvertimePlanStatus {
  CHO_DUYET = 'CHO_DUYET',
  DA_DUYET = 'DA_DUYET',
  TU_CHOI = 'TU_CHOI',
  HOAN_THANH = 'HOAN_THANH',
  HUY = 'HUY',
}

export interface OvertimePlan {
  id: string;
  ngayTao: string;
  nguoiTao: {
    id: string;
    firstName: string;
    lastName: string;
    employeeCode: string;
    department: string;
  };
  nguoiThamGia: Array<{
    id: string;
    firstName: string;
    lastName: string;
    employeeCode: string;
    department: string;
  }>;
  noiDung: string;
  ngayTangCa: string;
  gioBatDau: string;
  gioKetThuc: string;
  ghiChu?: string;
  files?: string[];
  mucDoUuTien: string;
  trangThai: OvertimePlanStatus;
  trangThaiTiepNhan?: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOvertimePlanData {
  nguoiThamGia: string[];
  noiDung: string;
  ngayTangCa: string;
  gioBatDau: string;
  gioKetThuc: string;
  ghiChu?: string;
  mucDoUuTien: string;
  files?: File[];
}

export const overtimePlanService = {
  async create(data: CreateOvertimePlanData): Promise<OvertimePlan> {
    const formData = new FormData();
    data.nguoiThamGia.forEach(id => {
      formData.append('nguoiThamGia[]', id);
    });
    formData.append('noiDung', data.noiDung);
    formData.append('ngayTangCa', data.ngayTangCa);
    formData.append('gioBatDau', data.gioBatDau);
    formData.append('gioKetThuc', data.gioKetThuc);
    formData.append('mucDoUuTien', data.mucDoUuTien);
    if (data.ghiChu) formData.append('ghiChu', data.ghiChu);
    if (data.files && data.files.length > 0) {
      data.files.forEach(file => {
        formData.append('files', file);
      });
    }
    const response = await apiClient.post('/overtime-plans', formData);
    return response.data;
  },

  async getAll(params?: {
    page?: number;
    limit?: number;
    search?: string;
    mucDoUuTien?: string;
    trangThai?: OvertimePlanStatus;
    department?: string;
  }): Promise<{ data: OvertimePlan[]; total: number; page: number; totalPages: number }> {
    const response = await apiClient.get<OvertimePlan[]>('/overtime-plans', { params });
    return {
      data: response.data ?? [],
      total: response.pagination?.total ?? 0,
      page: response.pagination?.page ?? 1,
      totalPages: response.pagination?.totalPages ?? 1,
    };
  },

  async getMyPlans(params?: {
    page?: number;
    limit?: number;
  }): Promise<{ data: OvertimePlan[]; total: number; page: number; totalPages: number }> {
    const response = await apiClient.get<OvertimePlan[]>('/overtime-plans/my-plans', { params });
    return {
      data: response.data ?? [],
      total: response.pagination?.total ?? 0,
      page: response.pagination?.page ?? 1,
      totalPages: response.pagination?.totalPages ?? 1,
    };
  },

  async getById(id: string): Promise<OvertimePlan> {
    const response = await apiClient.get(`/overtime-plans/${id}`);
    return response.data;
  },

  async update(id: string, data: Partial<CreateOvertimePlanData>): Promise<OvertimePlan> {
    const formData = new FormData();
    if (data.nguoiThamGia) {
      data.nguoiThamGia.forEach(id => {
        formData.append('nguoiThamGia[]', id);
      });
    }
    if (data.noiDung) formData.append('noiDung', data.noiDung);
    if (data.ngayTangCa) formData.append('ngayTangCa', data.ngayTangCa);
    if (data.gioBatDau) formData.append('gioBatDau', data.gioBatDau);
    if (data.gioKetThuc) formData.append('gioKetThuc', data.gioKetThuc);
    if (data.mucDoUuTien) formData.append('mucDoUuTien', data.mucDoUuTien);
    if (data.ghiChu !== undefined) formData.append('ghiChu', data.ghiChu || '');
    if (data.files && data.files.length > 0) {
      data.files.forEach(file => {
        formData.append('files', file);
      });
    }
    const response = await apiClient.put(`/overtime-plans/${id}`, formData);
    return response.data;
  },

  async delete(id: string): Promise<void> {
    await apiClient.delete(`/overtime-plans/${id}`);
  },

  async acceptPlan(id: string, trangThai: 'DA_TIEP_NHAN' | 'TU_CHOI'): Promise<OvertimePlan> {
    const response = await apiClient.patch<OvertimePlan>(`/overtime-plans/${id}/accept`, { trangThai });
    return response.data!;
  },

  async approvePlan(id: string, trangThai: 'DA_DUYET' | 'TU_CHOI', lyDoTuChoi?: string): Promise<OvertimePlan> {
    const response = await apiClient.patch<OvertimePlan>(`/overtime-plans/${id}/approve`, { trangThai, lyDoTuChoi });
    return response.data!;
  },
};
