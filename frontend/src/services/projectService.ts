import apiClient from './apiClient';

export interface Project {
  id: string;
  maDuAn: string;
  tenDuAn: string;
  moTa?: string;
  ngayBatDau: string;
  ngayKetThuc?: string;
  trangThai: string;
  nguoiTaoId: string;
  fileDinhKem?: string;
  createdAt: string;
  updatedAt: string;
  members: ProjectMember[];
  tasks: ProjectTask[];
}

export interface ProjectMember {
  id: string;
  projectId: string;
  userId: string;
  vaiTro: string;
  ngayThamGia: string;
}

export interface ProjectTask {
  id: string;
  projectId: string;
  tieuDe: string;
  moTa?: string;
  nguoiPhuTrach?: string;
  deadline?: string;
  trangThai: string;
  thuTu: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectRequest {
  tenDuAn: string;
  moTa?: string;
  ngayBatDau: string;
  ngayKetThuc?: string;
  trangThai?: string;
  memberIds?: string[];
}

export interface ProjectFilters {
  page?: number;
  limit?: number;
  search?: string;
  trangThai?: string;
}

class ProjectService {
  async getAll(filters: ProjectFilters = {}) {
    try {
      const params: Record<string, unknown> = { page: filters.page ?? 1, limit: filters.limit ?? 10 };
      if (filters.search) params.search = filters.search;
      if (filters.trangThai) params.trangThai = filters.trangThai;
      return await apiClient.get('/projects', { params });
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Lỗi khi lấy danh sách dự án');
    }
  }

  async getById(id: string) {
    try {
      return await apiClient.get(`/projects/${id}`);
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Không tìm thấy dự án');
    }
  }

  async create(data: CreateProjectRequest, file?: File) {
    try {
      const formData = new FormData();
      const { memberIds, ...rest } = data;
      Object.entries(rest).forEach(([k, v]) => { if (v !== undefined) formData.append(k, String(v)); });
      if (memberIds) formData.append('memberIds', JSON.stringify(memberIds));
      if (file) formData.append('file', file);
      return await apiClient.post('/projects', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Lỗi khi tạo dự án');
    }
  }

  async update(id: string, data: Partial<CreateProjectRequest>, file?: File) {
    try {
      const formData = new FormData();
      Object.entries(data).forEach(([k, v]) => { if (v !== undefined) formData.append(k, String(v)); });
      if (file) formData.append('file', file);
      return await apiClient.put(`/projects/${id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Lỗi khi cập nhật dự án');
    }
  }

  async delete(id: string) {
    try {
      return await apiClient.delete(`/projects/${id}`);
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Lỗi khi xóa dự án');
    }
  }

  async addMember(projectId: string, userId: string, vaiTro = 'Thành viên') {
    try {
      return await apiClient.post(`/projects/${projectId}/members`, { userId, vaiTro });
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Lỗi khi thêm thành viên');
    }
  }

  async removeMember(projectId: string, userId: string) {
    try {
      return await apiClient.delete(`/projects/${projectId}/members/${userId}`);
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Lỗi khi xóa thành viên');
    }
  }

  async addTask(projectId: string, data: {
    tieuDe: string; moTa?: string; nguoiPhuTrach?: string; deadline?: string; trangThai?: string; thuTu?: number;
  }) {
    try {
      return await apiClient.post(`/projects/${projectId}/tasks`, data);
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Lỗi khi thêm công việc');
    }
  }

  async updateTask(projectId: string, taskId: string, data: Record<string, unknown>) {
    try {
      return await apiClient.put(`/projects/${projectId}/tasks/${taskId}`, data);
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Lỗi khi cập nhật công việc');
    }
  }

  async deleteTask(projectId: string, taskId: string) {
    try {
      return await apiClient.delete(`/projects/${projectId}/tasks/${taskId}`);
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Lỗi khi xóa công việc');
    }
  }
}

export default new ProjectService();
