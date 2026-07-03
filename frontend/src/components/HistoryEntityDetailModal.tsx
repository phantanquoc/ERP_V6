import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, ExternalLink, Loader2, ChevronDown, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../services/apiClient';
import { getEntityDetailEndpoint, getEntityModule } from '../services/myHistoryService';
import { useAuth } from '../contexts/AuthContext';
import { hasModuleAccess } from '../utils/permissions';
import { useFocusTrap } from '../hooks/useFocusTrap';

// ---- status display (subset of MyHistoryDetailModal's tables) ---------
const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Chờ xử lý',
  IN_PROGRESS: 'Đang xử lý',
  COMPLETED: 'Hoàn thành',
  APPROVED: 'Đã duyệt',
  REJECTED: 'Từ chối',
  CANCELLED: 'Đã hủy',
  CHO_DUYET: 'Chờ duyệt',
  DA_DUYET: 'Đã duyệt',
  HOAN_THANH: 'Hoàn thành',
  DA_HUY: 'Đã hủy',
  DANG_XU_LY: 'Đang xử lý',
  MOI_TAO: 'Mới tạo',
  TU_CHOI: 'Từ chối',
};

const STATUS_COLOR: Record<string, string> = {
  PENDING: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  CHO_DUYET: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  IN_PROGRESS: 'bg-blue-50 text-blue-700 border-blue-200',
  DANG_XU_LY: 'bg-blue-50 text-blue-700 border-blue-200',
  COMPLETED: 'bg-green-50 text-green-700 border-green-200',
  HOAN_THANH: 'bg-green-50 text-green-700 border-green-200',
  APPROVED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  DA_DUYET: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  REJECTED: 'bg-red-50 text-red-700 border-red-200',
  TU_CHOI: 'bg-red-50 text-red-700 border-red-200',
  CANCELLED: 'bg-gray-100 text-gray-500 border-gray-200',
  DA_HUY: 'bg-gray-100 text-gray-500 border-gray-200',
  MOI_TAO: 'bg-slate-50 text-slate-600 border-slate-200',
};

