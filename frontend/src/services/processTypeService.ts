import apiClient, { ApiResponse } from './apiClient';

export interface ProcessType {
  id: string;
  code: string;
  name: string;
  thuTu: number;
  kichHoat: boolean;
  macDinhHeThong: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProcessTypeQuery {
  kichHoat?: boolean;
}

export interface CreateProcessTypeData {
  name: string;
  thuTu?: number;
}

export type UpdateProcessTypeData = Partial<{
  name: string;
  thuTu: number;
  kichHoat: boolean;
}>;

class ProcessTypeService {
  async getAll(params?: ProcessTypeQuery): Promise<ApiResponse<ProcessType[]>> {
    const query: Record<string, string> = {};
    if (params?.kichHoat !== undefined) {
      query.kichHoat = String(params.kichHoat);
    }
    return apiClient.get<ProcessType[]>('/process-types', { params: query });
  }

  async getById(id: string): Promise<ApiResponse<ProcessType>> {
    return apiClient.get<ProcessType>(`/process-types/${id}`);
  }

  async create(data: CreateProcessTypeData): Promise<ApiResponse<ProcessType>> {
    return apiClient.post<ProcessType>('/process-types', data);
  }

  async update(id: string, data: UpdateProcessTypeData): Promise<ApiResponse<ProcessType>> {
    return apiClient.patch<ProcessType>(`/process-types/${id}`, data);
  }

  async remove(id: string): Promise<ApiResponse<null>> {
    return apiClient.delete<null>(`/process-types/${id}`);
  }
}

export const processTypeService = new ProcessTypeService();
export default processTypeService;
