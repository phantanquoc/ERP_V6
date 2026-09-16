import React, { useState, useEffect } from 'react';
import { Trash2, Package, PackageOpen, ShoppingCart, Download, X, ClipboardCheck, PackagePlus, Plus, PackageCheck, AlertTriangle, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useUrlDetailId } from '../hooks/useUrlState';
import supplyRequestService, { SupplyRequest } from '../services/supplyRequestService';
import { useAuth } from '../contexts/AuthContext';
import { can, isCachedPermissionsLoaded } from '../utils/permissions';
import { UserRole } from '../types/auth';
import CreateWarehouseIssueModal from './CreateWarehouseIssueModal';
import CreateReplenishmentRequestModal from './CreateReplenishmentRequestModal';
import CreateWarehouseReceiptModal from './CreateWarehouseReceiptModal';
import PartialFulfillmentModal from './PartialFulfillmentModal';
import type { SupplyRequestItem } from '../services/supplyRequestService';
import { internationalProductService, type InternationalProduct } from '../services/internationalProductService';
import { parseNumberInput } from '../utils/numberInput';
import warehouseService from '../services/warehouseService';
import TableFilter, { FilterField } from './TableFilter';
import Modal from './Modal';
import ConfirmDialog from './common/ConfirmDialog';
import CancelWithReasonModal from './common/CancelWithReasonModal';
import UnitSelect from './common/UnitSelect';
import ProductCombobox from './common/ProductCombobox';
import ProductFormModal from './products/ProductFormModal';
import { FormField, inputCls, readonlyCls, textareaCls } from './ModalForm';

interface SupplyRequestManagementProps {
  onClose?: () => void;
}

interface EditItemRow {
  /** `id` ties this row to its SupplyRequestItem so fulfilledQty/fulfillmentStatus survive an edit. */
  id?: string;
  internationalProductId: string | null;
  phanLoai: string;
  tenGoi: string;
  soLuong: number;
  donViTinh: string;
  /** Null = line is new / never had a fulfilment; dropping it is safe. */
  fulfilledQty: number | null;
  isNewProduct?: boolean;
  stockInfo?: { totalQuantity: number; unit: string };
}

const emptyEditRow = (): EditItemRow => ({
  internationalProductId: null,
  phanLoai: '',
  tenGoi: '',
  soLuong: 0,
  donViTinh: 'Kg',
  fulfilledQty: null,
});

const getStatusColor = (status: string) => {
  switch (status) {
    case 'Đã cung cấp':
      return 'text-green-700 bg-green-100';
    case 'Đã mua hàng':
      return 'text-emerald-700 bg-emerald-100';
    case 'Đã nhập kho':
      return 'text-cyan-700 bg-cyan-100';
    case 'Đã duyệt mua':
      return 'text-blue-700 bg-blue-100';
    case 'Chờ bổ sung':
      return 'text-violet-700 bg-violet-100';
    case 'Đang xử lý':
      return 'text-yellow-700 bg-yellow-100';
    case 'Đã hủy':
      return 'text-red-700 bg-red-100';
    case 'Chưa cung cấp':
    default:
      return 'text-gray-700 bg-gray-100';
  }
};

const getFulfillmentStatusColor = (status?: string) => {
  switch (status) {
    case 'Đã cấp đủ':
      return 'text-green-700 bg-green-100';
    case 'Đã cấp một phần':
      return 'text-orange-700 bg-orange-100';
    case 'Chuyển thu mua':
      return 'text-blue-700 bg-blue-100';
    case 'Chờ xử lý':
    default:
      return 'text-gray-700 bg-gray-100';
  }
};

/** Nhãn ngắn cho badge trạng thái (tên đầy đủ giữ trong title) — tránh badge quá dài trên bảng. */
const getStatusLabel = (status: string) => {
  switch (status) {
    case 'Chưa cung cấp': return 'Chưa cấp';
    case 'Đang xử lý': return 'Đang xử lý';
    case 'Chờ bổ sung': return 'Chờ bổ sung';
    case 'Đã duyệt mua': return 'Đã duyệt';
    case 'Đã mua hàng': return 'Đã mua';
    case 'Đã nhập kho': return 'Đã nhập';
    case 'Đã cung cấp': return 'Đã cấp';
    case 'Đã hủy': return 'Đã hủy';
    default: return status;
  }
};

const getFulfillmentStatusLabel = (status?: string) => {
  switch (status) {
    case 'Đã cấp đủ': return 'Cấp đủ';
    case 'Đã cấp một phần': return 'Cấp một phần';
    case 'Chuyển thu mua': return 'Chuyển thu mua';
    case 'Chờ xử lý':
    default: return status || 'Chờ xử lý';
  }
};

const getDecisionColor = (decision: string) => {
  switch (decision) {
    case 'Cấp đủ': return 'text-green-700 bg-green-100';
    case 'Cấp một phần': return 'text-orange-700 bg-orange-100';
    case 'Chuyển thu mua': return 'text-blue-700 bg-blue-100';
    case 'Không cấp': return 'text-red-700 bg-red-100';
    default: return 'text-gray-700 bg-gray-100';
  }
};

/**
 * Chuẩn hoá giá trị `boPhan` về tên tiếng Việt để hiển thị.
 *
 * Lịch sử: form tạo YC từng lưu `user.department` (perm-code như 'technical',
 * 'quality', 'admin') thay vì `user.departmentName`, nên DB lẫn lộn code và tên.
 * Helper này map code → tên Việt, và giữ nguyên giá trị đã là tiếng Việt.
 */
const BO_PHAN_LABEL: Record<string, string> = {
  // perm-code (user.department)
  general: 'Bộ phận tổng hợp',
  quality: 'Bộ phận chất lượng',
  business: 'Bộ phận kinh doanh',
  accounting: 'Bộ phận kế toán',
  purchasing: 'Bộ phận thu mua',
  production: 'Bộ phận sản xuất',
  technical: 'Bộ phận kỹ thuật',
  admin: 'Ban quản trị',
  // raw backend code (user.departmentCode)
  dept_general: 'Bộ phận tổng hợp',
  dept_quality: 'Bộ phận chất lượng',
  dept_business: 'Bộ phận kinh doanh',
  dept_accounting: 'Bộ phận kế toán',
  dept_purchasing: 'Bộ phận thu mua',
  dept_production: 'Bộ phận sản xuất',
  dept_technical: 'Bộ phận kỹ thuật',
};

const normalizeBoPhanLabel = (value?: string): string => {
  if (!value || !value.trim()) return '—';
  const trimmed = value.trim();
  const mapped = BO_PHAN_LABEL[trimmed.toLowerCase()];
  return mapped ?? trimmed;
};