// ---- field label mapping ------------------------------------------------
const FIELD_LABELS: Record<string, string> = {
  // Common
  title: 'Tiêu đề',
  name: 'Tên',
  code: 'Mã',
  stt: 'STT',
  description: 'Mô tả',
  moTa: 'Mô tả',
  ghiChu: 'Ghi chú',
  note: 'Ghi chú',
  reason: 'Lý do',
  lyDo: 'Lý do',
  status: 'Trạng thái',
  trangThai: 'Trạng thái',
  createdAt: 'Ngày tạo',
  ngayTao: 'Ngày tạo',
  updatedAt: 'Cập nhật lần cuối',
  quantity: 'Số lượng',
  soLuong: 'Số lượng',
  amount: 'Số tiền',
  soTien: 'Số tiền',
  tongTien: 'Tổng tiền',
  unitPrice: 'Đơn giá',
  donGia: 'Đơn giá',
  createdBy: 'Người tạo',
  nguoiTao: 'Người tạo',
  department: 'Bộ phận',
  boPhan: 'Bộ phận',
  subDepartment: 'Phòng ban',
  phongBan: 'Phòng ban',
  expectedDate: 'Ngày dự kiến',
  ngayHen: 'Ngày dự kiến',
  ngayDuKien: 'Ngày dự kiến',
  dueDate: 'Hạn xử lý',
  completedAt: 'Hoàn thành lúc',
  approvedAt: 'Duyệt lúc',
  approvedBy: 'Người duyệt',
  nguoiDuyet: 'Người duyệt',
  items: 'Danh mục',
  products: 'Sản phẩm',
  materials: 'Vật tư',
  // Employee & user
  employee: 'Nhân viên',
  employeeCode: 'Mã nhân viên',
  maNhanVien: 'Mã nhân viên',
  tenNhanVien: 'Tên nhân viên',
  hoTen: 'Họ tên',
  fullName: 'Họ tên',
  firstName: 'Tên',
  lastName: 'Họ',
  user: 'Tài khoản',
  position: 'Chức vụ',
  chucVu: 'Chức vụ',
  role: 'Vai trò',
  email: 'Email',
  phone: 'Số điện thoại',
  soDienThoai: 'Số điện thoại',
  gender: 'Giới tính',
  gioiTinh: 'Giới tính',
  dateOfBirth: 'Ngày sinh',
  ngaySinh: 'Ngày sinh',
  address: 'Địa chỉ',
  diaChi: 'Địa chỉ',
  // Requests
  requester: 'Người yêu cầu',
  nguoiYeuCau: 'Người yêu cầu',
  ngayYeuCau: 'Ngày yêu cầu',
  maYeuCau: 'Mã yêu cầu',
  loaiYeuCau: 'Loại yêu cầu',
  phanLoai: 'Phân loại',
  mucDichYeuCau: 'Mục đích yêu cầu',
  mucDoUuTien: 'Mức độ ưu tiên',
  priority: 'Mức độ ưu tiên',
  urgencyLevel: 'Mức độ khẩn',
  tenGoi: 'Tên gọi',
  donViTinh: 'Đơn vị tính',
  unit: 'Đơn vị',
  fileKemTheo: 'File đính kèm',
  attachments: 'File đính kèm',
  // Quotation / order
  supplier: 'Nhà cung cấp',
  nhaCungCap: 'Nhà cung cấp',
  customer: 'Khách hàng',
  khachHang: 'Khách hàng',
  currency: 'Loại tiền',
  totalAmount: 'Tổng tiền',
  subtotal: 'Tạm tính',
  tax: 'Thuế',
  vat: 'VAT',
  discount: 'Chiết khấu',
  // Purchase & warehouse
  purchaseRequests: 'Phiếu mua hàng',
  purchaseOrders: 'Đơn mua hàng',
  warehouseReceipts: 'Phiếu nhập kho',
  warehouseIssues: 'Phiếu xuất kho',
  warehouse: 'Kho',
  kho: 'Kho',
  // Project / production
  project: 'Dự án',
  duAn: 'Dự án',
  productionLine: 'Dây chuyền',
  productionReport: 'Báo cáo sản xuất',
  batch: 'Lô sản xuất',
  loSanXuat: 'Lô sản xuất',
  // Contract & tax
  contract: 'Hợp đồng',
  hopDong: 'Hợp đồng',
  contractType: 'Loại hợp đồng',
  loaiHopDong: 'Loại hợp đồng',
  taxCode: 'Mã số thuế',
  maSoThue: 'Mã số thuế',
  invoiceNumber: 'Số hóa đơn',
  soHoaDon: 'Số hóa đơn',
  // Quality
  qualityScore: 'Điểm chất lượng',
  diemChatLuong: 'Điểm chất lượng',
  qualityLevel: 'Mức chất lượng',
  defectType: 'Loại lỗi',
  faultLevel: 'Mức độ lỗi',
};

// Department enum → Vietnamese
const DEPARTMENT_LABEL: Record<string, string> = {
  admin: 'Ban giám đốc',
  common: 'Chung',
  general: 'Bộ phận tổng hợp',
  quality: 'Bộ phận chất lượng',
  business: 'Bộ phận kinh doanh',
  accounting: 'Bộ phận kế toán',
  purchasing: 'Bộ phận thu mua',
  production: 'Bộ phận sản xuất',
  technical: 'Bộ phận kỹ thuật',
};

// Sub-department enum → Vietnamese
const SUB_DEPARTMENT_LABEL: Record<string, string> = {
  pricing: 'Phòng giá thành',
  partners: 'Phòng chăm sóc',
  personnel: 'CL nhân sự',
  process: 'CL quy trình',
  international: 'KD Quốc tế',
  domestic: 'KD Nội địa',
  admin: 'KT Hành chính',
  tax: 'KT Thuế',
  materials: 'Thu mua NVL',
  equipment: 'Mua thiết bị',
  management: 'Quản lý SX',
  data: 'Dữ liệu SX',
  warehouse: 'Quản lý kho',
  quality: 'QLHTM',
  mechanical: 'Cơ điện',
  projects: 'Dự án',
};

