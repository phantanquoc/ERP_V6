import apiClient from './apiClient';

// ─── Types ───────────────────────────────────────────────────────────────────

export type SoakingPlanStatus = 'HIEU_LUC' | 'DA_DUNG' | 'HUY';

export interface SoakingPlan {
  id: string;
  orderId: string;
  orderItemId: string;
  productId: string;
  maSanPham: string;
  tenSanPham: string;
  soLanNgam: number;
  nhietDoNuocTruocNgam: number;
  nhietDoNuocSauVot: number;
  thoiGianNgam: number;
  brixNuocNgam: number;
  khoiLuong: number;
  trangThai: SoakingPlanStatus;
  createdById?: string | null;
  createdAt: string;
  updatedAt: string;
  order?: { maDonHang: string; tenKhachHang: string };
}

export interface CreateSoakingPlanInput {
  orderId: string;
  orderItemId: string;
  productId: string;
  soLanNgam: number;
  nhietDoNuocTruocNgam: number;
  nhietDoNuocSauVot: number;
  thoiGianNgam: number;
  brixNuocNgam: number;
  khoiLuong: number;
}

export interface UpdateSoakingPlanInput {
  soLanNgam?: number;
  nhietDoNuocTruocNgam?: number;
  nhietDoNuocSauVot?: number;
  thoiGianNgam?: number;
  brixNuocNgam?: number;
  khoiLuong?: number;
}

export interface PlannableOrder {
  id: string;
  maDonHang: string;
  tenKhachHang: string;
  ngayDatHang: string;
  trangThaiSanXuat: string;
  items: PlannableOrderItem[];
}

export interface PlannableOrderItem {
  id: string;
  productId: string;
  maSanPham: string;
  tenHangHoa: string;
  soLuong: number;
  donVi: string;
}

export interface ListFilters {
  page?: number;
  limit?: number;
  orderId?: string;
  productId?: string;
  trangThai?: SoakingPlanStatus;
}

// ─── API Functions ───────────────────────────────────────────────────────────

const BASE_PATH = '/soaking-plans';

async function createSoakingPlan(input: CreateSoakingPlanInput): Promise<SoakingPlan> {
  const res = await apiClient.post(BASE_PATH, input);
  return res.data;
}

async function updateSoakingPlan(id: string, input: UpdateSoakingPlanInput): Promise<SoakingPlan> {
  const res = await apiClient.put(`${BASE_PATH}/${id}`, input);
  return res.data;
}

async function cancelSoakingPlan(id: string): Promise<SoakingPlan> {
  const res = await apiClient.patch(`${BASE_PATH}/${id}/cancel`, {});
  return res.data;
}

async function listSoakingPlans(filters?: ListFilters) {
  const params: Record<string, any> = {};
  if (filters?.page) params.page = filters.page;
  if (filters?.limit) params.limit = filters.limit;
  if (filters?.orderId) params.orderId = filters.orderId;
  if (filters?.productId) params.productId = filters.productId;
  if (filters?.trangThai) params.trangThai = filters.trangThai;

  const res = await apiClient.get(BASE_PATH, { params });
  return { data: res.data as SoakingPlan[], pagination: res.pagination };
}

async function getActiveByProductId(productId: string): Promise<{ data: SoakingPlan[] }> {
  const res = await apiClient.get(`${BASE_PATH}/active-by-product/${productId}`);
  return { data: res.data as SoakingPlan[] };
}

async function listPlannableOrders(page = 1, limit = 20) {
  const res = await apiClient.get(`${BASE_PATH}/plannable-orders`, { params: { page, limit } });
  return { data: res.data as PlannableOrder[], pagination: res.pagination };
}

const soakingPlanService = {
  createSoakingPlan,
  updateSoakingPlan,
  cancelSoakingPlan,
  listSoakingPlans,
  getActiveByProductId,
  listPlannableOrders,
};

export default soakingPlanService;
