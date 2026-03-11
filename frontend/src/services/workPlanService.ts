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

     const response = await apiClient.post('/work-plans', formData);
 
     return response.data;
  },

  async getAllWorkPlans(
    page: number = 1,
    limit: number = 10,
    search?: string,
  ): Promise<{ data: WorkPlan[]; pagination: any }> {
     const response = await apiClient.get('/work-plans', {
       params: { page, limit, ...(search ? { search } : {}) },
     });

    return {
       data: response.data,
       pagination: (response as any).pagination,
    };
  },

  async getMyWorkPlans(
    page: number = 1,
    limit: number = 10,
    search?: string,
  ): Promise<{ data: WorkPlan[]; pagination: any }> {
     const response = await apiClient.get('/work-plans/my-work-plans', {
       params: { page, limit, ...(search ? { search } : {}) },
     });

    return {
       data: response.data,
       pagination: (response as any).pagination,
    };
  },

  async getWorkPlanById(id: string): Promise<WorkPlan> {
     const response = await apiClient.get(`/work-plans/${id}`);
     return response.data;
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

     const response = await apiClient.put(`/work-plans/${id}`, formData);
 
     return response.data;
  },

  async deleteWorkPlan(id: string): Promise<void> {
     await apiClient.delete(`/work-plans/${id}`);
  },
};

export default workPlanService;

