import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const API_URL = `${API_BASE}/supply-requests`;

export interface SupplyRequest {
  id: string;
  stt: number;
  ngayYeuCau: string;
  maYeuCau: string;
  employeeId: string;
  maNhanVien: string;
  tenNhanVien: string;
  boPhan: string;
  phanLoai: string;
  tenGoi: string;
  soLuong: number;
  donViTinh: string;
  mucDichYeuCau: string;
  mucDoUuTien: string;
  ghiChu?: string;
  trangThai: string;
  fileKemTheo?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSupplyRequestRequest {
  employeeId: string;
  maNhanVien: string;
  tenNhanVien: string;
  boPhan: string;
  phanLoai: string;
  tenGoi: string;
  soLuong: number;
  donViTinh: string;
  mucDichYeuCau: string;
  mucDoUuTien: string;
  ghiChu?: string;
  trangThai?: string;
  fileKemTheo?: string;
}

export interface UpdateSupplyRequestRequest {
  phanLoai?: string;
  tenGoi?: string;
  soLuong?: number;
  donViTinh?: string;
  mucDichYeuCau?: string;
  mucDoUuTien?: string;
  ghiChu?: string;
  trangThai?: string;
  fileKemTheo?: string;
}

const getAuthHeader = () => {
  const token = localStorage.getItem('accessToken');
  return {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
};

class SupplyRequestService {
  async getAllSupplyRequests(page: number = 1, limit: number = 10, search?: string) {
    const params: any = { page, limit };
    if (search) {
      params.search = search;
    }

    const response = await axios.get(API_URL, {
      ...getAuthHeader(),
      params,
    });
    return response.data;
  }

  async getSupplyRequestById(id: string) {
    const response = await axios.get(`${API_URL}/${id}`, getAuthHeader());
    return response.data;
  }

  async createSupplyRequest(data: CreateSupplyRequestRequest) {
    const response = await axios.post(API_URL, data, getAuthHeader());
    return response.data;
  }

  async updateSupplyRequest(id: string, data: UpdateSupplyRequestRequest) {
    const response = await axios.put(`${API_URL}/${id}`, data, getAuthHeader());
    return response.data;
  }

  async deleteSupplyRequest(id: string) {
    const response = await axios.delete(`${API_URL}/${id}`, getAuthHeader());
    return response.data;
  }
}

export default new SupplyRequestService();

