import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const API_URL = `${API_BASE}/suppliers`;

export interface Supplier {
  id: string;
  maNhaCungCap: string;
  tenNhaCungCap: string;
  loaiCungCap: string;
  quocGia: string;
  website?: string;
  nguoiLienHe: string;
  soDienThoai: string;
  emailLienHe: string;
  diaChi: string;
  khaNang?: string;
  loaiHinh: string;
  trangThai: string;
  doanhChi?: number;
  employeeId: string;
  employee?: {
    id: string;
    user: {
      firstName: string;
      lastName: string;
    };
  };
  createdAt: string;
  updatedAt: string;
}

export interface CreateSupplierData {
  maNhaCungCap: string;
  tenNhaCungCap: string;
  loaiCungCap: string;
  quocGia: string;
  website?: string;
  nguoiLienHe: string;
  soDienThoai: string;
  emailLienHe: string;
  diaChi: string;
  khaNang?: string;
  loaiHinh: string;
  trangThai?: string;
  doanhChi?: number;
  employeeId: string;
}

export interface UpdateSupplierData {
  tenNhaCungCap?: string;
  loaiCungCap?: string;
  quocGia?: string;
  website?: string;
  nguoiLienHe?: string;
  soDienThoai?: string;
  emailLienHe?: string;
  diaChi?: string;
  khaNang?: string;
  loaiHinh?: string;
  trangThai?: string;
  doanhChi?: number;
}

export const supplierService = {
  // Get all suppliers with pagination
  async getAllSuppliers(page: number = 1, limit: number = 10, search?: string) {
    const params: any = { page, limit };
    if (search) params.search = search;
    
    const response = await axios.get(API_URL, { params });
    return response.data;
  },

  // Get supplier by ID
  async getSupplierById(id: string) {
    const response = await axios.get(`${API_URL}/${id}`);
    return response.data;
  },

  // Generate next supplier code
  async generateCode() {
    const response = await axios.get(`${API_URL}/generate-code`);
    return response.data;
  },

  // Create new supplier
  async createSupplier(data: CreateSupplierData) {
    const response = await axios.post(API_URL, data);
    return response.data;
  },

  // Update supplier
  async updateSupplier(id: string, data: UpdateSupplierData) {
    const response = await axios.put(`${API_URL}/${id}`, data);
    return response.data;
  },

  // Delete supplier
  async deleteSupplier(id: string) {
    const response = await axios.delete(`${API_URL}/${id}`);
    return response.data;
  },
};

