import apiClient, { ApiResponse } from './apiClient';

export type ProjectPhaseStatus = 'Chưa bắt đầu' | 'Đang thực hiện' | 'Hoàn thành' | 'Tạm dừng' | string;
export type ProjectTaskStatus = 'Chưa bắt đầu' | 'Đang làm' | 'Hoàn thành' | 'Trễ' | string;

export type ProjectTaskPriority = 'KHAN_CAP' | 'CAO' | 'TRUNG_BINH' | 'THAP';

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
  tienDoTongThe?: number;
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
  ngayBatDauThucTe?: string | null;
  ngayHoanThanhThucTe?: string | null;
  deadline?: string;
  trangThai: ProjectTaskStatus;
  mucDoUuTien?: ProjectTaskPriority | null;
  laMilestone?: boolean;
  laPhatSinh?: boolean;
  ghiChu?: string | null;
  thuTu: number;
  costs?: ProjectCost[];
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
  nganSach?: number | null;
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
  nganSach?: number | string;
}

export type UpdateProjectPhaseRequest = Partial<CreateProjectPhaseRequest>;

export interface ReorderProjectPhasesRequest {
  phaseIds: string[];
}

export interface ReorderProjectTasksRequest {
  taskIds: string[];
  phaseId?: string | null;
}

export interface CreateProjectTaskRequest {
  tieuDe: string;
  moTa?: string;
  nguoiPhuTrach?: string;
  projectPhaseId?: string | null;
  tienDo?: number;
  ngayBatDau?: string;
  ngayKetThuc?: string;
  ngayBatDauThucTe?: string;
  ngayHoanThanhThucTe?: string;
  deadline?: string;
  trangThai?: ProjectTaskStatus;
  thuTu?: number;
  mucDoUuTien?: ProjectTaskPriority | null;
  laMilestone?: boolean;
  laPhatSinh?: boolean;
  ghiChu?: string;
}

export type UpdateProjectTaskRequest = Partial<CreateProjectTaskRequest>;

