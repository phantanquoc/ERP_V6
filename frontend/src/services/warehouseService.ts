import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.VITE_API_URL || 'http://localhost:5000/api') + '';

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

const getAuthHeaders = () => {
  const token = localStorage.getItem('accessToken');
  return { Authorization: `Bearer ${token}` };
};

const warehouseService = {
  // Warehouse APIs
  getAllWarehouses: () => axios.get(`${API_URL}/warehouses`, { headers: getAuthHeaders() }),
  generateWarehouseCode: () => axios.get(`${API_URL}/warehouses/generate-code`, { headers: getAuthHeaders() }),
  createWarehouse: (data: CreateWarehouseData) => axios.post(`${API_URL}/warehouses`, data, { headers: getAuthHeaders() }),
  deleteWarehouse: (id: string) => axios.delete(`${API_URL}/warehouses/${id}`, { headers: getAuthHeaders() }),

  // Lot APIs
  getLotsByWarehouse: (warehouseId: string) => axios.get(`${API_URL}/warehouses/${warehouseId}/lots`, { headers: getAuthHeaders() }),
  createLot: (data: CreateLotData) => axios.post(`${API_URL}/lots`, data, { headers: getAuthHeaders() }),
  deleteLot: (id: string) => axios.delete(`${API_URL}/lots/${id}`, { headers: getAuthHeaders() }),

  // Lot Product APIs
  getAllLotProducts: () => axios.get(`${API_URL}/lot-products`, { headers: getAuthHeaders() }),
  addProductToLot: (data: AddProductToLotData) => axios.post(`${API_URL}/lot-products`, data, { headers: getAuthHeaders() }),
  removeProductFromLot: (id: string) => axios.delete(`${API_URL}/lot-products/${id}`, { headers: getAuthHeaders() }),
  moveProductBetweenLots: (data: MoveProductData) => axios.put(`${API_URL}/lot-products/move`, data, { headers: getAuthHeaders() }),
  updateProductQuantity: (id: string, data: { soLuong?: number; donViTinh?: string; giaThanh?: number }) =>
    axios.put(`${API_URL}/lot-products/${id}`, data, { headers: getAuthHeaders() }),
};

export default warehouseService;

