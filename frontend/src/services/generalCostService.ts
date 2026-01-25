import axios from 'axios';

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api');

export interface GeneralCost {
  id: string;
  maChiPhi: string;
  tenChiPhi: string;
  loaiChiPhi: string;
  noiDung?: string;
  donViTinh?: string;
  msnv?: string;
  tenNhanVien?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateGeneralCostInput {
  tenChiPhi: string;
  loaiChiPhi: string;
  noiDung?: string;
  donViTinh?: string;
  msnv?: string;
  tenNhanVien?: string;
}

export interface UpdateGeneralCostInput {
  tenChiPhi?: string;
  loaiChiPhi?: string;
  noiDung?: string;
  donViTinh?: string;
  giaTri?: number;
  ghiChu?: string;
}

export interface GeneralCostResponse {
  data: GeneralCost[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

class GeneralCostService {
  private getAuthHeaders() {
    const token = localStorage.getItem('accessToken');
    return {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    };
  }

  async getAllGeneralCosts(page: number = 1, limit: number = 10, search?: string): Promise<GeneralCostResponse> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    if (search) {
      params.append('search', search);
    }

    const response = await axios.get(`${API_URL}?${params.toString()}`, this.getAuthHeaders());
    return response.data;
  }

  async getGeneralCostById(id: string): Promise<GeneralCost> {
    const response = await axios.get(`${API_URL}/${id}`, this.getAuthHeaders());
    return response.data;
  }

  async createGeneralCost(data: CreateGeneralCostInput): Promise<GeneralCost> {
    const response = await axios.post(API_URL, data, this.getAuthHeaders());
    return response.data;
  }

  async updateGeneralCost(id: string, data: UpdateGeneralCostInput): Promise<GeneralCost> {
    const response = await axios.put(`${API_URL}/${id}`, data, this.getAuthHeaders());
    return response.data;
  }

  async deleteGeneralCost(id: string): Promise<void> {
    await axios.delete(`${API_URL}/${id}`, this.getAuthHeaders());
  }
}

export default new GeneralCostService();

