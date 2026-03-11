import apiClient from './apiClient';

export interface ProductionFlowchartCost {
  id?: string;
  loaiChiPhi: string;
  tenChiPhi?: string;
  donVi?: string;
  dinhMucLaoDong?: number;
  donViDinhMucLaoDong?: string;
  soLuongNguyenLieu?: number;
  soPhutThucHien?: number;
  soLuongKeHoach?: number;
  soLuongThucTe?: number;
  giaKeHoach?: number;
  thanhTienKeHoach?: number;
  giaThucTe?: number;
  thanhTienThucTe?: number;
}

export interface ProductionFlowchartSection {
  id?: string;
  phanDoan: string;
  tenPhanDoan?: string;
  noiDungCongViec?: string;
  fileUrl?: string;
  stt: number;
  costs: ProductionFlowchartCost[];
}

export interface ProductionFlowchart {
  id?: string;
  sections: ProductionFlowchartSection[];
}

export interface ProductionProcess {
  id: string;
  maQuyTrinhSanXuat: string;
  processId: string;
  msnv: string;
  tenNhanVien: string;
  tenQuyTrinh: string;
  loaiQuyTrinh: string;
  tenQuyTrinhSanXuat?: string;
  maNVSanXuat?: string;
  tenNVSanXuat?: string;
  khoiLuong?: number;
  thoiGian?: number;
  materialStandardId?: string;
  sanPhamDauRa?: string;
  tongNguyenLieuCanSanXuat?: number;
  soGioLamTrong1Ngay?: number;
  createdAt: string;
  updatedAt: string;
  process?: any; // Template process
  materialStandard?: any; // Material standard with items
  flowchart?: ProductionFlowchart;
}

export interface CreateProductionProcessData {
  processId: string;
  msnv: string;
  tenNhanVien: string;
  tenQuyTrinhSanXuat?: string;
  maNVSanXuat?: string;
  tenNVSanXuat?: string;
  khoiLuong?: number;
  thoiGian?: number;
  materialStandardId?: string;
  sanPhamDauRa?: string;
  tongNguyenLieuCanSanXuat?: number;
  soGioLamTrong1Ngay?: number;
  flowchart: {
    sections: ProductionFlowchartSection[];
  };
}

class ProductionProcessService {
  // Get all production processes
  async getAllProductionProcesses(page: number = 1, limit: number = 10) {
    const response = await apiClient.get('/production-processes', { params: { page, limit } });
    return response;
  }

  // Get production process by ID
  async getProductionProcessById(id: string) {
    const response = await apiClient.get(`/production-processes/${id}`);
    return response;
  }

  // Create production process
  async createProductionProcess(data: CreateProductionProcessData) {
    const response = await apiClient.post('/production-processes', data as unknown as Record<string, any>);
    return response;
  }

  // Update production process
  async updateProductionProcess(id: string, data: CreateProductionProcessData) {
    const response = await apiClient.put(`/production-processes/${id}`, data as unknown as Record<string, any>);
    return response;
  }

  // Delete production process
  async deleteProductionProcess(id: string) {
    const response = await apiClient.delete(`/production-processes/${id}`);
    return response;
  }

  // Sync production process from template
  async syncFromTemplate(id: string) {
    const response = await apiClient.post(`/production-processes/${id}/sync`, {});
    return response;
  }

  // Upload file for flowchart section
  async uploadSectionFile(file: File): Promise<{ success: boolean; data: { fileUrl: string; fileName: string } }> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await apiClient.post<{ fileUrl: string; fileName: string }>('/production-processes/upload-file', formData);
    return response as unknown as { success: boolean; data: { fileUrl: string; fileName: string } };
  }
}

export default new ProductionProcessService();

