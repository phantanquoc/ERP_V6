import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const API_URL = `${API_BASE}/processes`;

// Flowchart interfaces (defined first to be used in Process)
export interface ProcessFlowchartCost {
  id?: string;
  loaiChiPhi: string;  // Nhân công/Vật tư/Phụ liệu
  tenChiPhi?: string;  // Tên chi phí (do user nhập)
  donVi?: string;      // Người/Kg/Cái
  dinhMucLaoDong?: number; // Định mức lao động (do user nhập khi tạo định mức)
  donViDinhMucLaoDong?: string; // Đơn vị định mức lao động (Người/giờ, Kg/giờ, v.v.)
  soLuongNguyenLieu?: number; // Số lượng nguyên liệu cần hoàn thành (Kg)
  soPhutThucHien?: number;    // Số phút cần thực hiện xong
  soLuongKeHoach?: number;    // Số lượng nhân công/vật tư cần dùng - Kế hoạch
  soLuongThucTe?: number;     // Số lượng nhân công/vật tư cần dùng - Thực tế
  giaKeHoach?: number;        // Giá (VNĐ) - Kế hoạch
  thanhTienKeHoach?: number;  // Thành tiền (VNĐ) - Kế hoạch
  giaThucTe?: number;         // Giá (VNĐ) - Thực tế
  thanhTienThucTe?: number;   // Thành tiền (VNĐ) - Thực tế
}

export interface ProcessFlowchartSection {
  id?: string;
  phanDoan: string;
  tenPhanDoan?: string;
  noiDungCongViec?: string;
  fileUrl?: string;    // File đính kèm cho phân đoạn
  stt?: number;
  costs: ProcessFlowchartCost[];
}

export interface ProcessFlowchart {
  id: string;
  processId: string;
  sections: ProcessFlowchartSection[];
  createdAt: string;
  updatedAt: string;
}

export interface Process {
  id: string;
  maQuyTrinh: string;
  msnv: string;
  tenNhanVien: string;
  tenQuyTrinh: string;
  loaiQuyTrinh: string;
  createdAt: string;
  updatedAt: string;
  flowchart?: ProcessFlowchart; // Optional flowchart data for view details
}

export interface CreateProcessData {
  msnv: string;
  tenNhanVien: string;
  tenQuyTrinh: string;
  loaiQuyTrinh: string;
}

export interface UpdateProcessData {
  tenNhanVien?: string;
  tenQuyTrinh?: string;
  loaiQuyTrinh?: string;
  noiDungCongViec?: string;
  loaiChiPhi?: string;
  tenChiPhi?: string;
  dvt?: string;
}

export interface PaginatedResponse {
  success: boolean;
  data: Process[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface SingleResponse {
  success: boolean;
  data: Process;
  message?: string;
}

export interface GenerateCodeResponse {
  success: boolean;
  data: {
    code: string;
  };
}

export interface FlowchartResponse {
  success: boolean;
  data: ProcessFlowchart;
  message?: string;
}

const getAuthHeader = () => {
  const token = localStorage.getItem('accessToken');
  return {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
};

export const processService = {
  async getAllProcesses(page: number = 1, limit: number = 10, search?: string): Promise<PaginatedResponse> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    
    if (search) {
      params.append('search', search);
    }

    const response = await axios.get(`${API_URL}?${params.toString()}`, getAuthHeader());
    return response.data;
  },

  async getProcessById(id: string): Promise<SingleResponse> {
    const response = await axios.get(`${API_URL}/${id}`, getAuthHeader());
    return response.data;
  },

  async createProcess(data: CreateProcessData): Promise<SingleResponse> {
    const response = await axios.post(API_URL, data, getAuthHeader());
    return response.data;
  },

  async updateProcess(id: string, data: UpdateProcessData): Promise<SingleResponse> {
    const response = await axios.put(`${API_URL}/${id}`, data, getAuthHeader());
    return response.data;
  },

  async deleteProcess(id: string): Promise<{ success: boolean; message: string }> {
    const response = await axios.delete(`${API_URL}/${id}`, getAuthHeader());
    return response.data;
  },

  async generateProcessCode(): Promise<GenerateCodeResponse> {
    const response = await axios.get(`${API_URL}/generate-code`, getAuthHeader());
    return response.data;
  },

  // ==================== FLOWCHART OPERATIONS ====================

  async getFlowchart(processId: string): Promise<FlowchartResponse> {
    const response = await axios.get(`${API_URL}/${processId}/flowchart`, getAuthHeader());
    return response.data;
  },

  async createFlowchart(processId: string, sections: ProcessFlowchartSection[]): Promise<FlowchartResponse> {
    const response = await axios.post(`${API_URL}/${processId}/flowchart`, { sections }, getAuthHeader());
    return response.data;
  },

  async updateFlowchart(processId: string, sections: ProcessFlowchartSection[]): Promise<FlowchartResponse> {
    const response = await axios.put(`${API_URL}/${processId}/flowchart`, { sections }, getAuthHeader());
    return response.data;
  },

  async deleteFlowchart(processId: string): Promise<{ success: boolean; message: string }> {
    const response = await axios.delete(`${API_URL}/${processId}/flowchart`, getAuthHeader());
    return response.data;
  },
};

export default processService;