export interface ProjectUpdate {
  id: string;
  projectId: string;
  projectPhaseId?: string | null;
  ngay: string;
  tieuDe: string;
  noiDung: string;
  tienDoHienTai: number;
  fileDinhKem?: string | null;
  nguoiCapNhat: string;
  nguoiCapNhatId: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectApproval {
  id: string;
  projectId: string;
  nguoiGuiId: string;
  nguoiDuyetId?: string | null;
  trangThai: 'CHO_DUYET' | 'DA_DUYET' | 'TU_CHOI';
  lyDoTuChoi?: string | null;
  ghiChu?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectUpdateRequest {
  ngay: string;
  tieuDe: string;
  noiDung: string;
  tienDoHienTai: number;
  fileDinhKem?: string;
  nguoiCapNhat: string;
  projectPhaseId?: string | null;
}

export type UpdateProjectUpdateRequest = Partial<CreateProjectUpdateRequest>;

export interface ProjectCost {
  id: string;
  projectId: string;
  projectPhaseId?: string | null;
  projectTaskId?: string | null;
  loaiChiPhi: string;
  tenChiPhi?: string | null;
  donVi?: string | null;
  soLuongKeHoach?: number | null;
  giaKeHoach?: number | null;
  thanhTienKeHoach?: number | null;
  soLuongThucTe?: number | null;
  giaThucTe?: number | null;
  thanhTienThucTe?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectCostRequest {
  projectPhaseId?: string | null;
  projectTaskId?: string | null;
  loaiChiPhi: string;
  tenChiPhi?: string;
  donVi?: string;
  soLuongKeHoach?: number | string;
  giaKeHoach?: number | string;
  thanhTienKeHoach?: number | string;
  soLuongThucTe?: number | string;
  giaThucTe?: number | string;
  thanhTienThucTe?: number | string;
}

export type UpdateProjectCostRequest = Partial<CreateProjectCostRequest>;

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

  async reorderTasks(projectId: string, data: ReorderProjectTasksRequest): Promise<ApiResponse<ProjectTask[]>> {
    try {
      return await apiClient.post<ProjectTask[]>(`/projects/${projectId}/tasks/reorder`, data);
    } catch (error: unknown) {
      throw new Error(getErrorMessage(error, 'Lỗi khi sắp xếp công việc'));
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

  // Updates
  async getUpdates(projectId: string): Promise<ApiResponse<ProjectUpdate[]>> {
    try {
      return await apiClient.get<ProjectUpdate[]>(`/projects/${projectId}/updates`);
    } catch (error: unknown) {
      throw new Error(getErrorMessage(error, 'Lỗi khi lấy danh sách cập nhật'));
    }
  }

  async addUpdate(projectId: string, data: CreateProjectUpdateRequest): Promise<ApiResponse<ProjectUpdate>> {
    try {
      return await apiClient.post<ProjectUpdate>(`/projects/${projectId}/updates`, data);
    } catch (error: unknown) {
      throw new Error(getErrorMessage(error, 'Lỗi khi thêm cập nhật'));
    }
  }

  async updateUpdate(projectId: string, updateId: string, data: UpdateProjectUpdateRequest): Promise<ApiResponse<ProjectUpdate>> {
    try {
      return await apiClient.put<ProjectUpdate>(`/projects/${projectId}/updates/${updateId}`, data);
    } catch (error: unknown) {
      throw new Error(getErrorMessage(error, 'Lỗi khi cập nhật'));
    }
  }

  async deleteUpdate(projectId: string, updateId: string): Promise<ApiResponse<void>> {
    try {
      return await apiClient.delete<void>(`/projects/${projectId}/updates/${updateId}`);
    } catch (error: unknown) {
      throw new Error(getErrorMessage(error, 'Lỗi khi xóa cập nhật'));
    }
  }

  // Costs
  async getCosts(projectId: string, projectPhaseId?: string | null, projectTaskId?: string | null): Promise<ApiResponse<ProjectCost[]>> {
    try {
      const params: Record<string, unknown> = {};
      if (projectPhaseId !== undefined) params.projectPhaseId = projectPhaseId ?? '';
      if (projectTaskId !== undefined) params.projectTaskId = projectTaskId ?? '';
      return await apiClient.get<ProjectCost[]>(`/projects/${projectId}/costs`, { params });
    } catch (error: unknown) {
      throw new Error(getErrorMessage(error, 'Lỗi khi lấy danh sách chi phí'));
    }
  }

  async addCost(projectId: string, data: CreateProjectCostRequest): Promise<ApiResponse<ProjectCost>> {
    try {
      return await apiClient.post<ProjectCost>(`/projects/${projectId}/costs`, data);
    } catch (error: unknown) {
      throw new Error(getErrorMessage(error, 'Lỗi khi thêm chi phí'));
    }
  }

  async updateCost(projectId: string, costId: string, data: UpdateProjectCostRequest): Promise<ApiResponse<ProjectCost>> {
    try {
      return await apiClient.put<ProjectCost>(`/projects/${projectId}/costs/${costId}`, data);
    } catch (error: unknown) {
      throw new Error(getErrorMessage(error, 'Lỗi khi cập nhật chi phí'));
    }
  }

  async deleteCost(projectId: string, costId: string): Promise<ApiResponse<void>> {
    try {
      return await apiClient.delete<void>(`/projects/${projectId}/costs/${costId}`);
    } catch (error: unknown) {
      throw new Error(getErrorMessage(error, 'Lỗi khi xóa chi phí'));
    }
  }

  // Approval workflow
  async getApprovals(projectId: string): Promise<ApiResponse<ProjectApproval[]>> {
    try {
      return await apiClient.get<ProjectApproval[]>(`/projects/${projectId}/approvals`);
    } catch (error: unknown) {
      throw new Error(getErrorMessage(error, 'Lỗi khi lấy lịch sử duyệt'));
    }
  }

  async submitForApproval(projectId: string, ghiChu?: string, nguoiDuyetId?: string): Promise<ApiResponse<ProjectApproval>> {
    try {
      return await apiClient.post<ProjectApproval>(`/projects/${projectId}/submit-approval`, { ghiChu, nguoiDuyetId });
    } catch (error: unknown) {
      throw new Error(getErrorMessage(error, 'Lỗi khi gửi duyệt'));
    }
  }

  async approve(projectId: string): Promise<ApiResponse<void>> {
    try {
      return await apiClient.post<void>(`/projects/${projectId}/approve`, {});
    } catch (error: unknown) {
      throw new Error(getErrorMessage(error, 'Lỗi khi duyệt dự án'));
    }
  }

  async reject(projectId: string, lyDoTuChoi: string): Promise<ApiResponse<void>> {
    try {
      return await apiClient.post<void>(`/projects/${projectId}/reject`, { lyDoTuChoi });
    } catch (error: unknown) {
      throw new Error(getErrorMessage(error, 'Lỗi khi từ chối dự án'));
    }
  }
}

export default new ProjectService();
