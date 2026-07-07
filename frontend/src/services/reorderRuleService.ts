import apiClient from './apiClient';

export interface ReorderRule {
  id: string;
  internationalProductId: string;
  minStock: number;
  reorderQty: number;
  preferredSupplierId?: string | null;
  active: boolean;
  cooldownHours: number;
  lastAlertedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  internationalProduct?: {
    id: string;
    maSanPham: string;
    tenSanPham: string;
    donViTinh?: string | null;
  };
}

export interface CreateReorderRuleRequest {
  internationalProductId: string;
  minStock: number;
  reorderQty: number;
  preferredSupplierId?: string;
  active?: boolean;
  cooldownHours?: number;
}

export interface UpdateReorderRuleRequest {
  minStock?: number;
  reorderQty?: number;
  preferredSupplierId?: string | null;
  active?: boolean;
  cooldownHours?: number;
}

class ReorderRuleService {
  async getAll(
    page: number = 1,
    limit: number = 20,
    search?: string,
    activeOnly?: boolean
  ) {
    const params: any = { page, limit };
    if (search) params.search = search;
    if (activeOnly) params.activeOnly = 'true';
    const response = await apiClient.get('/reorder-rules', { params });
    return response;
  }

  async getById(id: string) {
    const response = await apiClient.get(`/reorder-rules/${id}`);
    return response;
  }

  async getByProduct(productId: string) {
    const response = await apiClient.get(`/reorder-rules/by-product/${productId}`);
    return response;
  }

  async create(data: CreateReorderRuleRequest) {
    const response = await apiClient.post('/reorder-rules', data);
    return response;
  }

  async update(id: string, data: UpdateReorderRuleRequest) {
    const response = await apiClient.put(`/reorder-rules/${id}`, data);
    return response;
  }

  async delete(id: string) {
    const response = await apiClient.delete(`/reorder-rules/${id}`);
    return response;
  }
}

export default new ReorderRuleService();
