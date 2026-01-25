import axios from 'axios';

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api');

const getAuthHeader = () => {
  const token = localStorage.getItem('accessToken');
  return {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
};

export enum TaskPriority {
  KHAN_CAP = 'KHAN_CAP',
  CAO = 'CAO',
  TRUNG_BINH = 'TRUNG_BINH',
  THAP = 'THAP',
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

    const response = await axios.post(API_URL, formData, {
      ...getAuthHeader(),
      headers: {
        ...getAuthHeader().headers,
        'Content-Type': 'multipart/form-data',
      },
    });
    
    return response.data.data;
  },

  async getAllTasks(params?: {
    page?: number;
    limit?: number;
    search?: string;
    mucDoUuTien?: TaskPriority;
    department?: string;
  }): Promise<{ data: Task[]; total: number; page: number; totalPages: number }> {
    const response = await axios.get(API_URL, {
      ...getAuthHeader(),
      params,
    });
    
    return {
      data: response.data.data,
      total: response.data.pagination.total,
      page: response.data.pagination.page,
      totalPages: response.data.pagination.totalPages,
    };
  },

  async getMyTasks(params?: {
    page?: number;
    limit?: number;
  }): Promise<{ data: Task[]; total: number; page: number; totalPages: number }> {
    const response = await axios.get(`${API_URL}/my-tasks`, {
      ...getAuthHeader(),
      params,
    });
    
    return {
      data: response.data.data,
      total: response.data.pagination.total,
      page: response.data.pagination.page,
      totalPages: response.data.pagination.totalPages,
    };
  },

  async getTaskById(id: string): Promise<Task> {
    const response = await axios.get(`${API_URL}/${id}`, getAuthHeader());
    return response.data.data;
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

    const response = await axios.put(`${API_URL}/${id}`, formData, {
      ...getAuthHeader(),
      headers: {
        ...getAuthHeader().headers,
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data.data;
  },

  async deleteTask(id: string): Promise<void> {
    await axios.delete(`${API_URL}/${id}`, getAuthHeader());
  },
};

