import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || (import.meta.env.VITE_API_URL || 'http://localhost:5000/api') + '';
const API_URL = `${API_BASE}/international-products`;

export interface InternationalProduct {
  id: string;
  maSanPham: string;
  tenSanPham: string;
  moTaSanPham?: string;
  loaiSanPham?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProductData {
  maSanPham?: string;
  tenSanPham: string;
  moTaSanPham?: string;
  loaiSanPham?: string;
}

export interface UpdateProductData {
  tenSanPham?: string;
  moTaSanPham?: string;
  loaiSanPham?: string;
}

export interface PaginatedResponse {
  success: boolean;
  data: InternationalProduct[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface SingleResponse {
  success: boolean;
  data: InternationalProduct;
  message?: string;
}

export interface GenerateCodeResponse {
  success: boolean;
  data: {
    code: string;
  };
}

const getAuthHeader = () => {
  const token = localStorage.getItem('accessToken');
  return {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
};

export const internationalProductService = {
  async getAllProducts(page: number = 1, limit: number = 10, search?: string): Promise<PaginatedResponse> {
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

  async getProductById(id: string): Promise<SingleResponse> {
    const response = await axios.get(`${API_URL}/${id}`, getAuthHeader());
    return response.data;
  },

  async getProductByCode(code: string): Promise<SingleResponse> {
    const response = await axios.get(`${API_URL}/code/${code}`, getAuthHeader());
    return response.data;
  },

  async createProduct(data: CreateProductData): Promise<SingleResponse> {
    const response = await axios.post(API_URL, data, getAuthHeader());
    return response.data;
  },

  async updateProduct(id: string, data: UpdateProductData): Promise<SingleResponse> {
    const response = await axios.patch(`${API_URL}/${id}`, data, getAuthHeader());
    return response.data;
  },

  async deleteProduct(id: string): Promise<{ success: boolean; message: string }> {
    const response = await axios.delete(`${API_URL}/${id}`, getAuthHeader());
    return response.data;
  },

  async generateProductCode(): Promise<GenerateCodeResponse> {
    const response = await axios.get(`${API_URL}/generate-code`, getAuthHeader());
    return response.data;
  },
};

export default internationalProductService;

