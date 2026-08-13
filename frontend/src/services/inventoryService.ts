import apiClient from './apiClient';

export interface InventoryFilters {
  search?: string;
  loaiSanPham?: string;
  warehouseId?: string;
  donViTinh?: string;
  page?: number;
  limit?: number;
}

export interface WarehouseStockDetail {
  warehouseId: string;
  tenKho: string;
  soLuong: number;
}

export interface InventoryItem {
  id: string;
  maSanPham: string;
  tenSanPham: string;
  loaiSanPham: string | null;
  donViTinh: string | null;
  tongTonKho: number;
  chiTietTheoKho: WarehouseStockDetail[];
}

export interface InventoryOverviewResponse {
  data: InventoryItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const inventoryService = {
  async getInventoryOverview(params: InventoryFilters) {
    const query = new URLSearchParams();
    if (params.search) query.append('search', params.search);
    if (params.loaiSanPham) query.append('loaiSanPham', params.loaiSanPham);
    if (params.warehouseId) query.append('warehouseId', params.warehouseId);
    if (params.donViTinh) query.append('donViTinh', params.donViTinh);
    if (params.page) query.append('page', String(params.page));
    if (params.limit) query.append('limit', String(params.limit));

    const qs = query.toString();
    return apiClient.get<InventoryOverviewResponse>(`/inventory/overview${qs ? `?${qs}` : ''}`);
  },
};

export default inventoryService;
