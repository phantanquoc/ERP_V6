import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || (import.meta.env.VITE_API_URL || 'http://localhost:5000/api') + '';

export interface QualityEvaluation {
  id: string;
  maChien: string;
  thoiGianChien: string;
  tenHangHoa: string;
  
  // Machine info
  machineId?: string;
  tenMay?: string;
  
  // Tỉ lệ thành phẩm đầu ra (%)
  aTiLe: number;
  bTiLe: number;
  bDauTiLe: number;
  cTiLe: number;
  vunLonTiLe: number;
  vunNhoTiLe: number;
  phePhamTiLe: number;
  uotTiLe: number;
  
  // Đánh giá chất lượng
  muiHuong: string;
  huongVi: string;
  doNgot: string;
  doGion: string;
  
  // Đề xuất điều chỉnh cải tiến
  deXuatDieuChinh: string;
  
  fileDinhKem?: string;
  nguoiThucHien: string;
  
  createdAt?: string;
  updatedAt?: string;
}

interface PaginatedResponse {
  data: QualityEvaluation[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

class QualityEvaluationService {
  private getAuthToken(): string {
    return localStorage.getItem('accessToken') || '';
  }

  private getHeaders() {
    return {
      'Authorization': `Bearer ${this.getAuthToken()}`,
      'Content-Type': 'application/json',
    };
  }

  async getAllQualityEvaluations(page: number = 1, limit: number = 10, tenMay?: string): Promise<PaginatedResponse> {
    try {
      const params: any = { page, limit };
      if (tenMay) {
        params.tenMay = tenMay;
      }

      const response = await axios.get(`${API_BASE_URL}/quality-evaluations`, {
        params,
        headers: this.getHeaders(),
      });
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Lỗi tải dữ liệu đánh giá chất lượng');
    }
  }

  async getQualityEvaluationById(id: string): Promise<QualityEvaluation> {
    try {
      const response = await axios.get(`${API_BASE_URL}/quality-evaluations/${id}`, {
        headers: this.getHeaders(),
      });
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Lỗi tải dữ liệu đánh giá chất lượng');
    }
  }

  async createQualityEvaluation(data: Partial<QualityEvaluation>): Promise<QualityEvaluation> {
    try {
      const response = await axios.post(`${API_BASE_URL}/quality-evaluations`, data, {
        headers: this.getHeaders(),
      });
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Lỗi tạo đánh giá chất lượng');
    }
  }

  async updateQualityEvaluation(id: string, data: Partial<QualityEvaluation>): Promise<QualityEvaluation> {
    try {
      const response = await axios.put(`${API_BASE_URL}/quality-evaluations/${id}`, data, {
        headers: this.getHeaders(),
      });
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Lỗi cập nhật đánh giá chất lượng');
    }
  }

  async deleteQualityEvaluation(id: string): Promise<void> {
    try {
      await axios.delete(`${API_BASE_URL}/quality-evaluations/${id}`, {
        headers: this.getHeaders(),
      });
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Lỗi xóa đánh giá chất lượng');
    }
  }
}

export default new QualityEvaluationService();

