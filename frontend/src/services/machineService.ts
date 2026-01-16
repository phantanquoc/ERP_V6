import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

export interface Machine {
  id: string;
  maMay: string;
  tenMay: string;
  moTa?: string;
  trangThai: 'HOAT_DONG' | 'BẢO_TRÌ' | 'NGỪNG_HOẠT_ĐỘNG';
  ghiChu?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMachineRequest {
  tenMay: string;
  moTa?: string;
  trangThai?: 'HOAT_DONG' | 'BẢO_TRÌ' | 'NGỪNG_HOẠT_ĐỘNG';
  ghiChu?: string;
}

export interface UpdateMachineRequest {
  tenMay?: string;
  moTa?: string;
  trangThai?: 'HOAT_DONG' | 'BẢO_TRÌ' | 'NGỪNG_HOẠT_ĐỘNG';
  ghiChu?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

class MachineService {
  private getAuthToken(): string {
    return localStorage.getItem('accessToken') || '';
  }

  private getHeaders() {
    return {
      'Authorization': `Bearer ${this.getAuthToken()}`,
      'Content-Type': 'application/json',
    };
  }

  async getAllMachines(page: number = 1, limit: number = 100): Promise<PaginatedResponse<Machine>> {
    try {
      const response = await axios.get(`${API_BASE_URL}/machines`, {
        params: { page, limit },
        headers: this.getHeaders(),
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Lỗi tải danh sách máy');
    }
  }

  async getMachineById(id: string): Promise<Machine> {
    try {
      const response = await axios.get(`${API_BASE_URL}/machines/${id}`, {
        headers: this.getHeaders(),
      });
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Lỗi tải thông tin máy');
    }
  }

  async generateMachineCode(): Promise<string> {
    try {
      const response = await axios.get(`${API_BASE_URL}/machines/generate-code`, {
        headers: this.getHeaders(),
      });
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Lỗi tạo mã máy');
    }
  }

  async createMachine(data: CreateMachineRequest): Promise<Machine> {
    try {
      const response = await axios.post(`${API_BASE_URL}/machines`, data, {
        headers: this.getHeaders(),
      });
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Lỗi tạo máy mới');
    }
  }

  async updateMachine(id: string, data: UpdateMachineRequest): Promise<Machine> {
    try {
      const response = await axios.patch(`${API_BASE_URL}/machines/${id}`, data, {
        headers: this.getHeaders(),
      });
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Lỗi cập nhật máy');
    }
  }

  async deleteMachine(id: string): Promise<void> {
    try {
      await axios.delete(`${API_BASE_URL}/machines/${id}`, {
        headers: this.getHeaders(),
      });
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Lỗi xóa máy');
    }
  }
}

export default new MachineService();

