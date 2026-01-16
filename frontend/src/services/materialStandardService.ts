import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface MaterialStandardItem {
  id?: string;
  tenThanhPham: string;
  tiLe: number;
}

export interface MaterialStandard {
  id: string;
  maDinhMuc: string;
  tenDinhMuc: string;
  loaiDinhMuc: 'RAW_MATERIAL' | 'EQUIPMENT';
  tiLeThuHoi?: number;
  ghiChu?: string;
  createdAt: string;
  updatedAt: string;
  items?: MaterialStandardItem[];
}

interface CreateMaterialStandardRequest {
  maDinhMuc: string;
  tenDinhMuc: string;
  loaiDinhMuc: 'RAW_MATERIAL' | 'EQUIPMENT';
  tiLeThuHoi?: number;
  ghiChu?: string;
  items?: MaterialStandardItem[];
}

interface UpdateMaterialStandardRequest {
  tenDinhMuc?: string;
  loaiDinhMuc?: 'RAW_MATERIAL' | 'EQUIPMENT';
  tiLeThuHoi?: number;
  ghiChu?: string;
  items?: MaterialStandardItem[];
}

class MaterialStandardService {
  private getAuthToken(): string {
    return localStorage.getItem('accessToken') || '';
  }

  private getHeaders() {
    return {
      'Authorization': `Bearer ${this.getAuthToken()}`,
      'Content-Type': 'application/json',
    };
  }

  async getAllMaterialStandards(page: number = 1, limit: number = 10): Promise<PaginatedResponse<MaterialStandard>> {
    try {
      const response = await axios.get(`${API_BASE_URL}/material-standards`, {
        params: { page, limit },
        headers: this.getHeaders(),
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getMaterialStandardById(id: string): Promise<MaterialStandard> {
    try {
      const response = await axios.get(`${API_BASE_URL}/material-standards/${id}`, {
        headers: this.getHeaders(),
      });
      return response.data.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async createMaterialStandard(data: CreateMaterialStandardRequest): Promise<MaterialStandard> {
    try {
      const response = await axios.post(`${API_BASE_URL}/material-standards`, data, {
        headers: this.getHeaders(),
      });
      return response.data.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async updateMaterialStandard(id: string, data: UpdateMaterialStandardRequest): Promise<MaterialStandard> {
    try {
      const response = await axios.patch(`${API_BASE_URL}/material-standards/${id}`, data, {
        headers: this.getHeaders(),
      });
      return response.data.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async deleteMaterialStandard(id: string): Promise<void> {
    try {
      await axios.delete(`${API_BASE_URL}/material-standards/${id}`, {
        headers: this.getHeaders(),
      });
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async generateMaterialStandardCode(): Promise<string> {
    try {
      const response = await axios.post(`${API_BASE_URL}/material-standards/generate-code`,
        {},
        {
          headers: this.getHeaders(),
        }
      );
      return response.data.data.code;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  private handleError(error: any): Error {
    if (axios.isAxiosError(error)) {
      const message = error.response?.data?.message || error.message;
      return new Error(message);
    }
    return new Error('An unexpected error occurred');
  }
}

export default new MaterialStandardService();
export type { MaterialStandard, MaterialStandardItem, CreateMaterialStandardRequest, UpdateMaterialStandardRequest };

