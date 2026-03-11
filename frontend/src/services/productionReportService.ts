import apiClient from './apiClient';

export interface ProductionReport {
  id: string;
  ngayThang: string;
  tongSoTuaSanXuat: number;
  soMeTua: number;
  tongSoMeKeHoach: number;
  soMeThucTe: number;
  maDinhMuc: string;
  tongKhoiLuongNguyenLieu: number;
  tongKhoiLuongThanhPhamDinhMuc: number;
  khoiLuongThanhPhamThucTe: number;
  chenhLechKhoiLuong: number;
  danhGiaChenhLech: string;
  nguyenNhanChenhLech: string;
  deXuatDieuChinh: string;
  fileDinhKem?: string;
  nguoiThucHien: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProductionReportCreateInput {
  ngayThang: string;
  tongSoTuaSanXuat?: number;
  soMeTua?: number;
  tongSoMeKeHoach?: number;
  soMeThucTe?: number;
  maDinhMuc?: string;
  tongKhoiLuongNguyenLieu?: number;
  tongKhoiLuongThanhPhamDinhMuc?: number;
  khoiLuongThanhPhamThucTe?: number;
  danhGiaChenhLech?: string;
  nguyenNhanChenhLech?: string;
  deXuatDieuChinh?: string;
  fileDinhKem?: string;
  nguoiThucHien?: string;
}

export interface ProductionReportUpdateInput extends Partial<ProductionReportCreateInput> {}

export interface ProductionReportListResponse {
  data: ProductionReport[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

class ProductionReportService {
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

  async getAll(page: number = 1, limit: number = 10): Promise<ProductionReportListResponse> {
    const response = await apiClient.get<ProductionReportListResponse>('/production-reports', { params: { page, limit } });
    return response.data as unknown as ProductionReportListResponse;
  }

  async getById(id: string): Promise<ProductionReport> {
    const response = await apiClient.get<ProductionReport>(`/production-reports/${id}`);
    return response.data as ProductionReport;
  }

  async create(data: ProductionReportCreateInput, file?: File): Promise<ProductionReport> {
    if (file) {
      const formData = this.buildFormData(data, file);
      const response = await apiClient.post<ProductionReport>('/production-reports', formData);
      return response.data as ProductionReport;
    }
    const response = await apiClient.post<ProductionReport>('/production-reports', data as Record<string, any>);
    return response.data as ProductionReport;
  }

  async update(id: string, data: ProductionReportUpdateInput, file?: File): Promise<ProductionReport> {
    if (file) {
      const formData = this.buildFormData(data as Record<string, any>, file);
      const response = await apiClient.put<ProductionReport>(`/production-reports/${id}`, formData);
      return response.data as ProductionReport;
    }
    const response = await apiClient.put<ProductionReport>(`/production-reports/${id}`, data as Record<string, any>);
    return response.data as ProductionReport;
  }

  async delete(id: string): Promise<void> {
    await apiClient.delete(`/production-reports/${id}`);
  }
}

export default new ProductionReportService();

