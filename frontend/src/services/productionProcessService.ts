import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || (import.meta.env.VITE_API_URL || 'http://localhost:5000/api') + '';
const API_URL = `${API_BASE}/production-processes`;

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
    const token = localStorage.getItem('accessToken');
    const response = await axios.get(API_URL, {
      params: { page, limit },
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  }

  // Get production process by ID
  async getProductionProcessById(id: string) {
    const token = localStorage.getItem('accessToken');
    const response = await axios.get(`${API_URL}/${id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  }

  // Create production process
  async createProductionProcess(data: CreateProductionProcessData) {
    const token = localStorage.getItem('accessToken');
    const response = await axios.post(API_URL, data, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  }

  // Update production process
  async updateProductionProcess(id: string, data: CreateProductionProcessData) {
    const token = localStorage.getItem('accessToken');
    const response = await axios.put(`${API_URL}/${id}`, data, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  }

  // Delete production process
  async deleteProductionProcess(id: string) {
    const token = localStorage.getItem('accessToken');
    const response = await axios.delete(`${API_URL}/${id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  }
}

export default new ProductionProcessService();

