import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

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
  createdAt?: string;
  updatedAt?: string;
}

class MaterialEvaluationService {
  private getAuthToken(): string {
    return localStorage.getItem('accessToken') || '';
  }

  private getHeaders() {
    return {
      'Authorization': `Bearer ${this.getAuthToken()}`,
      'Content-Type': 'application/json',
    };
  }

  async getAllMaterialEvaluations(page: number = 1, limit: number = 10): Promise<{ data: MaterialEvaluation[], pagination: any }> {
    try {
      const response = await axios.get(`${API_BASE_URL}/material-evaluations`, {
        params: { page, limit },
        headers: this.getHeaders(),
      });
      return {
        data: response.data.data,
        pagination: response.data.pagination,
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getMaterialEvaluationById(id: string): Promise<MaterialEvaluation> {
    try {
      const response = await axios.get(`${API_BASE_URL}/material-evaluations/${id}`, {
        headers: this.getHeaders(),
      });
      return response.data.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getMaterialEvaluationByMaChien(maChien: string): Promise<MaterialEvaluation> {
    try {
      const response = await axios.get(`${API_BASE_URL}/material-evaluations/ma-chien/${maChien}`, {
        headers: this.getHeaders(),
      });
      return response.data.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async generateMaChien(): Promise<string> {
    try {
      const response = await axios.post(`${API_BASE_URL}/material-evaluations/generate-code`, {}, {
        headers: this.getHeaders(),
      });
      return response.data.data.maChien;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async createMaterialEvaluation(data: Partial<MaterialEvaluation>): Promise<MaterialEvaluation> {
    try {
      const response = await axios.post(`${API_BASE_URL}/material-evaluations`, data, {
        headers: this.getHeaders(),
      });
      return response.data.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async updateMaterialEvaluation(id: string, data: Partial<MaterialEvaluation>): Promise<MaterialEvaluation> {
    try {
      const response = await axios.patch(`${API_BASE_URL}/material-evaluations/${id}`, data, {
        headers: this.getHeaders(),
      });
      return response.data.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async deleteMaterialEvaluation(id: string): Promise<void> {
    try {
      await axios.delete(`${API_BASE_URL}/material-evaluations/${id}`, {
        headers: this.getHeaders(),
      });
    } catch (error) {
      throw this.handleError(error);
    }
  }

  private handleError(error: any): Error {
    if (axios.isAxiosError(error)) {
      const message = error.response?.data?.message || error.message;
      return new Error(message);
    }
    return error;
  }
}

export default new MaterialEvaluationService();

