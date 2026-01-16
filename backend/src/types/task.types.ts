export enum TaskPriority {
  KHAN_CAP = 'KHAN_CAP',
  CAO = 'CAO',
  TRUNG_BINH = 'TRUNG_BINH',
  THAP = 'THAP',
}

export interface CreateTaskRequest {
  nguoiNhan: string[]; // Array of user IDs
  noiDung: string;
  thoiHanHoanThanh: string; // ISO date string
  ghiChu?: string;
  mucDoUuTien: TaskPriority;
}

export interface UpdateTaskRequest {
  nguoiNhan?: string[];
  noiDung?: string;
  thoiHanHoanThanh?: string;
  ghiChu?: string;
  mucDoUuTien?: TaskPriority;
}

export interface TaskResponse {
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

export interface TaskListQuery {
  page?: number;
  limit?: number;
  search?: string;
  mucDoUuTien?: TaskPriority;
  nguoiGiao?: string;
  nguoiNhan?: string;
  department?: string;
}

