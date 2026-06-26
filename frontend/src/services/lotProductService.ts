import apiClient from './apiClient';
import type { InternationalProduct } from './internationalProductService';

export interface Warehouse {
  id: string;
  maKho: string;
  tenKho: string;
  loaiKho?: string;
  trangThai: string;
}

export interface Lot {
  id: string;
  tenLo: string;
  warehouseId: string;
  createdAt: string;
  updatedAt: string;
  warehouse?: Warehouse;
}

export interface LotProduct {
  id: string;
  lotId: string;
  internationalProductId: string;
  soLuong: number;
  donViTinh: string;
  giaThanh?: number;
  createdAt: string;
  updatedAt: string;
  internationalProduct?: InternationalProduct;
  lot?: Lot;
}

export interface LotsResponse {
  success: boolean;
  data: Lot[];
}

export interface KienResponse {
  success: boolean;
  data: LotProduct[];
}

export const lotProductKeys = {
  all: ['lotProducts'] as const,
  lists: () => [...lotProductKeys.all, 'list'] as const,
  list: (filters: Record<string, any>) => [...lotProductKeys.lists(), filters] as const,
  lots: (internationalProductId: string) => [...lotProductKeys.all, 'lots', internationalProductId] as const,
  kien: (internationalProductId: string, lotId: string) => [...lotProductKeys.all, 'kien', internationalProductId, lotId] as const,
};

const lotProductService = {
  async getLotsByProduct(internationalProductId: string): Promise<LotsResponse> {
    const response = await apiClient.get('/lot-products/lots', {
      params: { internationalProductId },
    });
    return response as unknown as LotsResponse;
  },

  async getKienByProductAndLot(internationalProductId: string, lotId: string): Promise<KienResponse> {
    const response = await apiClient.get('/lot-products/kien', {
      params: { internationalProductId, lotId },
    });
    return response as unknown as KienResponse;
  },
};

export default lotProductService;
