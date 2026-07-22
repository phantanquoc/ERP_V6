import apiClient from './apiClient';

export interface MaterialEvaluation {
  id: string;
  maChien: string;
  thoiGianChien: string;
  tenHangHoa: string;
  soLoKien: string;
  khoiLuong: number;
  soLanNgam: number;
  nhietDoNuocTruocNgam: number;
  nhietDoNuocSauVot: number;
  thoiGianNgam: number;
  brixNuocNgam: number;
  danhGiaTruocNgam: string;
  danhGiaSauNgam: string;
  fileDinhKem?: string;
  nguoiThucHien: string;
  ca?: number | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface MaterialEvaluationDeleteInfo {
  qualityEvaluationCount: number;
  finishedProductCount: number;
  systemOperationCount: number;
}

class MaterialEvaluationService {
  private buildFormData(data: Record<string, any>, file?: File): FormData {
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== null && key !== 'fileDinhKem') {
        formData.append(key, typeof value === 'object' ? JSON.stringify(value) : value.toString());
      }
    });
    if (file) {
      formData.append('file', file);
    }
    return formData;
  }

  async getAllMaterialEvaluations(
    page: number = 1,
    limit: number = 10,
    filters?: {
      nguoiThucHien?: string;
      dateFrom?: string;
      dateTo?: string;
      ca?: number;
      thoiGianChienFrom?: string;
      thoiGianChienTo?: string;
    },
  ): Promise<{ data: MaterialEvaluation[], pagination: any }> {
    try {
      const params: Record<string, any> = { page, limit };
      if (filters?.nguoiThucHien) params.nguoiThucHien = filters.nguoiThucHien;
      if (filters?.dateFrom) params.dateFrom = filters.dateFrom;
      if (filters?.dateTo) params.dateTo = filters.dateTo;
      if (filters?.ca != null) params.ca = filters.ca;
      if (filters?.thoiGianChienFrom) params.thoiGianChienFrom = filters.thoiGianChienFrom;
      if (filters?.thoiGianChienTo) params.thoiGianChienTo = filters.thoiGianChienTo;
      const response = await apiClient.get<any>('/material-evaluations', { params });
      return {
        data: response.data,
        pagination: (response as any).pagination,
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getMaterialEvaluationById(id: string): Promise<MaterialEvaluation> {
    try {
      const response = await apiClient.get<MaterialEvaluation>(`/material-evaluations/${id}`);
      return response.data as MaterialEvaluation;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getMaterialEvaluationByMaChien(maChien: string): Promise<MaterialEvaluation> {
    try {
      const response = await apiClient.get<MaterialEvaluation>(`/material-evaluations/ma-chien/${maChien}`);
      return response.data as MaterialEvaluation;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async generateMaChien(): Promise<string> {
    try {
      const response = await apiClient.post<any>('/material-evaluations/generate-code', {});
      return (response.data as any).maChien;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async createMaterialEvaluation(data: Partial<MaterialEvaluation>, file?: File): Promise<MaterialEvaluation> {
    try {
      if (file) {
        const formData = this.buildFormData(data, file);
        const response = await apiClient.post<MaterialEvaluation>('/material-evaluations', formData);
        return response.data as MaterialEvaluation;
      }
      const response = await apiClient.post<MaterialEvaluation>('/material-evaluations', data as Record<string, any>);
      return response.data as MaterialEvaluation;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async updateMaterialEvaluation(id: string, data: Partial<MaterialEvaluation>, file?: File): Promise<MaterialEvaluation> {
    try {
      if (file) {
        const formData = this.buildFormData(data, file);
        const response = await apiClient.patch<MaterialEvaluation>(`/material-evaluations/${id}`, formData);
        return response.data as MaterialEvaluation;
      }
      const response = await apiClient.patch<MaterialEvaluation>(`/material-evaluations/${id}`, data as Record<string, any>);
      return response.data as MaterialEvaluation;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getDeleteInfo(id: string): Promise<MaterialEvaluationDeleteInfo> {
    try {
      const response = await apiClient.get<MaterialEvaluationDeleteInfo>(`/material-evaluations/${id}/delete-info`);
      return response.data as MaterialEvaluationDeleteInfo;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async deleteMaterialEvaluation(id: string): Promise<void> {
    try {
      await apiClient.delete(`/material-evaluations/${id}`);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  private handleError(error: any): Error {
    if (error instanceof Error) {
      return error;
    }
    return new Error('An unexpected error occurred');
  }
}

export default new MaterialEvaluationService();

