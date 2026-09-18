import apiClient from './apiClient';
import { API_BASE_URL } from '../config/api';

export interface SupplyRequestItem {
  id: string;
  supplyRequestId: string;
  phanLoai: string;
  tenGoi: string;
  soLuong: number;
  donViTinh: string;
  isNewProduct?: boolean;
  fulfilledQty?: number;
  fulfillmentStatus?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SupplyRequestDecision {
  id: string;
  supplyRequestItemId: string;
  decision: string;
  fulfilledQty: number;
  shortageQty: number;
  reason?: string;
  decidedByEmployeeId: string;
  decidedAt: string;
  triggeredPurchaseRequestId?: string;
  createdAt: string;
  updatedAt: string;
  item?: {
    id: string;
    tenGoi: string;
    phanLoai: string;
    soLuong: number;
    donViTinh: string;
  };
}

export interface PartialFulfillPayload {
  fulfilledQty: number;
  reason?: string;
  decidedByEmployeeId: string;
  routeShortageToPurchase?: boolean;
  lotProductId?: string;
  warehouseId?: string;
  lotId?: string;
  autoCreateProduct?: boolean;
}

export interface SupplyRequest {
  id: string;
  stt: number;
  ngayYeuCau: string;
  maYeuCau: string;
  employeeId: string;
  maNhanVien: string;
  tenNhanVien: string;
  boPhan: string;
  mucDichYeuCau: string;
  mucDoUuTien: string;
  ghiChu?: string;
  trangThai: string;
  /** Set by the cancel action; the ticket stays in the list so nothing silently vanishes. */
  lyDoHuy?: string | null;
  ngayHuy?: string | null;
  nguoiHuy?: string | null;
  fileKemTheo?: string;
  loaiYeuCau?: string;
  soTien?: number;
  createdAt: string;
  updatedAt: string;
  items: SupplyRequestItem[];
  /**
   * YCMH attached to this request. `items` carries what purchasing actually bought
   * (quantity per line), which is what the receipt modal prefills from — the supply
   * request's own quantities can legitimately differ (over-ordering, and lines the
   * warehouse added by hand to the YCBS that the request never mentioned).
   * Legacy `sourceType='SHORTAGE'` rows are pre-YCBS shortages; both render as chips.
   */
  purchaseRequests?: Array<{
    id: string; trangThai: string; maYeuCau: string; sourceType?: string;
    /** Cancel metadata — the backend selects these on both the list and the detail. */
    lyDoHuy?: string | null; ngayHuy?: string | null; nguoiHuy?: string | null;
    items?: Array<{ tenHangHoa: string; soLuong: number; donViTinh?: string | null }>;
  }>;
  replenishmentRequests?: Array<{
    id: string; maYeuCau: string; trangThai: string; phanLoaiGroup?: string | null;
    lyDoHuy?: string | null; ngayHuy?: string | null; nguoiHuy?: string | null;
    convertedPurchaseRequest?: { id: string; maYeuCau: string } | null;
  }>;
  warehouseReceipts?: Array<{ id: string; maPhieuNhap: string; purchaseRequestId?: string | null }>;
}

export interface CreateSupplyRequestRequest {
  employeeId: string;
  maNhanVien: string;
  tenNhanVien: string;
  boPhan: string;
  items: { phanLoai: string; tenGoi: string; soLuong: number; donViTinh: string }[];
  mucDichYeuCau: string;
  mucDoUuTien: string;
  ghiChu?: string;
  fileKemTheo?: string;
  loaiYeuCau?: string;
  soTien?: number;
}

export interface UpdateSupplyRequestRequest {
  /**
   * `id` ties each line back to its existing SupplyRequestItem so the server can
   * preserve `fulfilledQty` / `fulfillmentStatus`; lines without an `id` are new.
   * The server rejects edits that would erase fulfilment audit (dropping a line
   * already issued, or lowering quantity below what was delivered).
   */
  items?: { id?: string; phanLoai: string; tenGoi: string; soLuong: number; donViTinh: string; isNewProduct?: boolean }[];
  mucDichYeuCau?: string;
  mucDoUuTien?: string;
  ghiChu?: string;
  fileKemTheo?: string;
}

export interface BatchFulfillLine {
  itemId: string;
  fulfilledQty: number;
  reason?: string;
  decidedByEmployeeId: string;
  routeShortageToPurchase?: boolean;
  lotProductId?: string;
  warehouseId?: string;
  lotId?: string;
  autoCreateProduct?: boolean;
}

export interface BatchFulfillResult {
  success: boolean;
  decisionsCount: number;
  createdPurchaseRequests: { id: string; maYeuCau: string; bucket: string }[];
}

export interface SupplyRequestListFilters {
  search?: string;
  maYeuCau?: string;
  tenNhanVien?: string;
  boPhan?: string;
  phanLoai?: string;
  trangThai?: string;
  mucDoUuTien?: string;
}

class SupplyRequestService {
  async getAllSupplyRequests(page: number = 1, limit: number = 10, filters?: SupplyRequestListFilters) {
    const params: Record<string, unknown> = { page, limit };
    if (filters?.search) params.search = filters.search;
    if (filters?.maYeuCau) params.maYeuCau = filters.maYeuCau;
    if (filters?.tenNhanVien) params.tenNhanVien = filters.tenNhanVien;
    if (filters?.boPhan) params.boPhan = filters.boPhan;
    if (filters?.phanLoai) params.phanLoai = filters.phanLoai;
    if (filters?.trangThai) params.trangThai = filters.trangThai;
    if (filters?.mucDoUuTien) params.mucDoUuTien = filters.mucDoUuTien;

    const response = await apiClient.get('/supply-requests', { params });
    return response;
  }

