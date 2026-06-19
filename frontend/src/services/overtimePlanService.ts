import apiClient from './apiClient';

export enum OvertimePlanStatus {
  CHO_DUYET = 'CHO_DUYET',
  DA_DUYET = 'DA_DUYET',
  TU_CHOI = 'TU_CHOI',
  HOAN_THANH = 'HOAN_THANH',
  HUY = 'HUY',
}

export interface OvertimePlanItemInput {
  ngayTangCa: string; // "YYYY-MM-DD"
  gioBatDau: string; // "HH:mm"
  gioKetThuc: string; // "HH:mm"
  workShiftId?: string;
  nguoiThamGia: string[]; // employee IDs
  ghiChuItem?: string;
}

export interface OvertimePlanItem {
  id: string;
  overtimePlanId: string;
  ngayTangCa: string;
  gioBatDau: string;
  gioKetThuc: string;
  workShiftId?: string | null;
  workShiftName?: string | null;
  nguoiThamGiaIds: string[];
  nguoiThamGia: Array<{
    id: string;
    firstName: string;
    lastName: string;
    employeeCode: string;
    department: string;
  }>;
  ghiChuItem?: string | null;
  trangThaiTiepNhan?: Record<string, string>;
  gioThucTe?: Record<string, { gioVao: string; gioRa: string }>;
  createdAt: string;
  updatedAt: string;
}

export interface OvertimePlan {
  id: string;
  ngayTao: string;
  nguoiTaoId: string;
  nguoiTao: {
    id: string;
    firstName: string;
    lastName: string;
    employeeCode: string;
    department: string;
  };
  items: OvertimePlanItem[];
  noiDung: string;
  ghiChu?: string;
  files?: string[];
  mucDoUuTien: string;
  trangThai: OvertimePlanStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOvertimePlanData {
  items: OvertimePlanItemInput[];
  noiDung: string;
  ghiChu?: string;
  mucDoUuTien?: string;
  files?: File[];
}

const extractData = (response: any): any => {
  if (response?.data?.data) return response.data.data;
  if (response?.data) return response.data;
  return response;
};

const extractPaginated = (response: any): any => {
  const plans = Array.isArray(response?.data) ? response.data : (Array.isArray(response?.data?.data) ? response.data.data : []);
  const pagination = response?.pagination || response?.data?.pagination || {};
  return {
    data: plans,
    total: pagination.total || 0,
    page: pagination.page || 1,
    totalPages: pagination.totalPages || 1,
  };
};

const buildFormData = (data: CreateOvertimePlanData): FormData => {
  const fd = new FormData();
  // items array serialized as JSON string (Decision 7)
  fd.append('items', JSON.stringify(data.items));
  fd.append('noiDung', data.noiDung);
  if (data.ghiChu) fd.append('ghiChu', data.ghiChu);
  if (data.mucDoUuTien) fd.append('mucDoUuTien', data.mucDoUuTien);
  if (data.files) data.files.forEach(file => fd.append('files', file));
  return fd;
};

export const overtimePlanService = {
  async create(data: CreateOvertimePlanData): Promise<OvertimePlan> {
    const response = await apiClient.post('/overtime-plans', buildFormData(data));
    return extractData(response);
  },
  async update(id: string, data: CreateOvertimePlanData): Promise<OvertimePlan> {
    const response = await apiClient.put(`/overtime-plans/${id}`, buildFormData(data));
    return extractData(response);
  },
  async getAll(params?: any): Promise<any> {
    const response = await apiClient.get('/overtime-plans', { params });
    return extractPaginated(response);
  },
  async getMyPlans(params?: any): Promise<any> {
    const response = await apiClient.get('/overtime-plans/my-plans', { params });
    return extractPaginated(response);
  },
  async getById(id: string): Promise<OvertimePlan> {
    const response = await apiClient.get(`/overtime-plans/${id}`);
    return extractData(response);
  },
  async delete(id: string): Promise<void> {
    await apiClient.delete(`/overtime-plans/${id}`);
  },
  async approvePlan(id: string, trangThai: 'DA_DUYET' | 'TU_CHOI', lyDoTuChoi?: string): Promise<OvertimePlan> {
    const response = await apiClient.patch(`/overtime-plans/${id}/approve`, { trangThai, lyDoTuChoi });
    return extractData(response);
  },
  async acceptPlan(id: string, itemId: string, trangThai: string): Promise<OvertimePlan> {
    const response = await apiClient.patch(`/overtime-plans/${id}/accept`, { itemId, trangThai });
    return extractData(response);
  },
  async updateActualTime(id: string, itemId: string, actualTimes: Record<string, { gioVao: string; gioRa: string }>): Promise<OvertimePlan> {
    const response = await apiClient.patch(`/overtime-plans/${id}/actual-time`, { itemId, actualTimes });
    return extractData(response);
  },
};

export default overtimePlanService;
