import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const API_URL = `${API_BASE}/work-plans`;

const getAuthHeader = () => {
  const token = localStorage.getItem('accessToken');
  return {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
};

export enum WorkPlanPriority {
  KHAN_CAP = 'KHAN_CAP',
  CAO = 'CAO',
  TRUNG_BINH = 'TRUNG_BINH',
  THAP = 'THAP',
}

export enum WorkPlanStatus {
  CHUA_BAT_DAU = 'CHUA_BAT_DAU',
  DANG_THUC_HIEN = 'DANG_THUC_HIEN',
  HOAN_THANH = 'HOAN_THANH',
  HUY = 'HUY',
}

export interface CreateWorkPlanData {
  tieuDe: string;
  noiDung: string;
  nguoiThucHien: string[];
  ngayBatDau: string;
  ngayKetThuc: string;
  mucDoUuTien: WorkPlanPriority;
  ghiChu?: string;
  files?: File[];
}

export interface WorkPlan {
  id: string;
  tieuDe: string;
  noiDung: string;
  nguoiTaoId: string;
  nguoiThucHienIds: string[];
  ngayBatDau: string;
  ngayKetThuc: string;
  mucDoUuTien: WorkPlanPriority;
  trangThai: WorkPlanStatus;
  ghiChu?: string;
  files: string[];
  createdAt: string;
  updatedAt: string;
  nguoiTao?: any;
  nguoiThucHien?: any[];
}

export const workPlanService = {
  async createWorkPlan(data: CreateWorkPlanData): Promise<WorkPlan> {
    const formData = new FormData();

    data.nguoiThucHien.forEach(id => {
      formData.append('nguoiThucHien[]', id);
    });

    formData.append('tieuDe', data.tieuDe);
    formData.append('noiDung', data.noiDung);
    formData.append('ngayBatDau', data.ngayBatDau);
    formData.append('ngayKetThuc', data.ngayKetThuc);
    formData.append('mucDoUuTien', data.mucDoUuTien);

    if (data.ghiChu) {
      formData.append('ghiChu', data.ghiChu);
    }

    if (data.files && data.files.length > 0) {
      data.files.forEach(file => {
        formData.append('files', file);
      });
    }

    const response = await axios.post(API_URL, formData, {
      ...getAuthHeader(),
      headers: {
        ...getAuthHeader().headers,
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data.data;
  },

  async getAllWorkPlans(
    page: number = 1,
    limit: number = 10,
    search?: string,
  ): Promise<{ data: WorkPlan[]; pagination: any }> {
    const response = await axios.get(API_URL, {
      ...getAuthHeader(),
      params: { page, limit, ...(search ? { search } : {}) },
    });

    return {
      data: response.data.data,
      pagination: response.data.pagination,
    };
  },

  async getWorkPlanById(id: string): Promise<WorkPlan> {
    const response = await axios.get(`${API_URL}/${id}`, getAuthHeader());
    return response.data.data;
  },

  async updateWorkPlan(id: string, data: Partial<CreateWorkPlanData>): Promise<WorkPlan> {
    const formData = new FormData();

    if (data.nguoiThucHien) {
      data.nguoiThucHien.forEach(id => {
        formData.append('nguoiThucHien[]', id);
      });
    }

    if (data.tieuDe) formData.append('tieuDe', data.tieuDe);
    if (data.noiDung) formData.append('noiDung', data.noiDung);
    if (data.ngayBatDau) formData.append('ngayBatDau', data.ngayBatDau);
    if (data.ngayKetThuc) formData.append('ngayKetThuc', data.ngayKetThuc);
    if (data.mucDoUuTien) formData.append('mucDoUuTien', data.mucDoUuTien);
    if (data.ghiChu !== undefined) formData.append('ghiChu', data.ghiChu || '');

    if (data.files && data.files.length > 0) {
      data.files.forEach(file => {
        formData.append('files', file);
      });
    }

    const response = await axios.put(`${API_URL}/${id}`, formData, {
      ...getAuthHeader(),
      headers: {
        ...getAuthHeader().headers,
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data.data;
  },

  async deleteWorkPlan(id: string): Promise<void> {
    await axios.delete(`${API_URL}/${id}`, getAuthHeader());
  },
};

export default workPlanService;

