import axios from 'axios';

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api');

// Get auth token from localStorage
const getAuthToken = () => {
  return localStorage.getItem('accessToken');
};

const getAuthHeaders = () => {
  const token = getAuthToken();
  return {
    Authorization: `Bearer ${token}`,
  };
};

export interface AcceptanceHandover {
  id: string;
  maNghiemThu: string;
  ngayNghiemThu: string;
  repairRequestId: number;
  maYeuCauSuaChua: string;
  tenHeThongThietBi: string;
  tinhTrangTruocSuaChua: string;
  tinhTrangSauSuaChua: string;
  nguoiBanGiao: string;
  nguoiNhan: string;
  fileDinhKem?: string;
  ghiChu?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAcceptanceHandoverRequest {
  repairRequestId: number;
  maYeuCauSuaChua: string;
  tenHeThongThietBi: string;
  tinhTrangTruocSuaChua: string;
  tinhTrangSauSuaChua: string;
  nguoiBanGiao: string;
  nguoiNhan: string;
  fileDinhKem?: string;
  ghiChu?: string;
}

class AcceptanceHandoverService {
  async getAllAcceptanceHandovers(page: number = 1, limit: number = 10, search?: string) {
    try {
      const params: any = { page, limit };
      if (search) {
        params.search = search;
      }

      const response = await axios.get(API_URL, {
        params,
        headers: getAuthHeaders(),
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Lỗi khi lấy danh sách nghiệm thu bàn giao');
    }
  }

  async getAcceptanceHandoverById(id: string) {
    try {
      const response = await axios.get(`${API_URL}/${id}`, {
        headers: getAuthHeaders(),
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Lỗi khi lấy thông tin nghiệm thu bàn giao');
    }
  }

  async createAcceptanceHandover(data: CreateAcceptanceHandoverRequest, file?: File) {
    try {
      const formData = new FormData();
      
      // Append all fields
      Object.keys(data).forEach((key) => {
        const value = (data as any)[key];
        if (value !== undefined && value !== null) {
          formData.append(key, value.toString());
        }
      });

      // Append file if exists
      if (file) {
        formData.append('file', file);
      }

      const response = await axios.post(API_URL, formData, {
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Lỗi khi tạo nghiệm thu bàn giao');
    }
  }

  async updateAcceptanceHandover(id: string, data: Partial<CreateAcceptanceHandoverRequest>, file?: File) {
    try {
      const formData = new FormData();
      
      // Append all fields
      Object.keys(data).forEach((key) => {
        const value = (data as any)[key];
        if (value !== undefined && value !== null) {
          formData.append(key, value.toString());
        }
      });

      // Append file if exists
      if (file) {
        formData.append('file', file);
      }

      const response = await axios.put(`${API_URL}/${id}`, formData, {
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Lỗi khi cập nhật nghiệm thu bàn giao');
    }
  }

  async deleteAcceptanceHandover(id: string) {
    try {
      const response = await axios.delete(`${API_URL}/${id}`, {
        headers: getAuthHeaders(),
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Lỗi khi xóa nghiệm thu bàn giao');
    }
  }

  async generateCode() {
    try {
      const response = await axios.get(`${API_URL}/generate-code`, {
        headers: getAuthHeaders(),
      });
      return response.data.data.code;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Lỗi khi tạo mã nghiệm thu bàn giao');
    }
  }
}

export default new AcceptanceHandoverService();

