import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || (import.meta.env.VITE_API_URL || 'http://localhost:5000/api') + '';

export interface FinishedProduct {
  id: string;
  maChien: string;
  thoiGianChien: string;
  tenHangHoa: string;
  khoiLuong: number;
  
  // Thành phẩm A
  aKhoiLuong: number;
  aTiLe: number;
  
  // Thành phẩm B
  bKhoiLuong: number;
  bTiLe: number;
  
  // Thành phẩm B Dầu
  bDauKhoiLuong: number;
  bDauTiLe: number;
  
  // Thành phẩm C
  cKhoiLuong: number;
  cTiLe: number;
  
  // Vụn lớn
  vunLonKhoiLuong: number;
  vunLonTiLe: number;
  
  // Vụn nhỏ
  vunNhoKhoiLuong: number;
  vunNhoTiLe: number;
  
  // Phế phẩm
  phePhamKhoiLuong: number;
  phePhamTiLe: number;
  
  // Ướt
  uotKhoiLuong: number;
  uotTiLe: number;
  
  tongKhoiLuong: number;
  fileDinhKem?: string;
  nguoiThucHien: string;
  
  createdAt?: string;
  updatedAt?: string;
}

interface FinishedProductResponse {
  success: boolean;
  data: FinishedProduct[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  message?: string;
}

class FinishedProductService {
  private getAuthToken(): string {
    return localStorage.getItem('accessToken') || '';
  }

  private getHeaders() {
    return {
      'Authorization': `Bearer ${this.getAuthToken()}`,
      'Content-Type': 'application/json',
    };
  }

  async getAllFinishedProducts(page: number = 1, limit: number = 10, tenMay?: string): Promise<{ data: FinishedProduct[], pagination: any }> {
    try {
      const params: any = { page, limit };
      if (tenMay) {
        params.tenMay = tenMay;
      }

      const response = await axios.get<FinishedProductResponse>(`${API_BASE_URL}/finished-products`, {
        params,
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

  async getFinishedProductById(id: string): Promise<FinishedProduct> {
    try {
      const response = await axios.get(`${API_BASE_URL}/finished-products/${id}`, {
        headers: this.getHeaders(),
      });
      return response.data.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async createFinishedProduct(data: Partial<FinishedProduct>): Promise<FinishedProduct> {
    try {
      const response = await axios.post(`${API_BASE_URL}/finished-products`, data, {
        headers: this.getHeaders(),
      });
      return response.data.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async updateFinishedProduct(id: string, data: Partial<FinishedProduct>): Promise<FinishedProduct> {
    try {
      const response = await axios.patch(`${API_BASE_URL}/finished-products/${id}`, data, {
        headers: this.getHeaders(),
      });
      return response.data.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async deleteFinishedProduct(id: string): Promise<void> {
    try {
      await axios.delete(`${API_BASE_URL}/finished-products/${id}`, {
        headers: this.getHeaders(),
      });
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getTotalWeightByDate(date: string): Promise<{ totalWeight: number; productCount: number }> {
    try {
      const response = await axios.get(`${API_BASE_URL}/finished-products/total-weight-by-date`, {
        params: { date },
        headers: this.getHeaders(),
      });
      return response.data.data;
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

export default new FinishedProductService();

