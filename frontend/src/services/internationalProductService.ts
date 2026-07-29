import apiClient from './apiClient';
import { API_BASE_URL } from '../config/api';

export interface InternationalProduct {
  id: string;
  maSanPham: string;
  tenSanPham: string;
  moTaSanPham?: string;
  loaiSanPham?: string;
  donViTinh?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RawMaterialsResponse {
  success: boolean;
  data: InternationalProduct[];
}

export interface CreateProductData {
  maSanPham?: string;
  tenSanPham: string;
  moTaSanPham?: string;
  loaiSanPham?: string;
  donViTinh?: string;
}

export interface UpdateProductData {
  // The code is user-editable, so updates may carry it.
  maSanPham?: string;
  tenSanPham?: string;
  moTaSanPham?: string;
  loaiSanPham?: string;
  donViTinh?: string;
}

export interface RenameCategoryPreview {
  oldAbbr: string;
  newAbbr: string;
  /** Products whose code will be rewritten to the new prefix. */
  changes: Array<{ id: string; tenSanPham: string; maCu: string; maMoi: string }>;
  /** Products keeping their code — legacy formats, or an unchanged abbreviation. */
  unchanged: Array<{ id: string; tenSanPham: string; maCu: string }>;
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

export interface ProductStockLot {
  lotId: string;
  lotName: string;
  warehouseName: string;
  quantity: number;
  unit: string;
}

export interface ProductStockSummary {
  totalQuantity: number;
  unit: string | null;
  lotDetails: ProductStockLot[];
}

export interface GenerateCodeResponse {
  success: boolean;
  data: {
    code: string;
  };
}

export const internationalProductService = {
  async getAllProducts(
    page: number = 1,
    limit: number = 10,
    search?: string,
    loaiSanPham?: string,
    options?: {
      maSanPham?: string;
      tenSanPham?: string;
      donViTinh?: string;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    }
  ): Promise<PaginatedResponse> {
    const params: Record<string, any> = { page, limit };
    if (search) params.search = search;
    if (loaiSanPham) params.loaiSanPham = loaiSanPham;
    // Column filters and sort are resolved server-side; empty values are dropped so the
    // URL stays readable and the backend falls back to its defaults.
    if (options?.maSanPham) params.maSanPham = options.maSanPham;
    if (options?.tenSanPham) params.tenSanPham = options.tenSanPham;
    if (options?.donViTinh) params.donViTinh = options.donViTinh;
    if (options?.sortBy) params.sortBy = options.sortBy;
    if (options?.sortOrder) params.sortOrder = options.sortOrder;

    const response = await apiClient.get('/international-products', { params });
    return response as unknown as PaginatedResponse;
  },

  async getProductById(id: string): Promise<SingleResponse> {
    const response = await apiClient.get(`/international-products/${id}`);
    return response as unknown as SingleResponse;
  },

  async getStockSummary(id: string): Promise<{ success: boolean; data: ProductStockSummary }> {
    const response = await apiClient.get(`/international-products/${id}/stock`);
    return response as unknown as { success: boolean; data: ProductStockSummary };
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

  /**
   * Ask for a suggested code. The code is LOAI-STT-TENVIETTAT, so it needs both the
   * product name and its category; without a category the server returns an empty code.
   */
  async generateProductCode(tenSanPham?: string, loaiSanPham?: string): Promise<GenerateCodeResponse> {
    const params: Record<string, string> = {};
    if (tenSanPham) params.tenSanPham = tenSanPham;
    if (loaiSanPham) params.loaiSanPham = loaiSanPham;
    const response = await apiClient.get('/international-products/generate-code', { params });
    return response as unknown as GenerateCodeResponse;
  },

  async exportToExcel(filters?: {
    search?: string;
    loaiSanPham?: string;
    maSanPham?: string;
    tenSanPham?: string;
    donViTinh?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<void> {
    const token = localStorage.getItem('accessToken');
    const params = new URLSearchParams();
    // Mirror the list params so the downloaded file matches the current view.
    if (filters?.search) params.append('search', filters.search);
    if (filters?.loaiSanPham) params.append('loaiSanPham', filters.loaiSanPham);
    if (filters?.maSanPham) params.append('maSanPham', filters.maSanPham);
    if (filters?.tenSanPham) params.append('tenSanPham', filters.tenSanPham);
    if (filters?.donViTinh) params.append('donViTinh', filters.donViTinh);
    if (filters?.sortBy) params.append('sortBy', filters.sortBy);
    if (filters?.sortOrder) params.append('sortOrder', filters.sortOrder);

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
  async getCategories(): Promise<{ success: boolean; data: string[] }> {
    const response = await apiClient.get('/international-products/categories');
    return response as unknown as { success: boolean; data: string[] };
  },

  async addCategory(name: string): Promise<{ success: boolean; data: any; message: string }> {
    const response = await apiClient.post('/international-products/categories', { name });
    return response as unknown as { success: boolean; data: any; message: string };
  },

  /**
   * What a rename would do to product codes, without saving. Renaming a category
   * changes its abbreviation, which is the code prefix, so this is shown for
   * confirmation before the bulk rewrite.
   */
  async previewRenameCategory(oldName: string, newName: string): Promise<{
    success: boolean;
    data: RenameCategoryPreview;
  }> {
    const response = await apiClient.post('/international-products/categories/rename-preview', { oldName, newName });
    return response as unknown as { success: boolean; data: RenameCategoryPreview };
  },

  async renameCategory(oldName: string, newName: string): Promise<{ success: boolean; data: { count: number; codesUpdated: number }; message: string }> {
    const response = await apiClient.put('/international-products/categories/rename', { oldName, newName });
    return response as unknown as { success: boolean; data: { count: number; codesUpdated: number }; message: string };
  },

  async deleteCategory(name: string): Promise<{ success: boolean; data: { count: number }; message: string }> {
    const response = await apiClient.post('/international-products/categories/delete', { name });
    return response as unknown as { success: boolean; data: { count: number }; message: string };
  },

  async getRawMaterials(): Promise<RawMaterialsResponse> {
    const response = await apiClient.get('/international-products/raw-materials');
    return response as unknown as RawMaterialsResponse;
  },
};

export default internationalProductService;

