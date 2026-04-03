/**
 * Supply Adjustment Service — Điều chỉnh vật tư
 * CRUD + approval workflow API calls.
 */
import apiClient from './apiClient';

// ─── Types ───────────────────────────────────────────────────────────────────

export type SupplyAdjustmentStatus = 'CHO_DUYET' | 'DA_DUYET' | 'TU_CHOI';

export interface SupplyAdjustment {
  id: string;
  maDieuChinh: string;
  employeeId: string;
  loaiVatTu: string;
  tenVatTu: string;
  soLuongHienTai: number;
  soLuongDieuChinh: number;
  donViTinh: string;
  lyDo: string;
  trangThai: SupplyAdjustmentStatus;
  nguoiDuyetId?: string;
  ngayDuyet?: string;
  ghiChuQC?: string;
  lyDoTuChoi?: string;
  ngayDieuChinh: string;
  createdAt: string;
  updatedAt: string;
  employee?: {
    id: string;
    employeeCode: string;
    user: { firstName: string; lastName: string };
  };
}

export interface CreateSupplyAdjustmentData {
  loaiVatTu: string;
  tenVatTu: string;
  soLuongHienTai: number;
  soLuongDieuChinh: number;
  donViTinh: string;
  lyDo: string;
  ngayDieuChinh: string;
  ghiChuQC?: string;
}

export interface SupplyAdjustmentQuery {
  page?: number;
  limit?: number;
  trangThai?: string;
  search?: string;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const unwrap = <T>(response: any): T => {
  if (response?.data !== undefined) return response.data as T;
  return response as T;
};

const unwrapPaginated = (response: any): { data: SupplyAdjustment[]; pagination: Pagination } => ({
  data: Array.isArray(response?.data) ? response.data : [],
  pagination: response?.pagination || { page: 1, limit: 10, total: 0, totalPages: 0 },
});

// ─── Service ─────────────────────────────────────────────────────────────────

export const supplyAdjustmentService = {
  /**
   * Get all supply adjustments (role-aware: EMPLOYEE sees own only)
   */
  getAll: async (params: SupplyAdjustmentQuery = {}): Promise<{ data: SupplyAdjustment[]; pagination: Pagination }> => {
    const response = await apiClient.get('/supply-adjustments', { params });
    return unwrapPaginated(response);
  },

  /**
   * Get single supply adjustment by ID
   */
  getById: async (id: string): Promise<SupplyAdjustment> => {
    const response = await apiClient.get(`/supply-adjustments/${id}`);
    return unwrap<SupplyAdjustment>(response);
  },

  /**
   * Submit new supply adjustment request
   */
  create: async (data: CreateSupplyAdjustmentData): Promise<SupplyAdjustment> => {
    const response = await apiClient.post('/supply-adjustments', data);
    return unwrap<SupplyAdjustment>(response);
  },

  /**
   * Approve a supply adjustment (ADMIN/DEPARTMENT_HEAD/TEAM_LEAD only)
   */
  approve: async (id: string, ghiChuQC?: string): Promise<SupplyAdjustment> => {
    const response = await apiClient.patch(`/supply-adjustments/${id}/approve`, { ghiChuQC });
    return unwrap<SupplyAdjustment>(response);
  },

  /**
   * Reject a supply adjustment (ADMIN/DEPARTMENT_HEAD/TEAM_LEAD only)
   */
  reject: async (id: string, lyDoTuChoi: string): Promise<SupplyAdjustment> => {
    const response = await apiClient.patch(`/supply-adjustments/${id}/reject`, { lyDoTuChoi });
    return unwrap<SupplyAdjustment>(response);
  },
};

export default supplyAdjustmentService;