const SupplyRequestManagement: React.FC<SupplyRequestManagementProps> = () => {
  const { user } = useAuth();
  // (useUrlDetailId internally uses useSearchParams)
  const { id: urlDetailId, open: pushDetailId, close: popDetailId, syncingRef } = useUrlDetailId('supplyRequestId');
  // Rule Matrix: fallback to role check until my-permissions loaded
  const _roleEdit = user?.role === UserRole.ADMIN || user?.role === UserRole.DEPARTMENT_HEAD || user?.role === UserRole.TEAM_LEAD;
  const _roleAdmin = user?.role === UserRole.ADMIN;
  const canEdit = isCachedPermissionsLoaded() ? can('supply-requests', 'UPDATE', user?.role) : _roleEdit;
  const canDelete = isCachedPermissionsLoaded() ? can('supply-requests', 'DELETE', user?.role) : _roleAdmin;
  const canCancel = isCachedPermissionsLoaded() ? can('supply-requests', 'UPDATE', user?.role) : _roleEdit; // CANCEL maps to UPDATE
  const [requests, setRequests] = useState<SupplyRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterValues, setFilterValues] = useState<Record<string, string>>({ _search: '', maYeuCau: '', tenNhanVien: '', boPhan: '', trangThai: '', mucDoUuTien: '' });
  const supplyFilterFields: FilterField[] = [
    { key: 'maYeuCau', label: 'Mã yêu cầu', type: 'text' },
    { key: 'tenNhanVien', label: 'Tên nhân viên', type: 'text' },
    { key: 'boPhan', label: 'Bộ phận', type: 'select', options: [
      { value: 'Bộ phận tổng hợp', label: 'Bộ phận tổng hợp' },
      { value: 'Bộ phận chất lượng', label: 'Bộ phận chất lượng' },
      { value: 'Bộ phận kinh doanh', label: 'Bộ phận kinh doanh' },
      { value: 'Bộ phận kế toán', label: 'Bộ phận kế toán' },
      { value: 'Bộ phận thu mua', label: 'Bộ phận thu mua' },
      { value: 'Bộ phận sản xuất', label: 'Bộ phận sản xuất' },
      { value: 'Bộ phận kỹ thuật', label: 'Bộ phận kỹ thuật' },
      { value: 'Ban quản trị', label: 'Ban quản trị' },
    ] },
    { key: 'trangThai', label: 'Trạng thái', type: 'select', options: [
      { value: 'Chưa cung cấp', label: 'Chưa cung cấp' },
      { value: 'Đang xử lý', label: 'Đang xử lý' },
      { value: 'Chờ bổ sung', label: 'Chờ bổ sung' },
      { value: 'Đã duyệt mua', label: 'Đã duyệt mua' },
      { value: 'Đã mua hàng', label: 'Đã mua hàng' },
      { value: 'Đã nhập kho', label: 'Đã nhập kho' },
      { value: 'Đã cung cấp', label: 'Đã cung cấp' },
      { value: 'Đã hủy', label: 'Đã hủy' },
    ]},
    { key: 'mucDoUuTien', label: 'Mức độ ưu tiên', type: 'select', options: [
      { value: 'Cao', label: 'Cao' },
      { value: 'Trung bình', label: 'Trung bình' },
      { value: 'Thấp', label: 'Thấp' },
    ]},
  ];
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const itemsPerPage = 10;
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'edit' | 'view'>('view');
  const [selectedRequest, setSelectedRequest] = useState<SupplyRequest | null>(null);
  const [showWarehouseIssueModal, setShowWarehouseIssueModal] = useState(false);
  // YCBS (YC-BS-…) — the warehouse→purchasing handoff, not a YCMH.
  const [showReplenishmentModal, setShowReplenishmentModal] = useState(false);
  const [showWarehouseReceiptModal, setShowWarehouseReceiptModal] = useState(false);
  const [partialFulfillItem, setPartialFulfillItem] = useState<SupplyRequestItem | null>(null);
  const [inventoryCheckResult, setInventoryCheckResult] = useState<{
    show: boolean;
    loading: boolean;
    productName: string;
    items: { tenKho: string; tenLo: string; soLuong: number; giaThanh: number; donViTinh: string }[];
    allResults?: { productName: string; items: { tenKho: string; tenLo: string; soLuong: number; giaThanh: number; donViTinh: string }[] }[];
  }>({ show: false, loading: false, productName: '', items: [] });

  // Confirm dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  // Decision history for the detail modal (audit trail of fulfilment)
  const [decisions, setDecisions] = useState<any[]>([]);
  const [loadingDecisions, setLoadingDecisions] = useState(false);

  // Cancel-with-reason: id of the YCCB pending cancellation (null = modal closed).
  const [cancelTargetId, setCancelTargetId] = useState<string | null>(null);
  const [cancelTargetCode, setCancelTargetCode] = useState<string>('');
  const [cancelling, setCancelling] = useState(false);

  // ── "Mới" tag → product-creation form ─────────────────────────────────────
  // A line whose goods never existed in the catalogue (isNewProduct) shows an amber
  // "Mới" tag in the detail view. Clicking it opens the SAME ProductFormModal as the
  // products page, prefilled with the line's name/category/unit, so the warehouse can
  // register the goods without leaving the request. Gated on the same roles the
  // catalogue itself uses — EMPLOYEE cannot create catalogue products (server-enforced).
  const canCreateProduct = user?.role === UserRole.ADMIN || user?.role === UserRole.DEPARTMENT_HEAD || user?.role === UserRole.TEAM_LEAD;
  const [productFormOpen, setProductFormOpen] = useState(false);
  const [productFormData, setProductFormData] = useState({ maSanPham: '', tenSanPham: '', moTaSanPham: '', loaiSanPham: '', donViTinh: '', giaThanh: '' });
  const [productCategories, setProductCategories] = useState<string[]>([]);
  const [generatingProductCode, setGeneratingProductCode] = useState(false);
  const [productCodeTouched, setProductCodeTouched] = useState(false);
  // The exact line the tag was clicked on. The creation form lets the user correct the
  // name into its official spelling, so the new product's name need not equal the line's
  // tenGoi — matching by name would then miss the line (both here and on the server).
  const [pendingCreateItemId, setPendingCreateItemId] = useState<string | null>(null);

  const openCreateProductFromItem = (item: SupplyRequestItem) => {
    setPendingCreateItemId(item.id);
    setProductFormData({
      maSanPham: '',
      tenSanPham: item.tenGoi,
      moTaSanPham: '',
      loaiSanPham: item.phanLoai && item.phanLoai !== 'Khác' ? item.phanLoai : '',
      donViTinh: item.donViTinh || '',
      giaThanh: '',
    });
    setProductCodeTouched(false);
    internationalProductService.getCategories()
      .then((res) => setProductCategories(res.data || []))
      .catch(() => setProductCategories([]));
    setProductFormOpen(true);
  };

  const suggestProductCode = async (force: boolean) => {
    if (!productFormData.loaiSanPham) return;
    if (!force && productCodeTouched) return;
    setGeneratingProductCode(true);
    try {
      const res = await internationalProductService.generateProductCode(productFormData.tenSanPham, productFormData.loaiSanPham);
      const code = res.data?.code ?? '';
      if (code) {
        setProductFormData((prev) => ({ ...prev, maSanPham: code }));
        if (force) setProductCodeTouched(false);
      }
    } catch {
      // Suggestion is best-effort — the code can always be typed by hand.
    } finally {
      setGeneratingProductCode(false);
    }
  };

  // Auto-suggest a code once name + category are known (same debounce as the products page).
  useEffect(() => {
    if (!productFormOpen || productCodeTouched) return;
    if (!productFormData.tenSanPham.trim() || !productFormData.loaiSanPham) return;
    const timer = setTimeout(() => { void suggestProductCode(false); }, 500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productFormOpen, productCodeTouched, productFormData.tenSanPham, productFormData.loaiSanPham]);

  const handleCreateProductFromYccb = async () => {
    if (!productFormData.tenSanPham.trim()) {
      toast.error('Vui lòng nhập tên hàng hóa');
      return;
    }
    const parsedGiaThanh = productFormData.giaThanh.trim() === '' ? null : Number(productFormData.giaThanh);
    if (parsedGiaThanh !== null && (!Number.isFinite(parsedGiaThanh) || parsedGiaThanh < 0)) {
      toast.error('Giá thành phải là số không âm');
      return;
    }
    const createdFromItemId = pendingCreateItemId;
    let newProduct: InternationalProduct | null = null;
    try {
      const res = await internationalProductService.createProduct({
        maSanPham: productFormData.maSanPham.trim(),
        tenSanPham: productFormData.tenSanPham,
        moTaSanPham: productFormData.moTaSanPham,
        loaiSanPham: productFormData.loaiSanPham,
        donViTinh: productFormData.donViTinh,
        ...(parsedGiaThanh !== null ? { giaThanh: parsedGiaThanh } : {}),
        ...(createdFromItemId ? { supplyRequestItemId: createdFromItemId } : {}),
      });
      newProduct = (res as any)?.data ?? null;
      toast.success('Tạo hàng hóa thành công');
      setProductFormOpen(false);
      setPendingCreateItemId(null);
      // Refresh the catalogue used by the edit form so the new goods is pickable at once.
      internationalProductService.getAllProducts(1, 10000)
        .then((res2) => setEditProducts(res2.data || []))
        .catch(() => { /* next modal open refetches anyway */ });

      // createProduct đã reconcile phía server (clear isNewProduct + đồng bộ
      // tenGoi/phanLoai/donViTinh). Tuy nhiên nếu người dùng sửa tên cho chính thức
      // trong form, dòng cũ không khớp tên mới nên chỉ reconcile theo id mới trúng:
      // server patch dòng createdFromItemId = tenGoi mới; sweep còn lại theo tên để
      // dọn các phiếu khác trùng tên cũ. Để list trong modal chi tiết phản ánh NGAY mà
      // không chờ fetch, patch optimistic local trước rồi mới refetch làm nguồn sự thật.
      if (selectedRequest) {
        const canonical = (newProduct?.tenSanPham || productFormData.tenSanPham).trim().toLowerCase();
        // Optimistic: applied on the current snapshot so the table flickers once at most.
        setSelectedRequest((prev) => (prev ? {
          ...prev,
          items: (prev.items as SupplyRequestItem[]).map((it) => {
            const byId = !!createdFromItemId && it.id === createdFromItemId;
            const byName = !createdFromItemId && it.isNewProduct && (it.tenGoi || '').trim().toLowerCase() === canonical;
            if (!(byId || byName)) return it;
            return {
              ...it,
              isNewProduct: false,
              tenGoi: newProduct?.tenSanPham?.trim() || it.tenGoi,
              phanLoai: newProduct?.loaiSanPham?.trim() || it.phanLoai,
              donViTinh: newProduct?.donViTinh?.trim() || it.donViTinh,
            };
          }),
        } : prev));
        // Pull the server's reconciled row so the goods table — and a later reopen of
        // the edit form — show the authoritative name/category/unit, not the local guess.
        supplyRequestService.getSupplyRequestById(selectedRequest.id)
          .then((fresh: any) => {
            const freshData = (fresh?.data ?? fresh) as SupplyRequest;
            if (!freshData?.id) return;
            setSelectedRequest(freshData);
            setRequests((prev: any) =>
              Array.isArray(prev)
                ? prev.map((r: SupplyRequest) => (r.id === freshData.id ? freshData : r))
                : prev
            );
            // Keep the edit form consistent with the freshly-linked lines. Supply
            // request items carry no FK to the catalogue (only tenGoi text), so the
            // combobox stays unlinked — initialText keeps the name visible.
            setEditItems((freshData.items ?? []).map((i) => ({
              id: i.id,
              internationalProductId: null,
              phanLoai: i.phanLoai,
              tenGoi: i.tenGoi,
              soLuong: i.soLuong,
              donViTinh: i.donViTinh,
              fulfilledQty: i.fulfilledQty ?? null,
              isNewProduct: i.isNewProduct,
            })));
          })
          .catch(() => { /* optimistic patch above already covers this session */ });
      }
    } catch (error: any) {
      toast.error(error?.message || 'Lỗi khi tạo hàng hóa');
    }
  };

  const isCancelled = (status: string) => status === 'Đã hủy';
  const isCompleted = (status: string) => status === 'Đã cung cấp';
  // Helpers for status-aware UI (e.g. nhập-kho but not yet cấp → still actionable)
  void 'Đã nhập kho'; // keep STATUS literal in module scope for i18n hint
  const isNhapKho = (status: string) => status === 'Đã nhập kho';
  const isAnyDone = (status: string) => status === 'Đã cung cấp' || status === 'Đã nhập kho';
  void isNhapKho; void isAnyDone;
  // Request has already entered the purchasing pipeline — creating another
  // purchase request from it is redundant.
  const isPurchasing = (status: string) => status === 'Đã duyệt mua' || status === 'Đã mua hàng';

  const serverFilters = React.useMemo(() => {
    const f: Record<string, string> = {};
    const s = (filterValues._search || '').trim();
    if (s) f.search = s;
    if ((filterValues.maYeuCau || '').trim()) f.maYeuCau = filterValues.maYeuCau.trim();
    if ((filterValues.tenNhanVien || '').trim()) f.tenNhanVien = filterValues.tenNhanVien.trim();
    if ((filterValues.boPhan || '').trim()) f.boPhan = filterValues.boPhan.trim();
    if (filterValues.trangThai) f.trangThai = filterValues.trangThai;
    if (filterValues.mucDoUuTien) f.mucDoUuTien = filterValues.mucDoUuTien;
    return f;
  }, [filterValues]);

  const handleFilterChange = (next: Record<string, string>) => {
    setFilterValues(next);
    setCurrentPage(1);
  };

  const formatDateVN = (v: string) => {
    const d = new Date(v);
    return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('vi-VN');
  };

  // Edit form state
  const [editItems, setEditItems] = useState<EditItemRow[]>([emptyEditRow()]);
  const [editMucDich, setEditMucDich] = useState('');
  const [editMucDoUuTien, setEditMucDoUuTien] = useState('Trung bình');
  const [editGhiChu, setEditGhiChu] = useState('');
  // Product catalogue + stock for the edit form, so goods are picked like in the
  // create form (ProductCombobox) instead of free-text typing.
  const [editProducts, setEditProducts] = useState<InternationalProduct[]>([]);
  const [editStockCache, setEditStockCache] = useState<Map<string, { totalQuantity: number; unit: string }>>(new Map());

  useEffect(() => {
    if (showModal && modalMode === 'edit' && editProducts.length === 0) {
      internationalProductService.getAllProducts(1, 10000)
        .then((res) => setEditProducts(res.data || []))
        .catch((err) => console.error('Error fetching products for edit:', err));
    }
  }, [showModal, modalMode, editProducts.length]);

  const fetchEditStock = async (productId: string) => {
    if (editStockCache.has(productId)) return editStockCache.get(productId)!;
    try {
      const response = await internationalProductService.getStockSummary(productId);
      const stockInfo = { totalQuantity: response.data.totalQuantity, unit: response.data.unit || 'Kg' };
      setEditStockCache((prev) => new Map(prev).set(productId, stockInfo));
      return stockInfo;
    } catch (error) {
      console.error('Error fetching stock:', error);
      return null;
    }
  };

  const updateEditItem = (index: number, updates: Partial<EditItemRow>) =>
    setEditItems((prev) => prev.map((row, i) => (i === index ? { ...row, ...updates } : row)));

  const handleEditProductSelect = async (index: number, _productId: string | null, product: InternationalProduct | null) => {
    const row = editItems[index];
    // A line the warehouse already (partly) issued keeps its identity — changing it
    // would orphan the fulfilment decisions recorded against it.
    if (row?.fulfilledQty && row.fulfilledQty > 0) return;
    if (!product) {
      updateEditItem(index, { internationalProductId: null, tenGoi: '', phanLoai: '', donViTinh: 'Kg', stockInfo: undefined });
      return;
    }
    const stockInfo = await fetchEditStock(product.id);
    updateEditItem(index, {
      internationalProductId: product.id,
      tenGoi: product.tenSanPham,
      phanLoai: product.loaiSanPham || '',
      donViTinh: product.donViTinh || 'Kg',
      isNewProduct: false,
      stockInfo: stockInfo || undefined,
    });
  };

  const handleEditCreateNew = (index: number, tenSanPham: string) => {
    const row = editItems[index];
    if (row?.fulfilledQty && row.fulfilledQty > 0) return;
    updateEditItem(index, { internationalProductId: null, tenGoi: tenSanPham, phanLoai: '', donViTinh: 'Kg', isNewProduct: true, stockInfo: undefined });
  };

  const removeEditRow = (index: number) => {
    const row = editItems[index];
    // A partially issued line cannot be dropped — the audit trail and stock
    // movements behind it would dangle. Enforced again server-side.
    if (row?.fulfilledQty && row.fulfilledQty > 0) return;
    setEditItems((prev) => prev.filter((_, i) => i !== index));
  };

  useEffect(() => {
    fetchRequests();
  }, [currentPage, serverFilters]);

  // Deep-link reader: keeps ?supplyRequestId= in sync even though close deletes it
  useEffect(() => {
    const srId = urlDetailId;
    // When the user just closed the modal we pushed a replace that deleted the id; the
    // companion effect that syncs detailUrlId→searchParams will echo back through the
    // shared searchParams object for one tick — skip that echo so the modal does not
    // snap back open.
    if (syncingRef.current) {
      syncingRef.current = false;
      return;
    }
    if (!srId) return;
    let cancelled = false;
    supplyRequestService.getSupplyRequestById(srId).then((res) => {
      if (!cancelled && res.data) {
        setSelectedRequest(res.data as SupplyRequest);
        setModalMode('view');
        setShowModal(true);
      }
    }).catch((err) => {
      console.error('Error loading supply request from URL:', err);
    });
    return () => { cancelled = true; };
  }, [urlDetailId]);

  // Load decision history whenever the detail modal opens in view mode.
  useEffect(() => {
    if (showModal && modalMode === 'view' && selectedRequest?.id) {
      setLoadingDecisions(true);
      supplyRequestService.getDecisionHistory(selectedRequest.id)
        .then((res: any) => {
          const payload = res?.data ?? res;
          setDecisions((payload?.data ?? payload ?? []) as any[]);
        })
        .catch(() => setDecisions([]))
        .finally(() => setLoadingDecisions(false));
    } else {
      setDecisions([]);
    }
  }, [showModal, modalMode, selectedRequest?.id]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const response: any = await supplyRequestService.getAllSupplyRequests(currentPage, itemsPerPage, serverFilters as any);
      // apiClient returns axios response: response.data is the JSON payload, response.pagination is inside response.data.pagination
      const payload = response.data ?? response;
      const rows = (payload.data ?? payload) as SupplyRequest[];
      const pagination = payload.pagination ?? response.pagination;
      setRequests(Array.isArray(rows) ? rows : []);
      setTotalItems(pagination?.total ?? pagination?.totalItems ?? (Array.isArray(rows) ? rows.length : 0));
    } catch (error: any) {
      alert(error.response?.data?.message || 'Lỗi khi tải danh sách yêu cầu cung cấp');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (item: SupplyRequest) => {
    pushDetailId(item.id);
    setModalMode('edit');
    setSelectedRequest(item);
    // Carry each line's id + fulfilledQty: the server matches on id to preserve the
    // fulfilment audit (delete-then-recreate would otherwise reset it to 0).
    const rows: EditItemRow[] = (item.items && item.items.length > 0)
      ? item.items.map((i) => ({
          id: i.id,
          internationalProductId: null,
          phanLoai: i.phanLoai,
          tenGoi: i.tenGoi,
          soLuong: i.soLuong,
          donViTinh: i.donViTinh,
          fulfilledQty: i.fulfilledQty ?? null,
          isNewProduct: i.isNewProduct,
        }))
      : [emptyEditRow()];
    setEditItems(rows);
    setEditMucDich(item.mucDichYeuCau);
    setEditMucDoUuTien(item.mucDoUuTien);
    setEditGhiChu(item.ghiChu || '');
    setEditStockCache(new Map());
    setShowModal(true);
  };

  const handleView = (item: SupplyRequest) => {
    pushDetailId(item.id);
    setModalMode('view');
    setSelectedRequest(item);
    setShowModal(true);
  };

  /**
   * Single exit for the detail modal. Every close path must go through this —
   * the header X and the "Đóng"/"Hủy" buttons previously called
   * `setShowModal(false)` alone, leaving `?supplyRequestId=` on the URL. That
   * param is deep-link-readable, so the next reload — or a tab switch away and
   * back — silently reopened a record the user had already dismissed, and Back
   * needed two presses to leave the page.
   */
  const closeDetailModal = () => {
    setShowModal(false);
    popDetailId();
  };

  const handleDelete = (id: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Xác nhận xóa',
      message: 'Bạn có chắc chắn muốn xóa yêu cầu này?',
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        setLoading(true);
        try {
          await supplyRequestService.deleteSupplyRequest(id);
          fetchRequests();
        } catch (error: any) {
          alert(error.response?.data?.message || 'Lỗi khi xóa yêu cầu cung cấp');
        } finally {
          setLoading(false);
        }
      },
    });
  };

  const handleCancel = (id: string, maYeuCau: string) => {
    setCancelTargetId(id);
    setCancelTargetCode(maYeuCau);
  };

  const confirmCancelSupplyRequest = async (lyDoHuy: string) => {
    if (!cancelTargetId) return;
    setCancelling(true);
    try {
      await supplyRequestService.cancelSupplyRequest(cancelTargetId, lyDoHuy);
      setCancelTargetId(null);
      fetchRequests();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Lỗi khi hủy yêu cầu cung cấp');
    } finally {
      setCancelling(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedRequest) {
      alert('Không tìm thấy thông tin yêu cầu');
      return;
    }

    // Validate rows
    for (let i = 0; i < editItems.length; i++) {
      const row = editItems[i];
      if (!row.tenGoi || !row.tenGoi.trim()) {
        alert(`Dòng ${i + 1}: Vui lòng chọn hàng hóa`);
        return;
      }
      if (!row.donViTinh || !row.donViTinh.trim()) {
        alert(`Dòng ${i + 1}: Vui lòng chọn đơn vị tính`);
        return;
      }
      if (row.soLuong <= 0) {
        alert(`Dòng ${i + 1}: Số lượng phải lớn hơn 0`);
        return;
      }
      // Cannot un-deliver: quantity may only stay at or rise above what the
      // warehouse already handed out (the server enforces the same rule).
      if (row.fulfilledQty && row.soLuong < row.fulfilledQty - 1e-9) {
        alert(`Dòng ${i + 1}: Số lượng không thể thấp hơn mức đã cấp (${row.fulfilledQty})`);
        return;
      }
    }

    const names = editItems.map((r) => (r.tenGoi || '').trim().toLowerCase()).filter(Boolean);
    const dup = names.find((name, idx) => names.indexOf(name) !== idx);
    if (dup) {
      alert(`Hàng hóa "${editItems.find((r) => r.tenGoi.trim().toLowerCase() === dup)?.tenGoi}" bị trùng lặp`);
      return;
    }

    if (!editMucDich || !editMucDich.trim()) {
      alert('Vui lòng nhập mục đích yêu cầu');
      return;
    }

    setLoading(true);
    try {
      await supplyRequestService.updateSupplyRequest(selectedRequest.id, {
        items: editItems.map((row) => ({
          // id lets the server carry over fulfilledQty / fulfillmentStatus.
          ...(row.id ? { id: row.id } : {}),
          phanLoai: row.phanLoai || 'Khác',
          tenGoi: row.tenGoi,
          soLuong: row.soLuong,
          donViTinh: row.donViTinh,
          isNewProduct: row.isNewProduct ?? false,
        })),
        mucDichYeuCau: editMucDich,
        mucDoUuTien: editMucDoUuTien,
        ghiChu: editGhiChu,
      });
      alert('Cập nhật yêu cầu cung cấp thành công!');
      closeDetailModal();
      fetchRequests();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Lỗi khi cập nhật yêu cầu cung cấp');
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Cao':
        return 'text-red-600 bg-red-100';
      case 'Trung bình':
        return 'text-yellow-600 bg-yellow-100';
      case 'Thấp':
        return 'text-green-600 bg-green-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const handleCheckInventory = async (productNames: string[]) => {
    if (!productNames || productNames.length === 0) {
      alert('Không có tên hàng hóa để kiểm tra tồn kho');
      return;
    }

    setInventoryCheckResult({ show: true, loading: true, productName: productNames.join(', '), items: [], allResults: [] });

    try {
      // Server-side fuzzy lookup — returns only the grouped matches instead of
      // the entire lotProduct table.
      const response = await warehouseService.checkStockByNames(productNames) as any;
      const allResults = response.data?.data || response.data || [];
      setInventoryCheckResult({ show: true, loading: false, productName: productNames.join(', '), items: [], allResults });
    } catch (error) {
      console.error('Lỗi kiểm tra tồn kho:', error);
      setInventoryCheckResult({ show: true, loading: false, productName: productNames.join(', '), items: [], allResults: [] });
    }
  };

  // Filtering is server-side (see serverFilters) — `requests` is already the
  // filtered+paginated slice, so render it directly.
  const filteredRequests = requests;

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Yêu cầu cung cấp</h2>
          <button
            onClick={async () => {
              try {
                await supplyRequestService.exportToExcel(serverFilters as any);
              } catch (error) {
                console.error('Error exporting to Excel:', error);
                alert('Lỗi khi xuất Excel');
              }
            }}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 w-full sm:w-auto"
          >
            <Download className="h-4 w-4" />
            Xuất Excel
          </button>
        </div>
        <TableFilter
          filters={supplyFilterFields}
          values={filterValues}
          onChange={handleFilterChange}
          searchPlaceholder="Tìm kiếm theo mã, tên nhân viên, bộ phận, hàng hóa..."
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="overflow-x-auto -mx-px">
          <table className="w-full min-w-[840px] lg:min-w-[1120px] table-fixed">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th scope="col" className="px-2 lg:px-4 py-3 text-left text-xs font-semibold text-gray-900 border-r border-gray-200 w-9">#</th>
                <th scope="col" className="px-2 lg:px-4 py-3 text-left text-xs font-semibold text-gray-900 border-r border-gray-200 w-20 lg:w-24">Ngày YC</th>
                <th scope="col" className="px-2 lg:px-4 py-3 text-left text-xs font-semibold text-gray-900 border-r border-gray-200 w-28 lg:w-36">Mã YC</th>
                <th scope="col" className="px-2 lg:px-4 py-3 text-left text-xs font-semibold text-gray-900 border-r border-gray-200 hidden sm:table-cell w-32 lg:w-40">Nhân viên</th>
                <th scope="col" className="px-2 lg:px-4 py-3 text-left text-xs font-semibold text-gray-900 border-r border-gray-200 hidden md:table-cell w-28 lg:w-40">Bộ phận</th>
                <th scope="col" className="px-2 lg:px-4 py-3 text-left text-xs font-semibold text-gray-900 border-r border-gray-200">Hàng hóa</th>
                <th scope="col" className="px-2 lg:px-4 py-3 text-center text-xs font-semibold text-gray-900 border-r border-gray-200 w-20 lg:w-24">Ưu tiên</th>
                <th scope="col" className="px-2 lg:px-4 py-3 text-center text-xs font-semibold text-gray-900 border-r border-gray-200 w-24 lg:w-32">Trạng thái</th>
                <th scope="col" className="px-2 lg:px-4 py-3 text-center text-xs font-semibold text-gray-900 w-16 lg:w-20">
                  <span className="hidden sm:inline">Hành động</span>
                  <span className="sm:hidden">•••</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-6 py-8 text-center text-gray-500">
                    Đang tải...
                  </td>
                </tr>
              ) : filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-8 text-center text-gray-500">
                    Không có dữ liệu
                  </td>
                </tr>
              ) : (
                filteredRequests.map((request, index) => (
                  <tr
                    key={request.id}
                    onClick={() => handleView(request)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleView(request);
                      }
                    }}
                    tabIndex={0}
                    role="button"
                    aria-label={`Xem chi tiết yêu cầu ${request.maYeuCau} của ${request.tenNhanVien}`}
                    className={`${
                      request.trangThai === 'Đã mua hàng'
                        ? 'bg-amber-50 border-l-4 border-l-amber-400'
                        : index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                    } hover:bg-blue-100 focus:bg-blue-100 focus:outline-none border-l-2 border-l-transparent hover:border-l-blue-500 cursor-pointer transition-all border-b border-gray-200`}
                  >
                    <td className="px-2 lg:px-4 py-2 sm:py-3 text-sm border-r border-gray-200 text-center">{(currentPage - 1) * itemsPerPage + index + 1}</td>
                    <td className="px-2 lg:px-4 py-2 sm:py-3 text-xs sm:text-sm border-r border-gray-200 whitespace-nowrap">{formatDateVN(request.ngayYeuCau)}</td>
                    <td className="px-2 lg:px-4 py-2 sm:py-3 text-xs sm:text-sm font-medium text-indigo-600 border-r border-gray-200 whitespace-nowrap" title={request.maYeuCau}>{request.maYeuCau}</td>
                    <td className="px-2 lg:px-4 py-2 sm:py-3 text-xs sm:text-sm border-r border-gray-200 hidden sm:table-cell truncate" title={request.tenNhanVien}>{request.tenNhanVien}</td>
                    <td className="px-2 lg:px-4 py-2 sm:py-3 text-xs sm:text-sm border-r border-gray-200 hidden md:table-cell truncate" title={normalizeBoPhanLabel(request.boPhan)}>{normalizeBoPhanLabel(request.boPhan)}</td>
                    <td className="px-2 lg:px-4 py-2 sm:py-3 text-xs sm:text-sm border-r border-gray-200 min-w-0">
                      {request.items && request.items.length > 0 ? (
                        <span className="text-gray-700 line-clamp-2 break-words" title={request.items.map((i: any) => i.tenGoi).join(', ')}>{request.items.map((i: any) => i.tenGoi).join(', ')}</span>
                      ) : (
                        <span className="text-gray-400 italic">Không có</span>
                      )}
                    </td>
                    <td className="px-2 lg:px-4 py-2 sm:py-3 text-center text-sm border-r border-gray-200">
                      <span className={`inline-flex px-1.5 lg:px-2 py-0.5 rounded-full text-[10px] lg:text-xs font-medium whitespace-nowrap ${getPriorityColor(request.mucDoUuTien)}`}>
                        {request.mucDoUuTien}
                      </span>
                    </td>
                    <td className="px-2 lg:px-4 py-2 sm:py-3 text-center text-sm border-r border-gray-200" title={request.trangThai}>
                      <span className={`inline-flex px-1.5 lg:px-2 py-0.5 rounded-full text-[10px] lg:text-xs font-medium whitespace-nowrap ${getStatusColor(request.trangThai)}`}>
                        <span className="hidden lg:inline">{request.trangThai}</span>
                        <span className="lg:hidden">{getStatusLabel(request.trangThai)}</span>
                      </span>
                    </td>
                    <td className="px-2 lg:px-4 py-2 sm:py-3 text-center text-sm" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-0.5">
                        {!isCancelled(request.trangThai) && canDelete && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDelete(request.id); }}
                            onKeyDown={(e) => e.stopPropagation()}
                            className="min-h-[32px] min-w-[32px] inline-flex items-center justify-center p-1 lg:p-1.5 rounded-md text-red-600 hover:bg-red-100 hover:text-red-800 transition-colors focus:outline-none focus:ring-1 focus:ring-red-400"
                            title="Xóa"
                            aria-label={`Xóa yêu cầu ${request.maYeuCau}`}
                          >
                            <Trash2 className="h-3.5 w-3.5 lg:h-4 lg:w-4" />
                          </button>
                        )}

                        {!isCancelled(request.trangThai) && canCancel && (request.trangThai === 'Chưa cung cấp' || request.trangThai === 'Đang xử lý') && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleCancel(request.id, request.maYeuCau); }}
                            onKeyDown={(e) => e.stopPropagation()}
                            className="min-h-[32px] min-w-[32px] inline-flex items-center justify-center p-1 lg:p-1.5 rounded-md text-orange-600 hover:bg-orange-100 hover:text-orange-800 transition-colors focus:outline-none focus:ring-1 focus:ring-orange-400"
                            title="Hủy yêu cầu"
                            aria-label={`Hủy yêu cầu ${request.maYeuCau}`}
                          >
                            <XCircle className="h-3.5 w-3.5 lg:h-4 lg:w-4" />
                          </button>
                        )}

                        {/* Nhập kho chỉ hợp lệ khi thu mua đã thật sự mua hàng xong.
                            "Đã duyệt mua" = admin mới duyệt, hàng chưa về → không cho nhập.
                            "Đã nhập kho" giữ lại để nhập thêm đợt giao thứ 2. */}
                        {['Đã mua hàng', 'Đã nhập kho'].includes(request.trangThai) && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedRequest(request);
                              setShowWarehouseReceiptModal(true);
                            }}
                            onKeyDown={(e) => e.stopPropagation()}
                            className="min-h-[32px] min-w-[32px] inline-flex items-center justify-center p-1 lg:p-1.5 rounded-md text-green-600 hover:bg-green-100 hover:text-green-800 transition-colors focus:outline-none focus:ring-1 focus:ring-green-400"
                            title="Nhập kho"
                            aria-label={`Nhập kho cho ${request.maYeuCau}`}
                          >
                            <PackagePlus className="h-3.5 w-3.5 lg:h-4 lg:w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {(() => {
          const totalPages = Math.ceil(totalItems / itemsPerPage);
          return totalPages > 1 ? (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-4 px-2">
              <span className="text-sm text-gray-600">
                Hiển thị {(currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, totalItems)} / {totalItems} mục
              </span>
              <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Trước
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(page => page === 1 || page === totalPages || Math.abs(page - currentPage) <= 2)
                  .map((page, idx, arr) => (
                    <React.Fragment key={page}>
                      {idx > 0 && arr[idx - 1] !== page - 1 && <span className="px-1 text-gray-400">...</span>}
                      <button
                        onClick={() => setCurrentPage(page)}
                        className={`px-3 py-1.5 text-sm rounded-md ${page === currentPage ? 'bg-blue-600 text-white' : 'border border-gray-300 hover:bg-gray-50'}`}
                      >
                        {page}
                      </button>
                    </React.Fragment>
                  ))}
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Sau
                </button>
              </div>
            </div>
          ) : null;
        })()}
      </div>

      {/* Modal Edit/View */}
      <Modal
        isOpen={showModal && !!selectedRequest}
        onClose={closeDetailModal}
        showBackdrop
        closeOnBackdrop={modalMode === 'view'}
      >
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl md:max-w-5xl lg:max-w-6xl flex flex-col modal-viewport-h overflow-hidden" onClick={(e) => e.stopPropagation()}>
          {/* Header — ghim cố định (đồng bộ ModalForm của form tạo). */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
            <h2 className="text-base font-semibold text-gray-900">
              {modalMode === 'edit' ? 'Chỉnh sửa yêu cầu' : 'Chi tiết yêu cầu'}
              {selectedRequest && <span className="ml-2 text-sm font-normal text-gray-500">{selectedRequest.maYeuCau}</span>}
            </h2>
            <button onClick={closeDetailModal} aria-label="Đóng" className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
              <X className="h-5 w-5" />
            </button>
          </div>
          {/* Body — chỉ phần nội dung cuộn được. */}
          <div className="p-4 md:p-6 overflow-y-auto flex-1 min-h-0">
            {selectedRequest && (<>

              {/* Request header info (always shown) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4 text-sm bg-gray-50 p-3 rounded-md">
                <div><span className="font-medium text-gray-600">Mã yêu cầu:</span> <span className="text-indigo-600 font-medium">{selectedRequest.maYeuCau}</span></div>
                <div><span className="font-medium text-gray-600">Ngày yêu cầu:</span> {formatDateVN(selectedRequest.ngayYeuCau)}</div>
                <div><span className="font-medium text-gray-600">Nhân viên:</span> {selectedRequest.tenNhanVien}</div>
                <div><span className="font-medium text-gray-600">Bộ phận:</span> {normalizeBoPhanLabel(selectedRequest.boPhan)}</div>
                <div className="sm:col-span-2 flex items-center gap-2">
                  <span className="font-medium text-gray-600">Trạng thái:</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedRequest.trangThai)}`}>
                    {selectedRequest.trangThai}
                  </span>
                </div>
              </div>

              {modalMode === 'view' ? (
                <div className="space-y-4">
                  {/* Items sub-table */}
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Danh sách hàng hóa</h3>
                    <div className="border border-gray-200 rounded-md overflow-x-auto -mx-px">
                      <table className="w-full min-w-[520px] lg:min-w-[640px] text-xs sm:text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase hidden lg:table-cell">Phân loại</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Tên gọi</th>
                            <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Yêu cầu</th>
                            <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Đã cấp</th>
                            <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Còn thiếu</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase hidden sm:table-cell">Đơn vị</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Trạng thái</th>
                            {canEdit && (
                              <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Thao tác</th>
                            )}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {selectedRequest.items && selectedRequest.items.length > 0 ? (
                            selectedRequest.items.map((item, idx) => {
                              const fulfilledQty = item.fulfilledQty ?? 0;
                              const fulfillmentStatus = item.fulfillmentStatus ?? 'Chờ xử lý';
                              const isDone = fulfillmentStatus === 'Đã cấp đủ' || fulfillmentStatus === 'Chuyển thu mua';
                              return (
                                <tr key={item.id} className="hover:bg-gray-50">
                                  <td className="px-3 py-2 text-gray-500">{idx + 1}</td>
                                  <td className="px-3 py-2 hidden lg:table-cell">{item.phanLoai}</td>
                                  <td className="px-3 py-2 font-medium">
                                    <span>{item.tenGoi}</span>
                                    {item.isNewProduct ? (
                                      canCreateProduct ? (
                                        <button
                                          type="button"
                                          onClick={() => openCreateProductFromItem(item)}
                                          title="Tạo hàng hóa này trong danh mục"
                                          className="ml-2 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-800 border border-amber-200 align-middle whitespace-nowrap hover:bg-amber-200 hover:border-amber-300 transition-colors"
                                        >
                                          <AlertTriangle className="h-3 w-3" />
                                          Mới
                                        </button>
                                      ) : (
                                        <span className="ml-2 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-800 border border-amber-200 align-middle whitespace-nowrap">
                                          <AlertTriangle className="h-3 w-3" />
                                          Mới
                                        </span>
                                      )
                                    ) : null}
                                  </td>
                                  <td className="px-3 py-2 text-right whitespace-nowrap">{item.soLuong.toLocaleString('vi-VN')}</td>
                                  <td className="px-3 py-2 text-right text-blue-700 font-medium whitespace-nowrap">
                                    {fulfilledQty.toLocaleString('vi-VN')}
                                  </td>
                                  <td className="px-3 py-2 text-right whitespace-nowrap">
                                    {(() => {
                                      const shortage = Math.max(0, item.soLuong - fulfilledQty);
                                      return shortage > 0 ? (
                                        <span className="text-orange-600 font-medium">{shortage.toLocaleString('vi-VN')}</span>
                                      ) : (
                                        <span className="text-gray-400">0</span>
                                      );
                                    })()}
                                  </td>
                                  <td className="px-3 py-2 hidden sm:table-cell">{item.donViTinh}</td>
                                  <td className="px-3 py-2" title={fulfillmentStatus}>
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${getFulfillmentStatusColor(fulfillmentStatus)}`}>
                                      {getFulfillmentStatusLabel(fulfillmentStatus)}
                                    </span>
                                  </td>
                                  {canEdit && (
                                    <td className="px-3 py-2 text-center">
                                      {!isDone && fulfilledQty < item.soLuong && (
                                        <button
                                          type="button"
                                          onClick={() => setPartialFulfillItem(item)}
                                          className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-orange-600 text-white rounded hover:bg-orange-700"
                                          title="Cấp một phần"
                                        >
                                          <PackageCheck className="h-3 w-3" />
                                          Cấp một phần
                                        </button>
                                      )}
                                    </td>
                                  )}
                                </tr>
                              );
                            })
                          ) : (
                            <tr>
                              <td colSpan={canEdit ? 9 : 8} className="px-3 py-4 text-center text-gray-400 italic">Không có hàng hóa</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Other fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <div><span className="font-medium text-gray-600">Mức độ ưu tiên:</span> <span className={`ml-1 px-2 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(selectedRequest.mucDoUuTien)}`}>{selectedRequest.mucDoUuTien}</span></div>
                    <div><span className="font-medium text-gray-600">Mục đích:</span> <span className="text-gray-700">{selectedRequest.mucDichYeuCau}</span></div>
                    {selectedRequest.ghiChu && (
                      <div className="sm:col-span-2"><span className="font-medium text-gray-600">Ghi chú:</span> <span className="text-gray-700">{selectedRequest.ghiChu}</span></div>
                    )}
                    {isCancelled(selectedRequest.trangThai) && (
                      <div className="sm:col-span-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2">
                        <span className="font-medium text-red-800">Lý do hủy:</span>{' '}
                        <span className="text-red-900">{selectedRequest.lyDoHuy || 'Không có lý do (hủy trước khi tính năng này có)'}</span>
                        {selectedRequest.nguoiHuy && (
                          <span className="text-red-700 text-xs"> · bởi {selectedRequest.nguoiHuy}</span>
                        )}
                        {selectedRequest.ngayHuy && (
                          <span className="text-red-700 text-xs"> · {new Date(selectedRequest.ngayHuy).toLocaleString('vi-VN')}</span>
                        )}
                      </div>
                    )}
                    {selectedRequest.loaiYeuCau && (
                      <div><span className="font-medium text-gray-600">Loại yêu cầu:</span> <span className="text-gray-700">{selectedRequest.loaiYeuCau}</span></div>
                    )}
                    {selectedRequest.soTien !== undefined && selectedRequest.soTien !== null && (
                      <div><span className="font-medium text-gray-600">Số tiền:</span> <span className="text-gray-700">{Number(selectedRequest.soTien).toLocaleString('vi-VN')} VNĐ</span></div>
                    )}
                    {selectedRequest.fileKemTheo && (
                      <div className="sm:col-span-2"><span className="font-medium text-gray-600">File đính kèm:</span> <a href={selectedRequest.fileKemTheo} target="_blank" rel="noopener noreferrer" className="ml-1 text-blue-600 hover:underline">Mở file</a></div>
                    )}
                    <div><span className="font-medium text-gray-600">Tạo lúc:</span> <span className="text-gray-700">{new Date(selectedRequest.createdAt).toLocaleString('vi-VN')}</span></div>
                    <div><span className="font-medium text-gray-600">Cập nhật:</span> <span className="text-gray-700">{new Date(selectedRequest.updatedAt).toLocaleString('vi-VN')}</span></div>
                  </div>

                  {/* Linked purchasing / warehouse docs */}
                  {(selectedRequest.replenishmentRequests?.length || selectedRequest.purchaseRequests?.length || selectedRequest.warehouseReceipts?.length) ? (
                    <div className="rounded-md border border-gray-200 bg-gray-50 p-3 text-sm">
                      <div className="font-medium text-gray-700 mb-2">Liên kết</div>
                      {selectedRequest.replenishmentRequests && selectedRequest.replenishmentRequests.length > 0 && (
                        <div className="mb-2">
                          <div className="text-xs text-gray-500 mb-1">Yêu cầu bổ sung</div>
                          <div className="flex flex-wrap gap-2">
                            {selectedRequest.replenishmentRequests.map((rr) => (
                              <span
                                key={rr.id}
                                title={rr.trangThai === 'Đã hủy' ? `Lý do hủy: ${rr.lyDoHuy || 'không có'}${rr.ngayHuy ? ` · ${new Date(rr.ngayHuy).toLocaleDateString('vi-VN')}` : ''}` : undefined}
                                className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-white border ${rr.trangThai === 'Đã hủy' ? 'border-red-200' : 'border-amber-200'}`}
                              >
                                <PackageOpen className={`h-3 w-3 ${rr.trangThai === 'Đã hủy' ? 'text-red-500' : 'text-amber-600'}`} />
                                <span className={`font-medium ${rr.trangThai === 'Đã hủy' ? 'text-gray-500 line-through' : 'text-gray-800'}`}>{rr.maYeuCau}</span>
                                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${rr.trangThai === 'Đã chuyển mua hàng' ? 'bg-green-100 text-green-700' : rr.trangThai === 'Đã hủy' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{rr.trangThai}</span>
                                {rr.convertedPurchaseRequest ? (
                                  <span className="text-[11px] text-blue-600">→ {rr.convertedPurchaseRequest.maYeuCau}</span>
                                ) : null}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {selectedRequest.purchaseRequests && selectedRequest.purchaseRequests.length > 0 && (
                        <div className="mb-2">
                          <div className="text-xs text-gray-500 mb-1">Yêu cầu mua hàng</div>
                          <div className="flex flex-wrap gap-2">
                            {selectedRequest.purchaseRequests.map((pr) => {
                              const itemCount = pr.items?.length ?? 0;
                              // Which of these purchases the warehouse already received —
                              // the receipt carries purchaseRequestId since the YCBS split.
                              const receivedBy = (selectedRequest.warehouseReceipts ?? []).filter((wr) => wr.purchaseRequestId === pr.id);
                              return (
                                <span key={pr.id} className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-white border border-gray-200">
                                  <ShoppingCart className="h-3 w-3 text-blue-600" />
                                  <span className="font-medium text-gray-800">{pr.maYeuCau}</span>
                                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${pr.trangThai === 'Hoàn thành' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{pr.trangThai}</span>
                                  {itemCount > 0 && (
                                    <span
                                      className="text-[10px] text-gray-500"
                                      title={pr.items!.map((it) => `${it.tenHangHoa}: ${it.soLuong}${it.donViTinh ? ` ${it.donViTinh}` : ''}`).join(' · ')}
                                    >
                                      · {itemCount} dòng
                                    </span>
                                  )}
                                  {receivedBy.length > 0 && (
                                    <span className="text-[10px] text-green-700">· đã nhập {receivedBy.map((wr) => wr.maPhieuNhap).join(', ')}</span>
                                  )}
                                </span>
                              );
                            })}
                          </div>
                          {/* Per-line purchased quantities, so the warehouse knows what to receive. */}
                          {selectedRequest.purchaseRequests
                            .filter((pr) => pr.trangThai === 'Hoàn thành' && (pr.items?.length ?? 0) > 0)
                            .map((pr) => (
                              <table key={`items-${pr.id}`} className="mt-2 w-full text-xs border border-gray-200 rounded overflow-hidden">
                                <thead className="bg-gray-50 text-gray-500">
                                  <tr>
                                    <th className="px-2 py-1 text-left font-medium">Đã mua theo {pr.maYeuCau}</th>
                                    <th className="px-2 py-1 text-right font-medium w-24">Số lượng</th>
                                    <th className="px-2 py-1 text-left font-medium w-20">ĐVT</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                  {(pr.items ?? []).map((it, i) => {
                                    // A line the warehouse added by hand on the YCBS was never
                                    // part of this request — flag it so the receiver knows.
                                    const onSr = (selectedRequest.items ?? []).some((sr) =>
                                      sr.tenGoi.trim().toLowerCase() === it.tenHangHoa.trim().toLowerCase());
                                    return (
                                      <tr key={`${pr.id}-${i}`}>
                                        <td className="px-2 py-1">
                                          {it.tenHangHoa}
                                          {!onSr && (
                                            <span
                                              className="ml-1 px-1 py-0.5 rounded text-[9px] bg-violet-100 text-violet-700"
                                              title="Không nằm trong yêu cầu cung cấp gốc — do kho thêm vào yêu cầu bổ sung"
                                            >
                                              ngoài YC
                                            </span>
                                          )}
                                        </td>
                                        <td className="px-2 py-1 text-right font-medium text-blue-700">{Number(it.soLuong).toLocaleString('vi-VN')}</td>
                                        <td className="px-2 py-1 text-gray-500">{it.donViTinh || '—'}</td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            ))}
                        </div>
                      )}
                      {selectedRequest.warehouseReceipts && selectedRequest.warehouseReceipts.length > 0 && (
                        <div>
                          <div className="text-xs text-gray-500 mb-1">Phiếu nhập kho</div>
                          <div className="flex flex-wrap gap-2">
                            {selectedRequest.warehouseReceipts.map((wr) => (
                              <span key={wr.id} className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-white border border-gray-200">
                                <PackagePlus className="h-3 w-3 text-green-600" />
                                <span className="font-medium text-gray-800">{wr.maPhieuNhap}</span>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : null}

                  {/* Decision / audit history */}
                  <div className="rounded-md border border-gray-200">
                    <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-200 rounded-t-md">
                      <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Lịch sử xử lý</h4>
                      <span className="text-[11px] text-gray-500">{loadingDecisions ? 'Đang tải…' : `${decisions.length} quyết định`}</span>
                    </div>
                    <div className="p-3">
                      {loadingDecisions ? (
                        <div className="text-xs text-gray-500">Đang tải lịch sử…</div>
                      ) : decisions.length === 0 ? (
                        <div className="text-xs text-gray-400 italic">Chưa có quyết định cấp phát nào.</div>
                      ) : (
                        <div className="space-y-2">
                          {decisions.map((d: any) => (
                            <div key={d.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 rounded-md bg-white border border-gray-100 px-3 py-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium whitespace-nowrap ${getDecisionColor(d.decision)}`}>{d.decision}</span>
                                <span className="text-xs text-gray-600">{d.supplyRequestItem?.tenGoi ?? '—'}</span>
                                <span className="text-xs text-gray-500">• Cấp {d.fulfilledQty} • Thiếu {d.shortageQty}</span>
                              </div>
                              <div className="text-[11px] text-gray-400 whitespace-nowrap">
                                {d.decidedAt ? new Date(d.decidedAt).toLocaleString('vi-VN') : ''}
                                {/* New path: decision → YCBS (which may already be → YCMH). */}
                                {d.triggeredReplenishmentRequest ? (
                                  <span className="ml-2 text-amber-700">
                                    → {d.triggeredReplenishmentRequest.maYeuCau}
                                    {d.triggeredReplenishmentRequest.trangThai === 'Đã chuyển mua hàng' && d.triggeredReplenishmentRequest.convertedPurchaseRequest
                                      ? <span className="text-blue-600"> → {d.triggeredReplenishmentRequest.convertedPurchaseRequest.maYeuCau}</span>
                                      : null}
                                  </span>
                                ) : null}
                                {/* Legacy: decision created a SHORTAGE PurchaseRequest directly. */}
                                {!d.triggeredReplenishmentRequest && d.triggeredPurchaseRequest ? (
                                  <span className="ml-2 text-blue-600">→ {d.triggeredPurchaseRequest.maYeuCau}</span>
                                ) : null}
                                {d.reason ? <span className="ml-2 text-gray-500">— {d.reason}</span> : null}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                /* Edit mode */
                <form id="yccb-edit-form" onSubmit={handleSubmit} className="space-y-4">
                  {/* Header fields the user must not type — derived from the record. */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField label="Người tạo">
                      <input type="text" readOnly value={selectedRequest.tenNhanVien || '—'} className={readonlyCls} />
                    </FormField>
                    <FormField label="Mã nhân viên">
                      <input type="text" readOnly value={selectedRequest.maNhanVien || '—'} className={readonlyCls} />
                    </FormField>
                    <FormField label="Bộ phận">
                      <input type="text" readOnly value={normalizeBoPhanLabel(selectedRequest.boPhan)} className={readonlyCls} />
                    </FormField>
                    <FormField label="Mã yêu cầu">
                      <input type="text" readOnly value={selectedRequest.maYeuCau} className={readonlyCls} />
                    </FormField>
                    <FormField label="Thời gian tạo">
                      <input
                        type="text"
                        readOnly
                        value={new Date(selectedRequest.createdAt).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })}
                        className={readonlyCls}
                      />
                    </FormField>
                    <FormField label="Cập nhật lúc">
                      <input
                        type="text"
                        readOnly
                        value={new Date(selectedRequest.updatedAt).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })}
                        className={readonlyCls}
                      />
                    </FormField>
                  </div>

                  {/* Danh sách hàng hóa — card layout mirroring the create form: goods are
                      picked from the catalogue, and a line the warehouse already issued
                      keeps its identity locked (only the quantity may rise). */}
                  <div>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-2">
                      <label className="text-sm font-medium text-gray-700">
                        Danh sách hàng hóa <span className="text-red-500">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setEditItems(prev => [...prev, emptyEditRow()])}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                      >
                        <Plus className="h-4 w-4" />
                        Thêm hàng hóa
                      </button>
                    </div>

                    {editItems.some(row => row.stockInfo && row.soLuong > row.stockInfo.totalQuantity) && (
                      <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                        <p className="text-sm text-amber-800">
                          Một số hàng hóa có số lượng yêu cầu <strong>lớn hơn tồn kho hiện tại</strong>. Vui lòng kiểm tra lại.
                        </p>
                      </div>
                    )}

                    <div className="space-y-3">
                      {editItems.map((row, idx) => {
                        const locked = (row.fulfilledQty ?? 0) > 0;
                        const belowFulfilled = locked && row.soLuong < (row.fulfilledQty ?? 0) - 1e-9;
                        const hasStockWarning = !locked && row.stockInfo && row.soLuong > row.stockInfo.totalQuantity;
                        return (
                          <div
                            key={row.id ?? `new-${idx}`}
                            className={`p-4 border rounded-lg transition-all ${
                              belowFulfilled || hasStockWarning ? 'border-amber-300 bg-amber-50/30' : 'border-gray-200 bg-gray-50/50'
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-semibold text-sm shrink-0 mt-1">
                                {idx + 1}
                              </div>

                              <div className="flex-1 space-y-3">
                                {locked ? (
                                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <FormField label="Phân loại">
                                      <input type="text" readOnly value={row.phanLoai} className={readonlyCls} />
                                    </FormField>
                                    <FormField label="Tên hàng hóa">
                                      <input type="text" readOnly value={row.tenGoi} className={readonlyCls} />
                                    </FormField>
                                    <FormField label="Đơn vị">
                                      <input type="text" readOnly value={row.donViTinh} className={readonlyCls} />
                                    </FormField>
                                  </div>
                                ) : (
                                  <div>
                                    <FormField label="Hàng hóa" required>
                                      <ProductCombobox
                                        products={editProducts}
                                        value={row.internationalProductId}
                                        onChange={(productId, product) => handleEditProductSelect(idx, productId, product)}
                                        onCreateNew={(name) => handleEditCreateNew(idx, name)}
                                        allowCreate
                                        initialText={row.tenGoi}
                                        placeholder="Tìm theo mã, tên hoặc loại hàng hóa, hoặc nhập tên mới..."
                                      />
                                    </FormField>
                                    {!row.internationalProductId && row.tenGoi && (
                                      <p className="mt-1.5 text-xs text-amber-700 flex items-center gap-1">
                                        <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
                                        Chưa có trong danh mục hàng hóa — kho sẽ xem xét khi xử lý
                                      </p>
                                    )}
                                    {row.stockInfo && (
                                      <div className={`mt-1.5 flex items-center gap-1.5 text-xs ${hasStockWarning ? 'text-amber-700' : 'text-green-700'}`}>
                                        <Package className="h-3.5 w-3.5" />
                                        <span>
                                          Tồn kho: <strong>{row.stockInfo.totalQuantity} {row.stockInfo.unit}</strong>
                                        </span>
                                        {hasStockWarning && <span className="text-amber-600 font-medium ml-1">(Yêu cầu vượt tồn!)</span>}
                                      </div>
                                    )}
                                  </div>
                                )}

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  <FormField label="Số lượng" required>
                                    <input
                                      type="number"
                                      value={row.soLuong || ''}
                                      onChange={(e) => updateEditItem(idx, { soLuong: parseNumberInput(e.target.value) })}
                                      required
                                      min={locked ? String(row.fulfilledQty) : '0.01'}
                                      step="0.01"
                                      className={inputCls(belowFulfilled)}
                                      placeholder="0.00"
                                    />
                                  </FormField>
                                  {locked ? (
                                    <div className="flex items-end">
                                      <p className="text-xs text-gray-500 pb-2">
                                        Đã cấp: <strong className="text-blue-700">{row.fulfilledQty} {row.donViTinh}</strong>
                                        {' '}— không thể giảm xuống dưới mức này
                                      </p>
                                    </div>
                                  ) : (
                                    <FormField label="Đơn vị" required>
                                      <UnitSelect
                                        value={row.donViTinh}
                                        onChange={(val) => updateEditItem(idx, { donViTinh: val })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                      />
                                    </FormField>
                                  )}
                                </div>

                                {belowFulfilled && (
                                  <p className="text-xs text-amber-700 flex items-center gap-1">
                                    <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
                                    Số lượng thấp hơn mức đã cấp ({row.fulfilledQty} {row.donViTinh})
                                  </p>
                                )}
                              </div>

                              <button
                                type="button"
                                onClick={() => removeEditRow(idx)}
                                disabled={locked || editItems.length === 1}
                                title={locked ? 'Dòng này đã được cấp phát — không thể xóa' : 'Xóa dòng'}
                                className="p-2 text-red-500 hover:bg-red-50 rounded-lg disabled:opacity-25 disabled:cursor-not-allowed shrink-0"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Other edit fields */}
                  <FormField label="Mục đích yêu cầu" required>
                    <textarea
                      value={editMucDich}
                      onChange={(e) => setEditMucDich(e.target.value)}
                      required
                      rows={2}
                      className={textareaCls()}
                    />
                  </FormField>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField label="Mức độ ưu tiên" required>
                      <select
                        value={editMucDoUuTien}
                        onChange={(e) => setEditMucDoUuTien(e.target.value)}
                        required
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      >
                        <option value="Cao">Cao</option>
                        <option value="Trung bình">Trung bình</option>
                        <option value="Thấp">Thấp</option>
                      </select>
                    </FormField>
                    <FormField label="Ghi chú">
                      <textarea
                        value={editGhiChu}
                        onChange={(e) => setEditGhiChu(e.target.value)}
                        rows={2}
                        className={textareaCls()}
                      />
                    </FormField>
                  </div>
                </form>
              )}
            </>)}
          </div>
          {/* Footer — pinned  (đồng bộ ModalForm: border-t, bg-gray-50, rounded-b, nội dung ngoài body). */}
          {selectedRequest && (
          <div className="px-6 py-4 border-t border-gray-200 shrink-0 bg-gray-50 rounded-b-xl">
            {modalMode === 'view' ? (
              !isCancelled(selectedRequest.trangThai) ? (
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                {!isCompleted(selectedRequest.trangThai) ? (
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                  {selectedRequest.items && selectedRequest.items.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        const names = selectedRequest.items.map(i => i.tenGoi).filter(Boolean);
                        handleCheckInventory(names);
                      }}
                      className="px-3 py-1.5 text-xs bg-teal-600 text-white rounded-md hover:bg-teal-700 flex items-center justify-center gap-1.5"
                    >
                      <ClipboardCheck className="h-3.5 w-3.5" />
                      Kiểm tra tồn kho
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      closeDetailModal();
                      setShowWarehouseIssueModal(true);
                    }}
                    className="px-3 py-1.5 text-xs bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center justify-center gap-1.5"
                  >
                    <Package className="h-3.5 w-3.5" />
                    Tạo xuất kho
                  </button>
                  {!(selectedRequest.replenishmentRequests?.some((rr) => rr.trangThai !== 'Đã hủy'))
                    && !(selectedRequest.purchaseRequests?.length)
                    && !isPurchasing(selectedRequest.trangThai) && (
                  <button
                    type="button"
                    onClick={() => {
                      closeDetailModal();
                      setShowReplenishmentModal(true);
                    }}
                    className="px-3 py-1.5 text-xs bg-amber-600 text-white rounded-md hover:bg-amber-700 flex items-center justify-center gap-1.5"
                  >
                    <ShoppingCart className="h-3.5 w-3.5" />
                    Tạo yêu cầu bổ sung
                  </button>
                  )}
                </div>
                ) : <div />}
                <div className="flex gap-3 shrink-0">
                  <button type="button" onClick={closeDetailModal} className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50">
                    Đóng
                  </button>
                  {canCancel && (selectedRequest.trangThai === 'Chưa cung cấp' || selectedRequest.trangThai === 'Đang xử lý') && (
                    <button
                      type="button"
                      onClick={() => {
                        closeDetailModal();
                        handleCancel(selectedRequest.id, selectedRequest.maYeuCau);
                      }}
                      className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 flex items-center gap-1.5"
                    >
                      <XCircle className="h-4 w-4" />
                      Hủy yêu cầu
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleEdit(selectedRequest)}
                    disabled={!canEdit || isCompleted(selectedRequest.trangThai)}
                    title={isCompleted(selectedRequest.trangThai) ? "Yêu cầu đã hoàn thành, không thể chỉnh sửa" : (!canEdit ? "Bạn không có quyền chỉnh sửa" : "")}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    Chỉnh sửa
                  </button>
                </div>
              </div>
              ) : (
                <div className="flex justify-end">
                  <button type="button" onClick={closeDetailModal} className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50">
                    Đóng
                  </button>
                </div>
              )
            ) : (
              <div className="flex flex-col sm:flex-row sm:justify-end gap-3">
                <button type="button" onClick={closeDetailModal} className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50">
                  Hủy
                </button>
                <button
                  type="submit"
                  form="yccb-edit-form"
                  disabled={loading || editItems.some((row) => (row.fulfilledQty ?? 0) > 0 && row.soLuong < (row.fulfilledQty ?? 0) - 1e-9)}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Đang xử lý...' : 'Cập nhật'}
                </button>
              </div>
            )}
          </div>
          )}
        </div>
      </Modal>

      <CreateWarehouseIssueModal
        isOpen={showWarehouseIssueModal}
        onClose={() => setShowWarehouseIssueModal(false)}
        supplyRequest={selectedRequest}
        onSuccess={() => {
          fetchRequests();
        }}
      />

      {/* Replenishment Request Modal — manual YCBS from the detail, not a YCMH */}
      <CreateReplenishmentRequestModal
        isOpen={showReplenishmentModal}
        onClose={() => setShowReplenishmentModal(false)}
        supplyRequest={selectedRequest}
        onSuccess={() => {
          fetchRequests();
          // Pull the clicked SR fresh so the new YCBS chip is visible without a full
          // list refresh (and so "Tạo yêu cầu bổ sung" hides itself correctly).
          if (selectedRequest?.id) {
            supplyRequestService.getSupplyRequestById(selectedRequest.id).then((res) => {
              if (res.data) setSelectedRequest(res.data as SupplyRequest);
            }).catch(() => {});
          }
        }}
      />

      {/* Warehouse Receipt Modal */}
      <CreateWarehouseReceiptModal
        isOpen={showWarehouseReceiptModal}
        onClose={() => setShowWarehouseReceiptModal(false)}
        supplyRequest={selectedRequest}
        onSuccess={() => {
          fetchRequests();
        }}
      />

      <PartialFulfillmentModal
        isOpen={!!partialFulfillItem}
        onClose={() => setPartialFulfillItem(null)}
        item={partialFulfillItem}
        onSuccess={async () => {
          await fetchRequests();
          if (selectedRequest?.id) {
            try {
              const res = await supplyRequestService.getSupplyRequestById(selectedRequest.id);
              if (res.data) setSelectedRequest(res.data as SupplyRequest);
            } catch (err) {
              console.error('Refresh selected supply request failed:', err);
            }
          }
        }}
      />

      {/* Popup kiểm tra tồn kho */}
      <Modal isOpen={inventoryCheckResult.show} onClose={() => setInventoryCheckResult(prev => ({ ...prev, show: false }))} showBackdrop closeOnBackdrop={true}>
        <div className="bg-white rounded-lg shadow-xl w-[700px] max-w-[90vw] flex flex-col modal-viewport-h" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between p-6 border-b shrink-0">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <Package className="w-5 h-5 text-teal-600" />
              Kiểm tra tồn kho
            </h3>
            <button
              onClick={() => setInventoryCheckResult(prev => ({ ...prev, show: false }))}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="overflow-y-auto flex-1 p-6">
            {inventoryCheckResult.loading ? (
              <div className="text-center py-6 text-gray-500">Đang tải...</div>
            ) : inventoryCheckResult.allResults && inventoryCheckResult.allResults.length > 0 ? (
              inventoryCheckResult.allResults.map((result, rIdx) => (
                    <div key={rIdx} className="mb-4">
                      <div className="bg-gray-50 rounded-lg p-3 mb-2">
                        <span className="text-xs text-gray-500">Hàng hóa {rIdx + 1}</span>
                        <p className="text-sm font-medium text-gray-800">{result.productName}</p>
                      </div>
                      {result.items.length === 0 ? (
                        <p className="text-sm text-orange-600 text-center py-2">Không tìm thấy tồn kho cho hàng hóa này</p>
                      ) : (
                        <div className="overflow-x-auto">
                          {(() => {
                            const totalStock = result.items.reduce((s, i) => s + i.soLuong, 0);
                            return totalStock === 0 ? (
                              <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800 mb-2">
                                Hết hàng toàn kho — hàng hóa "{result.productName}" có 0 tồn. Cần tạo <span className="font-semibold">Yêu cầu bổ sung</span> để thu mua.
                              </div>
                            ) : null;
                          })()}
                          <table className="w-full min-w-[560px] border-collapse text-sm mb-2">
                          <thead>
                            <tr className="bg-teal-100">
                              <th className="px-3 py-2 text-left border border-gray-200 font-medium text-gray-700">Kho</th>
                              <th className="px-3 py-2 text-left border border-gray-200 font-medium text-gray-700">Lô</th>
                              <th className="px-3 py-2 text-right border border-gray-200 font-medium text-gray-700">Số lượng</th>
                              <th className="px-3 py-2 text-right border border-gray-200 font-medium text-gray-700">Giá thành</th>
                            </tr>
                          </thead>
                          <tbody>
                            {result.items.map((item, idx) => (
                              <tr key={idx} className={`hover:bg-gray-50 ${item.soLuong <= 0 ? 'opacity-60' : ''}`}>
                                <td className="px-3 py-2 border border-gray-200">{item.tenKho}</td>
                                <td className="px-3 py-2 border border-gray-200">{item.tenLo}</td>
                                <td className="px-3 py-2 border border-gray-200 text-right font-medium text-blue-700">
                                  {item.soLuong <= 0 ? (
                                    <span className="inline-flex items-center gap-1 text-red-600">
                                      <span className="inline-block w-2 h-2 rounded-full bg-red-500" />
                                      Hết hàng
                                    </span>
                                  ) : (
                                    `${item.soLuong.toLocaleString('vi-VN', { maximumFractionDigits: 2 })} ${item.donViTinh}`
                                  )}
                                </td>
                                <td className="px-3 py-2 border border-gray-200 text-right font-medium text-green-700">
                                  {item.giaThanh > 0
                                    ? `${item.giaThanh.toLocaleString('vi-VN', { maximumFractionDigits: 0 })} VNĐ`
                                    : '-'}
                                </td>
                              </tr>
                            ))}
                            <tr className="bg-teal-50 font-semibold">
                              <td colSpan={2} className="px-3 py-2 border border-gray-200 text-right">Tổng</td>
                              <td className="px-3 py-2 border border-gray-200 text-right text-blue-800">
                                {result.items.reduce((s, i) => s + i.soLuong, 0).toLocaleString('vi-VN', { maximumFractionDigits: 2 })} {result.items[0]?.donViTinh || ''}
                              </td>
                              <td className="px-3 py-2 border border-gray-200 text-right text-green-800">-</td>
                            </tr>
                          </tbody>
                        </table>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-orange-600 text-center py-4">Không tìm thấy tồn kho</p>
            )}
          </div>
          <div className="p-4 border-t shrink-0 text-right">
            <button
              onClick={() => setInventoryCheckResult(prev => ({ ...prev, show: false }))}
              className="px-4 py-2 bg-teal-600 text-white text-sm rounded-md hover:bg-teal-700"
            >
              Đóng
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
      />

      <CancelWithReasonModal
        isOpen={!!cancelTargetId}
        onClose={() => { if (!cancelling) setCancelTargetId(null); }}
        onConfirm={confirmCancelSupplyRequest}
        loading={cancelling}
        ticketLabel={`yêu cầu cung cấp ${cancelTargetCode}`}
        description="Người tạo sẽ nhận được thông báo kèm lý do bạn nhập."
        details={[
          'Các dòng chưa cấp sẽ chuyển sang "Đã hủy"; dòng đã cấp một phần/đủ giữ nguyên lịch sử.',
          'Yêu cầu đã hủy không khôi phục được — vẫn hiển thị trong danh sách kèm lý do.',
        ]}
      />

      {/* Form tạo hàng hóa mở từ tag "Mới" trong chi tiết YCCB. Modal hỗ trợ stack nên
          lớp này nằm trên modal chi tiết mà không phá ESC/inert. */}
      <ProductFormModal
        isOpen={productFormOpen}
        isEditing={false}
        formData={productFormData}
        categories={productCategories}
        generatingCode={generatingProductCode}
        onClose={() => setProductFormOpen(false)}
        onChange={(e) => {
          const { name, value } = e.target;
          if (name === 'maSanPham') setProductCodeTouched(true);
          setProductFormData((prev) => ({ ...prev, [name]: value }));
        }}
        onSubmit={handleCreateProductFromYccb}
        onSuggestCode={() => { void suggestProductCode(true); }}
      />
    </div>
  );
};

export default SupplyRequestManagement;
