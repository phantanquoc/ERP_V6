import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const API_URL = `${API_BASE}/purchase-requests`;

export interface PurchaseRequest {
  id: string;
  stt: number;
  ngayYeuCau: string;
  maYeuCau: string;
  employeeId: string;
  maNhanVien: string;
  tenNhanVien: string;
  phanLoai: string;
  tenHangHoa: string;
  soLuong: number;
  donViTinh: string;
  mucDichYeuCau: string;
  mucDoUuTien: string;
  ghiChu?: string;
  fileKemTheo?: string;
  trangThai: string;
  supplyRequestId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePurchaseRequestRequest {
  employeeId: string;
  maNhanVien: string;
  tenNhanVien: string;
  phanLoai: string;
  tenHangHoa: string;
  soLuong: number;
  donViTinh: string;
  mucDichYeuCau: string;
  mucDoUuTien: string;
  ghiChu?: string;
  fileKemTheo?: string;
  supplyRequestId?: string;
}

const getAuthHeader = () => {
  const token = localStorage.getItem('accessToken');
  return {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
};

class PurchaseRequestService {
  async getAllPurchaseRequests(page: number = 1, limit: number = 10, search?: string) {
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

  async getPurchaseRequestById(id: string) {
    const response = await axios.get(`${API_URL}/${id}`, getAuthHeader());
    return response.data;
  }

  async createPurchaseRequest(data: CreatePurchaseRequestRequest) {
    const response = await axios.post(API_URL, data, getAuthHeader());
    return response.data;
  }

  async generateCode() {
    const response = await axios.get(`${API_URL}/generate-code`, getAuthHeader());
    return response.data;
  }

  async updatePurchaseRequest(id: string, data: {
    phanLoai?: string;
    tenHangHoa?: string;
    soLuong?: number;
    donViTinh?: string;
    mucDichYeuCau?: string;
    mucDoUuTien?: string;
    ghiChu?: string;
    fileKemTheo?: string;
    trangThai?: string;
    nguoiDuyet?: string;
    ngayDuyet?: string;
    file?: File;
  }) {
    const formData = new FormData();

    if (data.phanLoai) formData.append('phanLoai', data.phanLoai);
    if (data.tenHangHoa) formData.append('tenHangHoa', data.tenHangHoa);
    if (data.soLuong !== undefined) formData.append('soLuong', data.soLuong.toString());
    if (data.donViTinh) formData.append('donViTinh', data.donViTinh);
    if (data.mucDichYeuCau) formData.append('mucDichYeuCau', data.mucDichYeuCau);
    if (data.mucDoUuTien) formData.append('mucDoUuTien', data.mucDoUuTien);
    if (data.ghiChu !== undefined) formData.append('ghiChu', data.ghiChu);
    if (data.trangThai) formData.append('trangThai', data.trangThai);
    if (data.nguoiDuyet !== undefined) formData.append('nguoiDuyet', data.nguoiDuyet);
    if (data.ngayDuyet) formData.append('ngayDuyet', data.ngayDuyet);

    // Append file if exists
    if (data.file) {
      formData.append('file', data.file);
    }

    const response = await axios.put(`${API_URL}/${id}`, formData, {
      ...getAuthHeader(),
      headers: {
        ...getAuthHeader().headers,
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  async deletePurchaseRequest(id: string) {
    const response = await axios.delete(`${API_URL}/${id}`, getAuthHeader());
    return response.data;
  }
}

export default new PurchaseRequestService();

