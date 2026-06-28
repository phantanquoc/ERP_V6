 import apiClient from './apiClient';

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

export interface WorkPlanUser {
  id: string;
  firstName: string;
  lastName: string;
  employeeCode: string;
  department?: string;
}

export interface WorkPlanEmployee {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  employeeCode: string;
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

export interface UpdateWorkPlanData {
  tieuDe?: string;
  noiDung?: string;
  nguoiThucHien?: string[];
  ngayBatDau?: string;
  ngayKetThuc?: string;
  mucDoUuTien?: WorkPlanPriority;
  trangThai?: WorkPlanStatus;
  ghiChu?: string;
  keepFiles?: string[];
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
  nguoiTao?: WorkPlanUser | null;
  nguoiThucHien?: WorkPlanEmployee[];
}

export interface WorkPlanListResponse {
  data: WorkPlan[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
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

     const response = await apiClient.post('/work-plans', formData);

     return response.data;
  },

  async getAllWorkPlans(
    page: number = 1,
    limit: number = 10,
    search?: string,
  ): Promise<WorkPlanListResponse> {
     const response = await apiClient.get<WorkPlan[]>('/work-plans', {
       params: { page, limit, ...(search ? { search } : {}) },
     });

    return {
       data: response.data ?? [],
       pagination: response.pagination ?? { total: 0, page, limit, totalPages: 1 },
    };
  },

  async getMyWorkPlans(
    page: number = 1,
    limit: number = 10,
    search?: string,
  ): Promise<WorkPlanListResponse> {
     const response = await apiClient.get<WorkPlan[]>('/work-plans/my-work-plans', {
       params: { page, limit, ...(search ? { search } : {}) },
     });

    return {
       data: response.data ?? [],
       pagination: response.pagination ?? { total: 0, page, limit, totalPages: 1 },
    };
  },

  async getWorkPlanById(id: string): Promise<WorkPlan> {
     const response = await apiClient.get(`/work-plans/${id}`);
     return response.data;
  },

  async updateWorkPlan(id: string, data: UpdateWorkPlanData, files?: File[]): Promise<WorkPlan> {
    const formData = new FormData();

    if (data.nguoiThucHien) {
      data.nguoiThucHien.forEach(empId => {
        formData.append('nguoiThucHien[]', empId);
      });
    }

    if (data.tieuDe !== undefined) formData.append('tieuDe', data.tieuDe);
    if (data.noiDung !== undefined) formData.append('noiDung', data.noiDung);
    if (data.ngayBatDau !== undefined) formData.append('ngayBatDau', data.ngayBatDau);
    if (data.ngayKetThuc !== undefined) formData.append('ngayKetThuc', data.ngayKetThuc);
    if (data.mucDoUuTien !== undefined) formData.append('mucDoUuTien', data.mucDoUuTien);
    if (data.trangThai !== undefined) formData.append('trangThai', data.trangThai);
    if (data.ghiChu !== undefined) formData.append('ghiChu', data.ghiChu || '');

    if (data.keepFiles !== undefined) {
      formData.append('keepFiles', JSON.stringify(data.keepFiles));
    }

    if (files && files.length > 0) {
      files.forEach(file => {
        formData.append('files', file);
      });
    }

     const response = await apiClient.put(`/work-plans/${id}`, formData);

     return response.data;
  },

  async deleteWorkPlan(id: string): Promise<void> {
     await apiClient.delete(`/work-plans/${id}`);
  },
};

export default workPlanService;

