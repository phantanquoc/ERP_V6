 import apiClient from './apiClient';

export enum TaskPriority {
  KHAN_CAP = 'KHAN_CAP',
  CAO = 'CAO',
  TRUNG_BINH = 'TRUNG_BINH',
  THAP = 'THAP',
}

export enum TaskAcceptanceStatus {
  CHUA_TIEP_NHAN = 'CHUA_TIEP_NHAN',
  DA_TIEP_NHAN = 'DA_TIEP_NHAN',
  TU_CHOI = 'TU_CHOI',
}

export interface Task {
  id: string;
  ngayGiao: string;
  nguoiGiao: {
    id: string;
    firstName: string;
    lastName: string;
    employeeCode: string;
    department: string;
  };
  nguoiNhan: Array<{
    id: string;
    firstName: string;
    lastName: string;
    employeeCode: string;
    department: string;
  }>;
  noiDung: string;
  thoiHanHoanThanh: string;
  ghiChu?: string;
  files?: string[];
  mucDoUuTien: TaskPriority;
  trangThaiTiepNhan?: Record<string, TaskAcceptanceStatus>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskData {
  nguoiNhan: string[];
  noiDung: string;
  thoiHanHoanThanh: string;
  ghiChu?: string;
  mucDoUuTien: TaskPriority;
  files?: File[];
}

export const taskService = {
  async createTask(data: CreateTaskData): Promise<Task> {
    const formData = new FormData();
    
    // Append array of nguoiNhan
    data.nguoiNhan.forEach(id => {
      formData.append('nguoiNhan[]', id);
    });
    
    formData.append('noiDung', data.noiDung);
    formData.append('thoiHanHoanThanh', data.thoiHanHoanThanh);
    formData.append('mucDoUuTien', data.mucDoUuTien);
    
    if (data.ghiChu) {
      formData.append('ghiChu', data.ghiChu);
    }
    
    // Append multiple files
    if (data.files && data.files.length > 0) {
      data.files.forEach(file => {
        formData.append('files', file);
      });
    }

     const response = await apiClient.post('/tasks', formData);
     
     return response.data;
  },

  async getAllTasks(params?: {
    page?: number;
    limit?: number;
    search?: string;
    mucDoUuTien?: TaskPriority;
    department?: string;
  }): Promise<{ data: Task[]; total: number; page: number; totalPages: number }> {
     const response = await apiClient.get('/tasks', { params });
     
     return {
       data: response.data,
       total: (response as any).pagination.total,
       page: (response as any).pagination.page,
       totalPages: (response as any).pagination.totalPages,
    };
  },

  async getMyTasks(params?: {
    page?: number;
    limit?: number;
  }): Promise<{ data: Task[]; total: number; page: number; totalPages: number }> {
     const response = await apiClient.get('/tasks/my-tasks', { params });
     
     return {
       data: response.data,
       total: (response as any).pagination.total,
       page: (response as any).pagination.page,
       totalPages: (response as any).pagination.totalPages,
    };
  },

  async getTaskById(id: string): Promise<Task> {
     const response = await apiClient.get(`/tasks/${id}`);
     return response.data;
  },

  async updateTask(id: string, data: Partial<CreateTaskData>): Promise<Task> {
    const formData = new FormData();

    if (data.nguoiNhan) {
      data.nguoiNhan.forEach(id => {
        formData.append('nguoiNhan[]', id);
      });
    }

    if (data.noiDung) formData.append('noiDung', data.noiDung);
    if (data.thoiHanHoanThanh) formData.append('thoiHanHoanThanh', data.thoiHanHoanThanh);
    if (data.mucDoUuTien) formData.append('mucDoUuTien', data.mucDoUuTien);
    if (data.ghiChu !== undefined) formData.append('ghiChu', data.ghiChu);

    if (data.files && data.files.length > 0) {
      data.files.forEach(file => {
        formData.append('files', file);
      });
    }

     const response = await apiClient.put(`/tasks/${id}`, formData);
 
     return response.data;
  },

  async deleteTask(id: string): Promise<void> {
     await apiClient.delete(`/tasks/${id}`);
  },

  async acceptTask(id: string, trangThai: TaskAcceptanceStatus): Promise<Task> {
    const response = await apiClient.patch(`/tasks/${id}/accept`, { trangThai });
    return response.data;
  },
};

