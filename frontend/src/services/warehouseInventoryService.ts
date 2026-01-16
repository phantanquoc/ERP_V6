import axios from 'axios';

const API_URL = 'http://localhost:5000/api/warehouse-inventory';

export interface InternationalProduct {
  id: string;
  maSanPham: string;
  tenSanPham: string;
  moTaSanPham?: string;
}

export interface WarehouseInventory {
  id: string;
  productId: string;
  product: InternationalProduct;
  soLuongTon: number;
  donVi: string;
  giaTriTon: number;
  viTriKho?: string;
  ngayNhapGanNhat?: string;
  hanSuDung?: string;
  trangThai: string;
  mucCanhBao: number;
  nhaCungCap?: string;
  ghiChu?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWarehouseInventoryRequest {
  productId: string;
  soLuongTon: number;
  donVi?: string;
  giaTriTon?: number;
  viTriKho?: string;
  ngayNhapGanNhat?: string;
  hanSuDung?: string;
  trangThai?: string;
  mucCanhBao?: number;
  nhaCungCap?: string;
  ghiChu?: string;
}

export interface UpdateWarehouseInventoryRequest {
  soLuongTon?: number;
  donVi?: string;
  giaTriTon?: number;
  viTriKho?: string;
  ngayNhapGanNhat?: string;
  hanSuDung?: string;
  trangThai?: string;
  mucCanhBao?: number;
  nhaCungCap?: string;
  ghiChu?: string;
}

const getAuthHeader = () => {
  const token = localStorage.getItem('accessToken');
  return {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
};

class WarehouseInventoryService {
  async getAllInventory(page: number = 1, limit: number = 10, search?: string) {
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

  async getInventoryById(id: string) {
    const response = await axios.get(`${API_URL}/${id}`, getAuthHeader());
    return response.data;
  }

  async createInventory(data: CreateWarehouseInventoryRequest) {
    const response = await axios.post(API_URL, data, getAuthHeader());
    return response.data;
  }

  async updateInventory(id: string, data: UpdateWarehouseInventoryRequest) {
    const response = await axios.put(`${API_URL}/${id}`, data, getAuthHeader());
    return response.data;
  }

  async deleteInventory(id: string) {
    const response = await axios.delete(`${API_URL}/${id}`, getAuthHeader());
    return response.data;
  }

  async getInventoryByProductName(productName: string) {
    const response = await axios.get(`${API_URL}/by-product-name`, {
      ...getAuthHeader(),
      params: { productName },
    });
    return response.data;
  }
}

export default new WarehouseInventoryService();

