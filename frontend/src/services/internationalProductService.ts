import apiClient from './apiClient';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

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

export const internationalProductService = {
  async getAllProducts(page: number = 1, limit: number = 10, search?: string): Promise<PaginatedResponse> {
    const params: Record<string, any> = { page, limit };
    if (search) params.search = search;

    const response = await apiClient.get('/international-products', { params });
    return response as unknown as PaginatedResponse;
  },

  async getProductById(id: string): Promise<SingleResponse> {
    const response = await apiClient.get(`/international-products/${id}`);
    return response as unknown as SingleResponse;
  },

  async getProductByCode(code: string): Promise<SingleResponse> {
    const response = await apiClient.get(`/international-products/code/${code}`);
    return response as unknown as SingleResponse;
  },

  async createProduct(data: CreateProductData): Promise<SingleResponse> {
    const response = await apiClient.post('/international-products', data);
    return response as unknown as SingleResponse;
  },

  async updateProduct(id: string, data: UpdateProductData): Promise<SingleResponse> {
    const response = await apiClient.patch(`/international-products/${id}`, data);
    return response as unknown as SingleResponse;
  },

  async deleteProduct(id: string): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.delete(`/international-products/${id}`);
    return response as unknown as { success: boolean; message: string };
  },

  async generateProductCode(): Promise<GenerateCodeResponse> {
    const response = await apiClient.get('/international-products/generate-code');
    return response as unknown as GenerateCodeResponse;
  },

  async exportToExcel(filters?: { search?: string }): Promise<void> {
    const token = localStorage.getItem('accessToken');
    const params = new URLSearchParams();
    if (filters?.search) params.append('search', filters.search);

    const url = `${API_BASE_URL}/international-products/export/excel${params.toString() ? `?${params.toString()}` : ''}`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new Error('Failed to export to Excel');
    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `san-pham-quoc-te-${Date.now()}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  },
};

export default internationalProductService;

