import apiClient, { ApiResponse } from './apiClient';

export type ProjectPhaseStatus = 'Chưa bắt đầu' | 'Đang thực hiện' | 'Hoàn thành' | 'Tạm dừng' | string;
export type ProjectTaskStatus = 'Chưa bắt đầu' | 'Đang làm' | 'Hoàn thành' | 'Trễ' | string;

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
  phases?: ProjectPhase[];
  tasks: ProjectTask[];
  unphasedTasks?: ProjectTask[];
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
  projectPhaseId?: string | null;
  tieuDe: string;
  moTa?: string;
  nguoiPhuTrach?: string;
  tienDo?: number;
  ngayBatDau?: string;
  ngayKetThuc?: string;
  deadline?: string;
  trangThai: ProjectTaskStatus;
  thuTu: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectPhase {
  id: string;
  projectId: string;
  tenGiaiDoan: string;
  moTa?: string | null;
  chuSoHuuId?: string | null;
  chuSoHuu?: string | null;
  nguoiPhuTrachId?: string | null;
  nguoiPhuTrach?: string | null;
  tienDo: number;
  trangThai: ProjectPhaseStatus;
  thuTu: number;
  ngayBatDau?: string | null;
  ngayKetThuc?: string | null;
  createdAt: string;
  updatedAt: string;
  tasks?: ProjectTask[];
}

export interface CreateProjectRequest {
  tenDuAn: string;
  moTa?: string;
  ngayBatDau: string;
  ngayKetThuc?: string;
  trangThai?: string;
  memberIds?: string[];
}

export type UpdateProjectRequest = Partial<CreateProjectRequest>;

export interface ProjectFilters {
  page?: number;
  limit?: number;
  search?: string;
  trangThai?: string;
}

export interface CreateProjectPhaseRequest {
  tenGiaiDoan: string;
  moTa?: string;
  chuSoHuuId?: string;
  chuSoHuu?: string;
  nguoiPhuTrachId?: string;
  nguoiPhuTrach?: string;
  tienDo?: number;
  trangThai?: ProjectPhaseStatus;
  thuTu?: number;
  ngayBatDau?: string;
  ngayKetThuc?: string;
}

export type UpdateProjectPhaseRequest = Partial<CreateProjectPhaseRequest>;

export interface ReorderProjectPhasesRequest {
  phaseIds: string[];
}

export interface CreateProjectTaskRequest {
  tieuDe: string;
  moTa?: string;
  nguoiPhuTrach?: string;
  projectPhaseId?: string | null;
  tienDo?: number;
  ngayBatDau?: string;
  ngayKetThuc?: string;
  deadline?: string;
  trangThai?: ProjectTaskStatus;
  thuTu?: number;
}

export type UpdateProjectTaskRequest = Partial<CreateProjectTaskRequest>;

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

class ProjectService {
  async getAll(filters: ProjectFilters = {}): Promise<ApiResponse<Project[]>> {
    try {
      const params: Record<string, unknown> = { page: filters.page ?? 1, limit: filters.limit ?? 10 };
      if (filters.search) params.search = filters.search;
      if (filters.trangThai) params.trangThai = filters.trangThai;
      return await apiClient.get<Project[]>('/projects', { params });
    } catch (error: unknown) {
      throw new Error(getErrorMessage(error, 'Lỗi khi lấy danh sách dự án'));
    }
  }

  async getById(id: string): Promise<ApiResponse<Project>> {
    try {
      return await apiClient.get<Project>(`/projects/${id}`);
    } catch (error: unknown) {
      throw new Error(getErrorMessage(error, 'Không tìm thấy dự án'));
    }
  }

  async create(data: CreateProjectRequest, file?: File): Promise<ApiResponse<Project>> {
    try {
      const formData = new FormData();
      const { memberIds, ...rest } = data;
      Object.entries(rest).forEach(([k, v]) => { if (v !== undefined) formData.append(k, String(v)); });
      if (memberIds) formData.append('memberIds', JSON.stringify(memberIds));
      if (file) formData.append('file', file);
      return await apiClient.post<Project>('/projects', formData);
    } catch (error: unknown) {
      throw new Error(getErrorMessage(error, 'Lỗi khi tạo dự án'));
    }
  }

