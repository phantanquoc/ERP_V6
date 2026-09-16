import apiClient from './apiClient';
import { API_BASE_URL } from '../config/api';

/**
 * YCBS — Yêu cầu bổ sung (replenishment request).
 *
 * Distinct from YCMH (PurchaseRequest): warehouse creates a YCBS when a supply
 * request line cannot be filled from stock, WITHOUT price or supplier. Purchasing
 * fills `nhaCungCapId` + `giaDuKien` per item, then converts it into a real
 * YCMH (`trangThai='Chờ duyệt'`, code `YC-MH-…`) via `convertToPurchaseRequest`.
 *
 * Backend: `/api/replenishment-requests` (replenishmentRequestService.ts).
 */

export interface ReplenishmentRequestItem {
  id: string;
  replenishmentRequestId: string;
  phanLoai: string;
  tenGoi: string;
  soLuong: number;
  donViTinh: string;
  /** Null until purchasing fills it — that is the whole point of the YCBS stage. */
  nhaCungCapId?: string | null;
  giaDuKien?: number | null;
  supplier?: { id: string; tenNhaCungCap: string; maNhaCungCap: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface ReplenishmentRequest {
  id: string;
  stt: number;
  ngayYeuCau: string;
  /** YC-BS-YYYY-NNN */
  maYeuCau: string;
  employeeId: string;
  maNhanVien: string;
  tenNhanVien: string;
  mucDichYeuCau: string;
  mucDoUuTien: string;
  ghiChu?: string | null;
  fileKemTheo?: string | null;
  /** 'Chờ báo giá' | 'Đã chuyển mua hàng' | 'Đã hủy' */
  trangThai: string;
  /** Audit trail of a cancelled ticket — null unless trangThai === 'Đã hủy' */
  lyDoHuy?: string | null;
  ngayHuy?: string | null;
  nguoiHuy?: string | null;
  supplyRequestId?: string | null;
  /** MATERIALS | EQUIPMENT | OTHER — routes to the right purchasing sub-department */
  phanLoaiGroup?: string | null;
  convertedPurchaseRequestId?: string | null;
  createdAt: string;
  updatedAt: string;
  items: ReplenishmentRequestItem[];
  supplyRequest?: { id: string; maYeuCau: string; trangThai: string } | null;
  convertedPurchaseRequest?: { id: string; maYeuCau: string; trangThai: string } | null;
}

/** Payload for `PUT /:id` — purchasing fills price/NCC. Quantity/identity are immutable. */
export interface UpdateReplenishmentRequestPayload {
  mucDoUuTien?: string;
  ghiChu?: string;
  items?: {
    id?: string;
    phanLoai: string;
    tenGoi: string;
    soLuong: number;
    donViTinh: string;
    nhaCungCapId?: string | null;
    giaDuKien?: number | null;
  }[];
  file?: File;
}

export interface ReplenishmentFilters {
  phanLoaiGroup?: string;
  trangThai?: string;
  supplyRequestId?: string;
}

/** True when the YCBS is still convertible (not yet converted/cancelled). Pricing is a prefill — YCMH enforces it at submit. */
export function isReadyToConvert(ybs: Pick<ReplenishmentRequest, 'items' | 'trangThai'>): boolean {
  if (ybs.trangThai !== 'Chờ báo giá') return false;
  return ybs.items.length > 0;
}

class ReplenishmentRequestService {
  async getAllReplenishmentRequests(
    page: number = 1,
    limit: number = 10,
    search?: string,
    month?: number,
    year?: number,
    filters?: ReplenishmentFilters,
  ) {
    const params: Record<string, string | number> = { page, limit };
    if (search) params.search = search;
    if (month) params.month = month;
    if (year) params.year = year;
    if (filters?.phanLoaiGroup) params.phanLoaiGroup = filters.phanLoaiGroup;
    if (filters?.trangThai) params.trangThai = filters.trangThai;
    if (filters?.supplyRequestId) params.supplyRequestId = filters.supplyRequestId;
    return apiClient.get('/replenishment-requests', { params });
  }

  async getReplenishmentRequestById(id: string) {
    return apiClient.get(`/replenishment-requests/${id}`);
  }

  async generateCode() {
    return apiClient.get('/replenishment-requests/generate-code');
  }

  /**
   * Warehouse files a YCBS by hand from the supply-request detail modal.
   * No `nhaCungCapId` / `giaDuKien` here — the backend rejects them, because
   * pricing is purchasing's job on the YCBS before it becomes a YCMH.
   */
  async createFromSupplyRequest(
    data: {
      employeeId: string;
      maNhanVien: string;
      tenNhanVien: string;
      items: { phanLoai: string; tenGoi: string; soLuong: number; donViTinh: string }[];
      mucDichYeuCau: string;
      mucDoUuTien: string;
      ghiChu?: string;
      supplyRequestId: string;
      phanLoaiGroup?: string;
    },
    file?: File,
  ) {
    if (file) {
      const formData = new FormData();
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && value !== null && key !== 'items') {
          formData.append(key, String(value));
        }
      });
      formData.append('items', JSON.stringify(data.items));
      formData.append('file', file);
      return apiClient.post('/replenishment-requests', formData);
    }
    return apiClient.post('/replenishment-requests', data);
  }

  async updateReplenishmentRequest(id: string, data: UpdateReplenishmentRequestPayload) {
    if (data.file) {
      const formData = new FormData();
      if (data.mucDoUuTien) formData.append('mucDoUuTien', data.mucDoUuTien);
      if (data.ghiChu !== undefined) formData.append('ghiChu', data.ghiChu || '');
      if (data.items) formData.append('items', JSON.stringify(data.items));
      formData.append('file', data.file);
      return apiClient.put(`/replenishment-requests/${id}`, formData);
    }
    const { file: _file, ...jsonData } = data;
    return apiClient.put(`/replenishment-requests/${id}`, jsonData);
  }

  /** The YYCC→YCBS→YCMH handoff: requires every line to have NCC + price. */
  async convertToPurchaseRequest(id: string) {
    return apiClient.post(`/replenishment-requests/${id}/convert`, {});
  }

  async cancelReplenishmentRequest(id: string, lyDoHuy: string) {
    return apiClient.post(`/replenishment-requests/${id}/cancel`, { lyDoHuy });
  }

  async deleteReplenishmentRequest(id: string) {
    return apiClient.delete(`/replenishment-requests/${id}`);
  }

  async exportToExcel(filters?: { search?: string; phanLoaiGroup?: string; trangThai?: string }): Promise<void> {
    const token = localStorage.getItem('accessToken');
    const params = new URLSearchParams();
    if (filters?.search) params.append('search', filters.search);
    if (filters?.phanLoaiGroup) params.append('phanLoaiGroup', filters.phanLoaiGroup);
    if (filters?.trangThai) params.append('trangThai', filters.trangThai);

    const url = `${API_BASE_URL}/replenishment-requests/export/excel${params.toString() ? `?${params.toString()}` : ''}`;
    const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) throw new Error('Failed to export to Excel');
    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `danh-sach-yeu-cau-bo-sung-${Date.now()}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  }
}

export default new ReplenishmentRequestService();
