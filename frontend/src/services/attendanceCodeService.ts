import apiClient from './apiClient';

export interface AttendanceCode {
  id: string;
  code: string;
  label: string;
  description?: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAttendanceCodeData {
  code: string;
  label: string;
  description?: string;
  sortOrder?: number;
  isActive?: boolean;
}

export interface UpdateAttendanceCodeData {
  code?: string;
  label?: string;
  description?: string;
  sortOrder?: number;
  isActive?: boolean;
}

class AttendanceCodeService {
  async list(): Promise<AttendanceCode[]> {
    const response = await apiClient.get('/attendance-codes');
    return response.data as AttendanceCode[];
  }

  async create(data: CreateAttendanceCodeData): Promise<AttendanceCode> {
    const response = await apiClient.post('/attendance-codes', data);
    return response.data as AttendanceCode;
  }

  async update(id: string, data: UpdateAttendanceCodeData): Promise<AttendanceCode> {
    const response = await apiClient.put(`/attendance-codes/${id}`, data);
    return response.data as AttendanceCode;
  }

  async delete(id: string): Promise<void> {
    await apiClient.delete(`/attendance-codes/${id}`);
  }
}

export default new AttendanceCodeService();
