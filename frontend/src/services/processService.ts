 import apiClient from './apiClient';
import { downloadFile } from '../utils/downloadFile';

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

export const processService = {
  async getAllProcesses(page: number = 1, limit: number = 10, search?: string): Promise<PaginatedResponse> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    
    if (search) {
      params.append('search', search);
    }

     const response = await apiClient.get(`/processes?${params.toString()}`);
     return response as unknown as PaginatedResponse;
  },

  async getProcessById(id: string): Promise<SingleResponse> {
     const response = await apiClient.get(`/processes/${id}`);
     return response as unknown as SingleResponse;
  },

  async createProcess(data: CreateProcessData): Promise<SingleResponse> {
     const response = await apiClient.post('/processes', data);
     return response as unknown as SingleResponse;
  },

  async updateProcess(id: string, data: UpdateProcessData): Promise<SingleResponse> {
     const response = await apiClient.put(`/processes/${id}`, data);
     return response as unknown as SingleResponse;
  },

  async deleteProcess(id: string): Promise<{ success: boolean; message: string }> {
     const response = await apiClient.delete(`/processes/${id}`);
     return response as unknown as { success: boolean; message: string };
  },

  async generateProcessCode(): Promise<GenerateCodeResponse> {
     const response = await apiClient.get('/processes/generate-code');
     return response as unknown as GenerateCodeResponse;
  },

  // ==================== FLOWCHART OPERATIONS ====================

  async getFlowchart(processId: string): Promise<FlowchartResponse> {
     const response = await apiClient.get(`/processes/${processId}/flowchart`);
     return response as unknown as FlowchartResponse;
  },

  async createFlowchart(processId: string, sections: ProcessFlowchartSection[]): Promise<FlowchartResponse> {
     const response = await apiClient.post(`/processes/${processId}/flowchart`, { sections });
     return response as unknown as FlowchartResponse;
  },

  async updateFlowchart(processId: string, sections: ProcessFlowchartSection[]): Promise<FlowchartResponse> {
     const response = await apiClient.put(`/processes/${processId}/flowchart`, { sections });
     return response as unknown as FlowchartResponse;
  },

  async deleteFlowchart(processId: string): Promise<{ success: boolean; message: string }> {
     const response = await apiClient.delete(`/processes/${processId}/flowchart`);
     return response as unknown as { success: boolean; message: string };
  },

  async uploadSectionFile(file: File): Promise<{ success: boolean; data: { fileUrl: string; fileName: string } }> {
    const formData = new FormData();
    formData.append('file', file);

     const response = await apiClient.post('/processes/upload-file', formData);
     return response as unknown as { success: boolean; data: { fileUrl: string; fileName: string } };
  },

  async exportToExcel(): Promise<void> {
    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    const url = `${API_BASE_URL}/processes/export/excel`;
    await downloadFile(url, `danh-sach-quy-trinh-${Date.now()}.xlsx`);
  },
};

export default processService;

