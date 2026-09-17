/**
 * Shared PurchaseRequest types for detail/edit modals and list pages.
 * Extends the minimal page-local interface with optional relations that
 * getPurchaseRequestById may include (added in this change).
 */

export interface PurchaseRequestItem {
  id: string;
  tenHangHoa: string;
  soLuong: number;
  donViTinh: string;
  phanLoai: string;
  giaDuKien?: number | null;
  giaThucTe?: number | null;
  nhaCungCapId?: string | null;
  supplier?: { id: string; tenNhaCungCap: string; maNhaCungCap?: string; soDienThoai?: string; emailLienHe?: string } | null;
}

export interface PurchaseRequest {
  id: string;
  stt: number;
  ngayYeuCau: string;
  maYeuCau: string;
  employeeId: string;
  maNhanVien: string;
  tenNhanVien: string;
  // @deprecated header cols
  phanLoai?: string;
  tenHangHoa?: string;
  soLuong?: number;
  donViTinh?: string;
  mucDichYeuCau: string;
  mucDoUuTien: string;
  ghiChu?: string | null;
  ghiChuMuaHang?: string | null;
  fileKemTheo?: string | null;
  trangThai: string;
  nguoiDuyet?: string | null;
  ngayDuyet?: string | null;
  nhaCungCapId?: string | null;
  giaDuKien?: number | null;
  supplyRequestId?: string | null;
  sourceType?: string;
  isQuickPurchase?: boolean;
  // cancel audit
  lyDoHuy?: string | null;
  ngayHuy?: string | null;
  nguoiHuy?: string | null;
  createdAt: string;
  updatedAt: string;
  items?: PurchaseRequestItem[];
  // optional relations (included by expanded getById)
  employee?: {
    id?: string;
    employeeCode?: string;
    position?: { name: string } | null;
    user?: { firstName?: string; lastName?: string; email?: string } | null;
  } | null;
  supplyRequest?: { id: string; maYeuCau: string; trangThai: string } | null;
  replenishmentRequest?: { id: string; maYeuCau: string; trangThai: string } | null;
  warehouseReceipts?: Array<{ id: string; maPhieuNhap?: string; maPhieu?: string }> | null;
  supplier?: { id: string; tenNhaCungCap: string; maNhaCungCap?: string } | null;
}