const PRIORITY_LABEL: Record<string, string> = {
  LOW: 'Thấp',
  NORMAL: 'Bình thường',
  MEDIUM: 'Trung bình',
  HIGH: 'Cao',
  URGENT: 'Khẩn cấp',
  thap: 'Thấp',
  binhThuong: 'Bình thường',
  trungBinh: 'Trung bình',
  cao: 'Cao',
  khanCap: 'Khẩn cấp',
};

const GENDER_LABEL: Record<string, string> = {
  MALE: 'Nam',
  FEMALE: 'Nữ',
  OTHER: 'Khác',
  male: 'Nam',
  female: 'Nữ',
  nam: 'Nam',
  nu: 'Nữ',
};

const CONTRACT_TYPE_LABEL: Record<string, string> = {
  OFFICIAL: 'Chính thức',
  PROBATION: 'Thử việc',
  INTERNSHIP: 'Thực tập',
  SEASONAL: 'Thời vụ',
  PART_TIME: 'Bán thời gian',
};

const ROLE_LABEL: Record<string, string> = {
  ADMIN: 'Quản trị viên',
  DEPARTMENT_HEAD: 'Trưởng bộ phận',
  TEAM_LEAD: 'Trưởng nhóm',
  EMPLOYEE: 'Nhân viên',
  admin: 'Quản trị viên',
  department_head: 'Trưởng bộ phận',
  team_lead: 'Trưởng nhóm',
  employee: 'Nhân viên',
};

// Fields shown at the top of the body, in this order, if present.
const PRIORITY_FIELDS = [
  'title', 'name', 'code', 'maYeuCau', 'maNhanVien',
  'description', 'moTa', 'ghiChu', 'note', 'reason', 'lyDo', 'mucDichYeuCau',
  'status', 'trangThai',
  'priority', 'mucDoUuTien', 'urgencyLevel',
  'loaiYeuCau', 'phanLoai', 'tenGoi',
  'createdAt', 'ngayTao', 'ngayYeuCau',
  'quantity', 'soLuong', 'donViTinh', 'unit',
  'amount', 'soTien', 'tongTien', 'unitPrice', 'donGia',
  'expectedDate', 'ngayHen', 'ngayDuKien', 'dueDate',
  'nguoiYeuCau', 'requester', 'employee',
  'department', 'boPhan', 'subDepartment',
];

// Fields that should never be rendered as generic rows.
const HIDDEN_FIELD_PATTERN = /Id$/;
const HIDDEN_FIELDS = new Set(['id']);