  async update(id: string, data: UpdateProjectRequest, file?: File): Promise<ApiResponse<Project>> {
    try {
      const formData = new FormData();
      Object.entries(data).forEach(([k, v]) => { if (v !== undefined) formData.append(k, String(v)); });
      if (file) formData.append('file', file);
      return await apiClient.put<Project>(`/projects/${id}`, formData);
    } catch (error: unknown) {
      throw new Error(getErrorMessage(error, 'Lỗi khi cập nhật dự án'));
    }
  }

  async delete(id: string): Promise<ApiResponse<void>> {
    try {
      return await apiClient.delete<void>(`/projects/${id}`);
    } catch (error: unknown) {
      throw new Error(getErrorMessage(error, 'Lỗi khi xóa dự án'));
    }
  }

  async addMember(projectId: string, userId: string, vaiTro = 'Thành viên') {
    try {
      return await apiClient.post(`/projects/${projectId}/members`, { userId, vaiTro });
    } catch (error: unknown) {
      throw new Error(getErrorMessage(error, 'Lỗi khi thêm thành viên'));
    }
  }

  async removeMember(projectId: string, userId: string) {
    try {
      return await apiClient.delete(`/projects/${projectId}/members/${userId}`);
    } catch (error: unknown) {
      throw new Error(getErrorMessage(error, 'Lỗi khi xóa thành viên'));
    }
  }

  async getPhases(projectId: string): Promise<ApiResponse<ProjectPhase[]>> {
    const response = await this.getById(projectId);
    return {
      ...response,
      data: response.data?.phases ?? [],
    };
  }

  async getUnphasedTasks(projectId: string): Promise<ApiResponse<ProjectTask[]>> {
    const response = await this.getById(projectId);
    return {
      ...response,
      data: response.data?.unphasedTasks ?? response.data?.tasks?.filter((task) => !task.projectPhaseId) ?? [],
    };
  }

  async addPhase(projectId: string, data: CreateProjectPhaseRequest): Promise<ApiResponse<ProjectPhase>> {
    try {
      return await apiClient.post<ProjectPhase>(`/projects/${projectId}/phases`, data);
    } catch (error: unknown) {
      throw new Error(getErrorMessage(error, 'Lỗi khi thêm giai đoạn'));
    }
  }

  async updatePhase(projectId: string, phaseId: string, data: UpdateProjectPhaseRequest): Promise<ApiResponse<ProjectPhase>> {
    try {
      return await apiClient.put<ProjectPhase>(`/projects/${projectId}/phases/${phaseId}`, data);
    } catch (error: unknown) {
      throw new Error(getErrorMessage(error, 'Lỗi khi cập nhật giai đoạn'));
    }
  }

  async deletePhase(projectId: string, phaseId: string, moveTasksToUnphased = false): Promise<ApiResponse<void>> {
    try {
      return await apiClient.delete<void>(`/projects/${projectId}/phases/${phaseId}`, {
        params: { moveTasksToUnphased },
      });
    } catch (error: unknown) {
      throw new Error(getErrorMessage(error, 'Lỗi khi xóa giai đoạn'));
    }
  }

  async reorderPhases(projectId: string, data: ReorderProjectPhasesRequest): Promise<ApiResponse<ProjectPhase[]>> {
    try {
      return await apiClient.post<ProjectPhase[]>(`/projects/${projectId}/phases/reorder`, data);
    } catch (error: unknown) {
      throw new Error(getErrorMessage(error, 'Lỗi khi sắp xếp giai đoạn'));
    }
  }

  async addTask(projectId: string, data: CreateProjectTaskRequest): Promise<ApiResponse<ProjectTask>> {
    try {
      return await apiClient.post<ProjectTask>(`/projects/${projectId}/tasks`, data);
    } catch (error: unknown) {
      throw new Error(getErrorMessage(error, 'Lỗi khi thêm công việc'));
    }
  }

  async updateTask(projectId: string, taskId: string, data: UpdateProjectTaskRequest): Promise<ApiResponse<ProjectTask>> {
    try {
      return await apiClient.put<ProjectTask>(`/projects/${projectId}/tasks/${taskId}`, data);
    } catch (error: unknown) {
      throw new Error(getErrorMessage(error, 'Lỗi khi cập nhật công việc'));
    }
  }

  async deleteTask(projectId: string, taskId: string): Promise<ApiResponse<void>> {
    try {
      return await apiClient.delete<void>(`/projects/${projectId}/tasks/${taskId}`);
    } catch (error: unknown) {
      throw new Error(getErrorMessage(error, 'Lỗi khi xóa công việc'));
    }
  }
}

export default new ProjectService();