  async getSupplyRequestById(id: string) {
    const response = await apiClient.get(`/supply-requests/${id}`);
    return response;
  }

  async createSupplyRequest(data: CreateSupplyRequestRequest) {
    const response = await apiClient.post('/supply-requests', data);
    return response;
  }

  async updateSupplyRequest(id: string, data: UpdateSupplyRequestRequest) {
    const response = await apiClient.put(`/supply-requests/${id}`, data);
    return response;
  }

  async deleteSupplyRequest(id: string) {
    const response = await apiClient.delete(`/supply-requests/${id}`);
    return response;
  }

  async cancelSupplyRequest(id: string, lyDoHuy: string) {
    const response = await apiClient.post(`/supply-requests/${id}/cancel`, { lyDoHuy });
    return response;
  }

  async markMuaNhanhAsPurchased(id: string, soTien?: number) {
    const response = await apiClient.patch(`/supply-requests/${id}/mark-purchased`, { soTien });
    return response;
  }

  async partialFulfillItem(itemId: string, payload: PartialFulfillPayload) {
    const response = await apiClient.patch(
      `/supply-requests/items/${itemId}/partial-fulfill`,
      payload
    );
    return response;
  }

  async getDecisionHistory(supplyRequestId: string) {
    const response = await apiClient.get(`/supply-requests/${supplyRequestId}/decisions`);
    return response;
  }

  async batchFulfill(lines: BatchFulfillLine[]) {
    const response = await apiClient.post<BatchFulfillResult>('/supply-requests/batch-fulfill', { lines });
    return response;
  }

  async exportToExcel(filters?: SupplyRequestListFilters): Promise<void> {
    const token = localStorage.getItem('accessToken');
    const params = new URLSearchParams();
    if (filters?.search) params.append('search', filters.search);
    if (filters?.maYeuCau) params.append('maYeuCau', filters.maYeuCau);
    if (filters?.tenNhanVien) params.append('tenNhanVien', filters.tenNhanVien);
    if (filters?.boPhan) params.append('boPhan', filters.boPhan);
    if (filters?.trangThai) params.append('trangThai', filters.trangThai);
    if (filters?.mucDoUuTien) params.append('mucDoUuTien', filters.mucDoUuTien);

    const url = `${API_BASE_URL}/supply-requests/export/excel${params.toString() ? `?${params.toString()}` : ''}`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new Error('Failed to export to Excel');
    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `danh-sach-yeu-cau-cung-cap-${Date.now()}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  }
}

export default new SupplyRequestService();