function getFieldLabel(key: string): string {
  if (FIELD_LABELS[key]) return FIELD_LABELS[key];
  // camelCase / snake_case -> "Camel Case" style fallback
  const spaced = key
    .replace(/_/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2');
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

// Resolve a nested object into a human-friendly display string.
// Returns null if the object doesn't match a known "person / entity" shape.
function resolvePersonDisplay(obj: any): string | null {
  if (!obj || typeof obj !== 'object') return null;

  // Employee { user: { firstName, lastName }, employeeCode, position: { name } }
  if (obj.user && typeof obj.user === 'object') {
    const u = obj.user;
    const name = [u.firstName, u.lastName].filter(Boolean).join(' ').trim()
      || u.fullName || u.hoTen || u.name || u.email;
    const code = obj.employeeCode || obj.maNhanVien || obj.code;
    const pos = obj.position && (obj.position.name || obj.position.tenChucVu);
    const parts: string[] = [];
    if (name) parts.push(name);
    if (code) parts.push(`(${code})`);
    let out = parts.join(' ');
    if (pos) out = out ? `${out} — ${pos}` : pos;
    return out || null;
  }

  // User { firstName, lastName, email }
  if (obj.firstName || obj.lastName) {
    const name = [obj.firstName, obj.lastName].filter(Boolean).join(' ').trim();
    return name || obj.email || null;
  }

  // Direct name-like fields
  const direct = obj.fullName || obj.hoTen || obj.name || obj.title || obj.tenGoi;
  if (typeof direct === 'string' && direct.length > 0) {
    const code = obj.code || obj.ma || obj.employeeCode;
    return code ? `${direct} (${code})` : direct;
  }

  return null;
}

// Map raw enum-like string values to Vietnamese labels when we recognize them.
function resolveEnumLabel(key: string, value: string): string | null {
  if (key === 'department' || key === 'boPhan') {
    return DEPARTMENT_LABEL[value] ?? null;
  }
  if (key === 'subDepartment' || key === 'phongBan') {
    return SUB_DEPARTMENT_LABEL[value] ?? null;
  }
  if (key === 'priority' || key === 'mucDoUuTien' || key === 'urgencyLevel') {
    return PRIORITY_LABEL[value] ?? null;
  }
  if (key === 'gender' || key === 'gioiTinh') {
    return GENDER_LABEL[value] ?? null;
  }
  if (key === 'contractType' || key === 'loaiHopDong') {
    return CONTRACT_TYPE_LABEL[value] ?? null;
  }
  if (key === 'role' || key === 'vaiTro') {
    return ROLE_LABEL[value] ?? null;
  }
  return null;
}

function isIsoDateString(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2})?/.test(value) && !isNaN(Date.parse(value));
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${year} ${h}:${m}`;
}

// Render an array of item-like objects (Danh mục, Sản phẩm...) as a compact list.
function renderItemList(items: any[]): React.ReactNode {
  return (
    <ul className="space-y-1.5 mt-0.5">
      {items.map((it, idx) => {
        if (it == null || typeof it !== 'object') {
          return <li key={idx} className="text-gray-700">• {String(it)}</li>;
        }
        const name = it.tenGoi || it.name || it.productName || it.materialName
          || it.title || it.description || it.moTa || `Mục ${idx + 1}`;
        const code = it.code || it.ma || it.sku;
        const qty = it.soLuong ?? it.quantity;
        const unit = it.donViTinh || it.unit;
        const price = it.donGia ?? it.unitPrice;
        const total = it.thanhTien ?? it.totalAmount ?? it.amount;

        const meta: string[] = [];
        if (qty != null) {
          meta.push(`SL: ${typeof qty === 'number' ? qty.toLocaleString('vi-VN') : qty}${unit ? ` ${unit}` : ''}`);
        } else if (unit) {
          meta.push(`ĐVT: ${unit}`);
        }
        if (price != null) {
          meta.push(`Đơn giá: ${typeof price === 'number' ? price.toLocaleString('vi-VN') : price}`);
        }
        if (total != null) {
          meta.push(`Thành tiền: ${typeof total === 'number' ? total.toLocaleString('vi-VN') : total}`);
        }

        return (
          <li key={idx} className="rounded-md border border-gray-100 bg-gray-50/60 px-2.5 py-1.5">
            <div className="flex items-baseline gap-2">
              <span className="text-xs text-gray-400 font-mono">{idx + 1}.</span>
              <span className="text-sm text-gray-900 font-medium">{name}</span>
              {code && <span className="text-xs text-gray-400 font-mono">({code})</span>}
            </div>
            {meta.length > 0 && (
              <div className="text-xs text-gray-500 mt-0.5 ml-6">{meta.join(' • ')}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function renderValue(key: string, value: unknown): React.ReactNode {
  if (value === null || value === undefined || value === '') return '—';

  if (typeof value === 'boolean') return value ? 'Có' : 'Không';

  if (typeof value === 'number') return value.toLocaleString('vi-VN');

  if (typeof value === 'string') {
    // Enum → Vietnamese
    const enumLabel = resolveEnumLabel(key, value);
    if (enumLabel) return enumLabel;
    // Status handled by header, but if it slips through render it as-is
    if (isIsoDateString(value)) return formatDateTime(value);
    if (value.length > 200) {
      return <div className="whitespace-pre-wrap">{value}</div>;
    }
    return value;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return 'Không có';
    // If items look like domain items (have quantity / name / code) → render list
    const first = value[0];
    if (first && typeof first === 'object') {
      const looksLikeItem = 'soLuong' in first || 'quantity' in first
        || 'tenGoi' in first || 'productName' in first || 'materialName' in first
        || 'donGia' in first || 'unitPrice' in first || 'donViTinh' in first;
      if (looksLikeItem) return renderItemList(value as any[]);

      // Otherwise try to reduce each to a person / name-ish string
      const displays = (value as any[])
        .map((v) => resolvePersonDisplay(v) || v.name || v.hoTen || v.title || null)
        .filter((s): s is string => typeof s === 'string' && s.length > 0);
      if (displays.length === value.length) return displays.join(', ');
    } else {
      // Primitives
      return (value as any[]).join(', ');
    }
    return renderItemList(value as any[]);
  }

  if (typeof value === 'object') {
    const person = resolvePersonDisplay(value);
    if (person) return person;
    // Fall back to compact JSON, indented and scrollable
    return (
      <pre className="text-xs bg-gray-50 p-2 rounded overflow-x-auto max-h-40">
        {JSON.stringify(value, null, 2)}
      </pre>
    );
  }

  return String(value);
}

// ---- detail row ---------------------------------------------------------
const DetailRow: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="flex items-start gap-3 py-2.5 border-b border-gray-50 last:border-0">
    <span className="w-32 flex-shrink-0 text-xs font-medium text-gray-500 pt-0.5">{label}</span>
    <div className="flex-1 text-sm text-gray-900">{children}</div>
  </div>
);

// ---- main component -------------------------------------------------
interface HistoryEntityDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  entityType: string | null;
  entityId: string | null;
  routeHint?: string | null;
  displayTitle?: string;
}

const HistoryEntityDetailModal: React.FC<HistoryEntityDetailModalProps> = ({
  isOpen,
  onClose,
  entityType,
  entityId,
  routeHint,
  displayTitle,
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [showEmpty, setShowEmpty] = useState(false);

  const endpoint = entityType ? getEntityDetailEndpoint(entityType) : null;

  const { data, isLoading, isError } = useQuery({
    queryKey: ['history-entity-detail', entityType, entityId],
    queryFn: async () => {
      const response = await apiClient.get<{ success: boolean; data: any }>(
        `${endpoint}/${entityId}`
      );
      return (response.data as any)?.data ?? response.data;
    },
    enabled: isOpen && !!entityType && !!entityId && !!endpoint,
  });

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (isOpen && closeButtonRef.current) {
      const t = setTimeout(() => closeButtonRef.current?.focus(), 10);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  useFocusTrap(dialogRef as React.RefObject<HTMLElement | null>, isOpen, handleClose);

  if (!isOpen || !entityType || !entityId || !endpoint) return null;

  const status: string | undefined = data?.status ?? data?.trangThai;
  const statusLabel = status ? (STATUS_LABEL[status] ?? status) : null;
  const statusColor = status ? (STATUS_COLOR[status] ?? 'bg-gray-100 text-gray-500 border-gray-200') : '';

  const title = data?.title || data?.name || data?.code || displayTitle || 'Chi tiết';
  const code = data?.code || data?.id;

  const module = getEntityModule(entityType);
  const canOpenOriginal =
    !!routeHint &&
    !!module &&
    !!user &&
    hasModuleAccess(module, user.role, user.department, user.secondaryDepartments);

  const handleOpenOriginal = () => {
    if (!routeHint) return;
    onClose();
    navigate(routeHint);
  };

  // Priority fields (shown first), in the defined order, only if present in data.
  const priorityEntries: [string, unknown][] = PRIORITY_FIELDS
    .filter((key) => data && Object.prototype.hasOwnProperty.call(data, key))
    .map((key) => [key, data[key]] as [string, unknown]);

  const priorityKeys = new Set(priorityEntries.map(([key]) => key));

  // Remaining fields: exclude id/*Id, already-rendered priority fields, and createdAt/updatedAt.
  // Also exclude fields already surfaced in the header: status, trangThai, code, name, title
  // (title/name/code appear as h2; status appears as the badge below).
  const HEADER_KEYS = new Set(['id', 'code', 'name', 'title', 'status', 'trangThai']);
  const remainingEntries: [string, unknown][] = data
    ? Object.entries(data).filter(([key]) => {
        if (HIDDEN_FIELDS.has(key)) return false;
        if (HIDDEN_FIELD_PATTERN.test(key)) return false; // createdById, updatedById, ...
        if (priorityKeys.has(key)) return false;
        if (key === 'createdAt' || key === 'updatedAt') return false;
        return true;
      })
    : [];

  // Partition entries into "filled" (has a meaningful value) and "empty" (—).
  const isEmpty = (v: unknown): boolean =>
    v === null || v === undefined || v === '' || (Array.isArray(v) && v.length === 0);

  const allEntries = [...priorityEntries, ...remainingEntries]
    .filter(([key]) => !HEADER_KEYS.has(key));

  const filledEntries = allEntries.filter(([, v]) => !isEmpty(v));
  const emptyEntries = allEntries.filter(([, v]) => isEmpty(v));

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/40 z-50" aria-hidden="true" onClick={handleClose} />
      {/* Dialog */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          ref={dialogRef}
          className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="history-entity-modal-title"
        >
          {/* Header */}
          <div className="flex items-start justify-between p-5 border-b border-gray-100">
            <div className="flex-1 min-w-0 pr-4">
              <h2
                id="history-entity-modal-title"
                className="text-base font-semibold text-gray-900 leading-snug"
              >
                {title}
              </h2>
              {code && <p className="text-xs text-gray-400 font-mono mt-0.5">{code}</p>}
              {statusLabel && (
                <span
                  className={`inline-flex items-center mt-2 px-2 py-0.5 rounded border text-xs font-medium ${statusColor}`}
                >
                  {statusLabel}
                </span>
              )}
            </div>
            <button
              ref={closeButtonRef}
              type="button"
              onClick={handleClose}
              className="flex-shrink-0 p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              aria-label="Đóng"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-5 space-y-0">
            {isLoading && (
              <div className="flex items-center justify-center py-10 text-gray-400">
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                Đang tải...
              </div>
            )}

            {isError && (
              <div className="py-10 text-center text-sm text-red-500">
                Không thể tải chi tiết. Có thể phiếu đã bị xóa hoặc bạn không có quyền xem.
              </div>
            )}

            {!isLoading && !isError && data && (
              <>
                {filledEntries.map(([key, value]) => (
                  <DetailRow key={key} label={getFieldLabel(key)}>
                    {renderValue(key, value)}
                  </DetailRow>
                ))}

                {emptyEntries.length > 0 && (
                  <div className="pt-3 mt-3 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={() => setShowEmpty((v) => !v)}
                      className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {showEmpty ? (
                        <ChevronDown className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5" />
                      )}
                      {showEmpty
                        ? `Ẩn ${emptyEntries.length} trường trống`
                        : `Xem thêm ${emptyEntries.length} trường trống`}
                    </button>
                    {showEmpty && (
                      <div className="mt-2 opacity-70">
                        {emptyEntries.map(([key, value]) => (
                          <DetailRow key={key} label={getFieldLabel(key)}>
                            {renderValue(key, value)}
                          </DetailRow>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-100 flex justify-end gap-2">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              Đóng
            </button>
            {canOpenOriginal && (
              <button
                type="button"
                onClick={handleOpenOriginal}
                className="flex items-center gap-1.5 px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                <ExternalLink className="w-4 h-4" />
                Mở trang gốc
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default HistoryEntityDetailModal;
