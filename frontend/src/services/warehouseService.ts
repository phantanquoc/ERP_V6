import apiClient from './apiClient';

export interface Warehouse {
  id: string;
  maKho: string;
  tenKho: string;
  loaiKho?: string;
  diaChi?: string;
  dienTich?: number;
  sucChua?: number;
  nguoiQuanLy?: string;
  soDienThoai?: string;
  trangThai: string;
  ghiChu?: string;
  createdAt: string;
  updatedAt: string;
  lots?: Lot[];
}

export interface Lot {
  id: string;
  tenLo: string;
  warehouseId: string;
  createdAt: string;
  updatedAt: string;
  lotProducts?: LotProduct[];
  warehouse?: Warehouse;
}

export interface LotProduct {
  id: string;
  lotId: string;
  internationalProductId: string;
  soLuong: number;
  donViTinh: string;
  giaThanh?: number; // Giá thành/đơn vị (VND)
  createdAt: string;
  updatedAt: string;
  internationalProduct?: {
    id: string;
    maSanPham: string;
    tenSanPham: string;
    moTaSanPham?: string;
    loaiSanPham?: string;
  };
  lot?: Lot;
}

export interface CreateWarehouseData {
  maKho?: string;
  tenKho: string;
}

export interface CreateLotData {
  tenLo: string;
  warehouseId: string;
}

export interface AddProductToLotData {
  lotId: string;
  internationalProductId: string;
  soLuong: number;
  donViTinh: string;
}

export interface MoveProductData {
  lotProductId: string;
  targetLotId: string;
}

const warehouseService = {
  // Warehouse APIs
  getAllWarehouses: () => apiClient.get('/warehouses'),
  generateWarehouseCode: () => apiClient.get('/warehouses/generate-code'),
  createWarehouse: (data: CreateWarehouseData) => apiClient.post('/warehouses', data),
  deleteWarehouse: (id: string) => apiClient.delete(`/warehouses/${id}`),

  // Lot APIs
  getLotsByWarehouse: (warehouseId: string) => apiClient.get(`/warehouses/${warehouseId}/lots`),
  createLot: (data: CreateLotData) => apiClient.post('/lots', data),
  deleteLot: (id: string) => apiClient.delete(`/lots/${id}`),

  // Lot Product APIs
  getAllLotProducts: () => apiClient.get('/lot-products'),
  addProductToLot: (data: AddProductToLotData) => apiClient.post('/lot-products', data),
  removeProductFromLot: (id: string) => apiClient.delete(`/lot-products/${id}`),
  moveProductBetweenLots: (data: MoveProductData) => apiClient.put('/lot-products/move', data),
  updateProductQuantity: (id: string, data: { soLuong?: number; donViTinh?: string; giaThanh?: number }) =>
    apiClient.put(`/lot-products/${id}`, data),
};

export default warehouseService;

