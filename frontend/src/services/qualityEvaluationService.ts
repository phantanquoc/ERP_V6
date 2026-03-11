import apiClient from './apiClient';

export interface QualityEvaluation {
  id: string;
  maChien: string;
  thoiGianChien: string;
  tenHangHoa: string;
  mauSac: string;

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

  async getAllQualityEvaluations(page: number = 1, limit: number = 10, tenMay?: string): Promise<PaginatedResponse> {
    try {
      const params: any = { page, limit };
      if (tenMay) {
        params.tenMay = tenMay;
      }

      const response = await apiClient.get('/quality-evaluations', { params });
      return response.data;
    } catch (error: any) {
      throw new Error(error instanceof Error ? error.message : 'Lỗi tải dữ liệu đánh giá chất lượng');
    }
  }

  async getQualityEvaluationById(id: string): Promise<QualityEvaluation> {
    try {
      const response = await apiClient.get(`/quality-evaluations/${id}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error instanceof Error ? error.message : 'Lỗi tải dữ liệu đánh giá chất lượng');
    }
  }

  async createQualityEvaluation(data: Partial<QualityEvaluation>, file?: File): Promise<QualityEvaluation> {
    try {
      if (file) {
        const formData = this.buildFormData(data, file);
        const response = await apiClient.post('/quality-evaluations', formData);
        return response.data;
      }
      const response = await apiClient.post('/quality-evaluations', data);
      return response.data;
    } catch (error: any) {
      throw new Error(error instanceof Error ? error.message : 'Lỗi tạo đánh giá chất lượng');
    }
  }

  async updateQualityEvaluation(id: string, data: Partial<QualityEvaluation>, file?: File): Promise<QualityEvaluation> {
    try {
      if (file) {
        const formData = this.buildFormData(data, file);
        const response = await apiClient.put(`/quality-evaluations/${id}`, formData);
        return response.data;
      }
      const response = await apiClient.put(`/quality-evaluations/${id}`, data);
      return response.data;
    } catch (error: any) {
      throw new Error(error instanceof Error ? error.message : 'Lỗi cập nhật đánh giá chất lượng');
    }
  }

  async deleteQualityEvaluation(id: string): Promise<void> {
    try {
      await apiClient.delete(`/quality-evaluations/${id}`);
    } catch (error: any) {
      throw new Error(error instanceof Error ? error.message : 'Lỗi xóa đánh giá chất lượng');
    }
  }

  async exportToExcel(): Promise<void> {
    const token = localStorage.getItem('accessToken');
    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    const url = `${API_BASE_URL}/quality-evaluations/export/excel`;

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) throw new Error('Failed to export to Excel');

    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `danh-gia-chat-luong-${Date.now()}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  }
}

export default new QualityEvaluationService();

