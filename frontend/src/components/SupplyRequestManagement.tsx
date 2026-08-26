import React, { useState, useEffect } from 'react';
import { Trash2, Package, ShoppingCart, Download, X, ClipboardCheck, PackagePlus, Plus, PackageCheck, AlertTriangle, XCircle } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import supplyRequestService, { SupplyRequest } from '../services/supplyRequestService';
import { useAuth } from '../contexts/AuthContext';
import { can, isCachedPermissionsLoaded } from '../utils/permissions';
import { UserRole } from '../types/auth';
import CreateWarehouseIssueModal from './CreateWarehouseIssueModal';
import CreatePurchaseRequestModal from './CreatePurchaseRequestModal';
import CreateWarehouseReceiptModal from './CreateWarehouseReceiptModal';
import PartialFulfillmentModal from './PartialFulfillmentModal';
import type { SupplyRequestItem } from '../services/supplyRequestService';
import { parseNumberInput } from '../utils/numberInput';
import warehouseService from '../services/warehouseService';
import TableFilter, { FilterField } from './TableFilter';
import Modal from './Modal';
import ConfirmDialog from './common/ConfirmDialog';
import UnitSelect from './common/UnitSelect';

interface SupplyRequestManagementProps {
  onClose?: () => void;
}

interface EditItemRow {
  phanLoai: string;
  tenGoi: string;
  soLuong: number;
  donViTinh: string;
}

const emptyEditRow = (): EditItemRow => ({
  phanLoai: '',
  tenGoi: '',
  soLuong: 0,
  donViTinh: 'Kg',
});

const getStatusColor = (status: string) => {
  switch (status) {
    case 'Đã cung cấp':
      return 'text-green-700 bg-green-100';
    case 'Đã mua hàng':
      return 'text-emerald-700 bg-emerald-100';
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
  const [searchParams] = useSearchParams();
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
  const [showPurchaseRequestModal, setShowPurchaseRequestModal] = useState(false);
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

  const isCancelled = (status: string) => status === 'Đã hủy';
  const isCompleted = (status: string) => status === 'Đã cung cấp';
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

  useEffect(() => {
    fetchRequests();
  }, [currentPage, serverFilters]);

  useEffect(() => {
    const srId = searchParams.get('supplyRequestId');
    if (srId) {
      supplyRequestService.getSupplyRequestById(srId).then((res) => {
        if (res.data) {
          setSelectedRequest(res.data as SupplyRequest);
          setModalMode('view');
          setShowModal(true);
        }
      }).catch((err) => {
        console.error('Error loading supply request from URL:', err);
      });
    }
  }, [searchParams]);

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
    setModalMode('edit');
    setSelectedRequest(item);
    const rows: EditItemRow[] = (item.items && item.items.length > 0)
      ? item.items.map(i => ({ phanLoai: i.phanLoai, tenGoi: i.tenGoi, soLuong: i.soLuong, donViTinh: i.donViTinh }))
      : [emptyEditRow()];
    setEditItems(rows);
    setEditMucDich(item.mucDichYeuCau);
    setEditMucDoUuTien(item.mucDoUuTien);
    setEditGhiChu(item.ghiChu || '');
    setShowModal(true);
  };

  const handleView = (item: SupplyRequest) => {
    setModalMode('view');
    setSelectedRequest(item);
    setShowModal(true);
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

  const handleCancel = (id: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Xác nhận hủy',
      message: 'Bạn có chắc chắn muốn hủy yêu cầu cung cấp này?',
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        setLoading(true);
        try {
          await supplyRequestService.cancelSupplyRequest(id);
          fetchRequests();
        } catch (error: any) {
          alert(error.response?.data?.message || 'Lỗi khi hủy yêu cầu cung cấp');
        } finally {
          setLoading(false);
        }
      },
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedRequest) {
      alert('Không tìm thấy thông tin yêu cầu');
      return;
    }

    // Validate rows
    for (let i = 0; i < editItems.length; i++) {
      if (!editItems[i].phanLoai || !editItems[i].phanLoai.trim()) {
        alert(`Dòng ${i + 1}: Vui lòng nhập phân loại`);
        return;
      }
      if (!editItems[i].tenGoi || !editItems[i].tenGoi.trim()) {
        alert(`Dòng ${i + 1}: Vui lòng nhập tên gọi`);
        return;
      }
      if (!editItems[i].donViTinh || !editItems[i].donViTinh.trim()) {
        alert(`Dòng ${i + 1}: Vui lòng chọn đơn vị tính`);
        return;
      }
      if (editItems[i].soLuong <= 0) {
        alert(`Dòng ${i + 1}: Số lượng phải lớn hơn 0`);
        return;
      }
    }

    if (!editMucDich || !editMucDich.trim()) {
      alert('Vui lòng nhập mục đích yêu cầu');
      return;
    }

    setLoading(true);
    try {
      await supplyRequestService.updateSupplyRequest(selectedRequest.id, {
        items: editItems,
        mucDichYeuCau: editMucDich,
        mucDoUuTien: editMucDoUuTien,
        ghiChu: editGhiChu,
      });
      alert('Cập nhật yêu cầu cung cấp thành công!');
      setShowModal(false);
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
      alert('Không có tên sản phẩm để kiểm tra tồn kho');
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
          searchPlaceholder="Tìm kiếm theo mã, tên nhân viên, bộ phận, sản phẩm..."
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
                <th scope="col" className="px-2 lg:px-4 py-3 text-left text-xs font-semibold text-gray-900 border-r border-gray-200">Sản phẩm</th>
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
                            onClick={(e) => { e.stopPropagation(); handleCancel(request.id); }}
                            onKeyDown={(e) => e.stopPropagation()}
                            className="min-h-[32px] min-w-[32px] inline-flex items-center justify-center p-1 lg:p-1.5 rounded-md text-orange-600 hover:bg-orange-100 hover:text-orange-800 transition-colors focus:outline-none focus:ring-1 focus:ring-orange-400"
                            title="Hủy yêu cầu"
                            aria-label={`Hủy yêu cầu ${request.maYeuCau}`}
                          >
                            <XCircle className="h-3.5 w-3.5 lg:h-4 lg:w-4" />
                          </button>
                        )}

                        {!isCancelled(request.trangThai) && request.purchaseRequests?.some((pr: any) => pr.trangThai === 'Đã duyệt' || pr.trangThai === 'Hoàn thành') && (() => {
                          const daNhapKho = request.warehouseReceipts && request.warehouseReceipts.length > 0;
                          return (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (!daNhapKho) {
                                  setSelectedRequest(request);
                                  setShowWarehouseReceiptModal(true);
                                }
                              }}
                              onKeyDown={(e) => e.stopPropagation()}
                              disabled={daNhapKho}
                              className={daNhapKho
                                ? "min-h-[32px] min-w-[32px] inline-flex items-center justify-center p-1 lg:p-1.5 rounded-md text-gray-400 cursor-not-allowed focus:outline-none"
                                : "min-h-[32px] min-w-[32px] inline-flex items-center justify-center p-1 lg:p-1.5 rounded-md text-green-600 hover:bg-green-100 hover:text-green-800 transition-colors focus:outline-none focus:ring-1 focus:ring-green-400"
                              }
                              title={daNhapKho ? "Đã nhập kho" : "Nhập kho"}
                              aria-label={daNhapKho ? `Đã nhập kho ${request.maYeuCau}` : `Nhập kho cho ${request.maYeuCau}`}
                            >
                              <PackagePlus className="h-3.5 w-3.5 lg:h-4 lg:w-4" />
                            </button>
                          );
                        })()}
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
        onClose={() => setShowModal(false)}
        showBackdrop
        closeOnBackdrop={modalMode === 'view'}
      >
        <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl md:max-w-5xl lg:max-w-6xl flex flex-col modal-viewport-h" onClick={(e) => e.stopPropagation()}>
          <div className="p-4 md:p-6 overflow-y-auto flex-1">
            {selectedRequest && (<>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">
                {modalMode === 'edit' ? 'Chỉnh sửa yêu cầu' : 'Chi tiết yêu cầu'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>

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
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Danh sách sản phẩm</h3>
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
                                    {item.isNewProduct && (
                                      <span className="ml-2 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-800 border border-amber-200 align-middle whitespace-nowrap">
                                        <AlertTriangle className="h-3 w-3" />
                                        Mới
                                      </span>
                                    )}
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
                              <td colSpan={canEdit ? 9 : 8} className="px-3 py-4 text-center text-gray-400 italic">Không có sản phẩm</td>
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
                  {(selectedRequest.purchaseRequests?.length || selectedRequest.warehouseReceipts?.length) ? (
                    <div className="rounded-md border border-gray-200 bg-gray-50 p-3 text-sm">
                      <div className="font-medium text-gray-700 mb-2">Liên kết</div>
                      {selectedRequest.purchaseRequests && selectedRequest.purchaseRequests.length > 0 && (
                        <div className="mb-2">
                          <div className="text-xs text-gray-500 mb-1">Yêu cầu mua hàng</div>
                          <div className="flex flex-wrap gap-2">
                            {selectedRequest.purchaseRequests.map((pr: any) => (
                              <span key={pr.id} className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-white border border-gray-200">
                                <ShoppingCart className="h-3 w-3 text-blue-600" />
                                <span className="font-medium text-gray-800">{pr.maYeuCau}</span>
                                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${pr.trangThai === 'Hoàn thành' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{pr.trangThai}</span>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {selectedRequest.warehouseReceipts && selectedRequest.warehouseReceipts.length > 0 && (
                        <div>
                          <div className="text-xs text-gray-500 mb-1">Phiếu nhập kho</div>
                          <div className="flex flex-wrap gap-2">
                            {selectedRequest.warehouseReceipts.map((wr: any) => (
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
                                {d.triggeredPurchaseRequestId ? <span className="ml-2 text-blue-600">→ YC mua hàng #{d.triggeredPurchaseRequestId.slice(0, 8)}</span> : null}
                                {d.reason ? <span className="ml-2 text-gray-500">— {d.reason}</span> : null}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action buttons — hidden when cancelled */}
                  {!isCancelled(selectedRequest.trangThai) && (
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 pt-2 border-t border-gray-100">
                    {/* Chức năng cấp/mua chỉ còn ý nghĩa khi yêu cầu chưa hoàn thành */}
                    {!isCompleted(selectedRequest.trangThai) && (
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
                          setShowModal(false);
                          setShowWarehouseIssueModal(true);
                        }}
                        className="px-3 py-1.5 text-xs bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center justify-center gap-1.5"
                      >
                        <Package className="h-3.5 w-3.5" />
                        Tạo xuất kho
                      </button>
                      {!isPurchasing(selectedRequest.trangThai) && !(selectedRequest.purchaseRequests && selectedRequest.purchaseRequests.length > 0) && (
                      <button
                        type="button"
                        onClick={() => {
                          setShowModal(false);
                          setShowPurchaseRequestModal(true);
                        }}
                        className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center justify-center gap-1.5"
                      >
                        <ShoppingCart className="h-3.5 w-3.5" />
                        Tạo yêu cầu mua hàng
                      </button>
                      )}
                    </div>
                    )}
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => setShowModal(false)}
                        className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                      >
                        Đóng
                      </button>
                      {canCancel && (selectedRequest.trangThai === 'Chưa cung cấp' || selectedRequest.trangThai === 'Đang xử lý') && (
                        <button
                          type="button"
                          onClick={() => {
                            setShowModal(false);
                            handleCancel(selectedRequest.id);
                          }}
                          className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 flex items-center gap-1.5"
                        >
                          <XCircle className="h-4 w-4" />
                          Hủy yêu cầu
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setShowModal(false);
                          handleEdit(selectedRequest);
                        }}
                        disabled={!canEdit || isCompleted(selectedRequest.trangThai)}
                        title={isCompleted(selectedRequest.trangThai) ? "Yêu cầu đã hoàn thành, không thể chỉnh sửa" : (!canEdit ? "Bạn không có quyền chỉnh sửa" : "")}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                      >
                        Chỉnh sửa
                      </button>
                    </div>
                  </div>
                  )}
                </div>
              ) : (
                /* Edit mode */
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Items edit table */}
                  <div>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-2">
                      <label className="text-sm font-medium text-gray-700">Danh sách sản phẩm <span className="text-red-500">*</span></label>
                      <button
                        type="button"
                        onClick={() => setEditItems(prev => [...prev, emptyEditRow()])}
                        className="flex items-center justify-center gap-1 px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        <Plus className="h-3 w-3" />
                        Thêm dòng
                      </button>
                    </div>
                    <div className="border border-gray-200 rounded-md overflow-x-auto">
                      <table className="w-full min-w-[720px] text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase w-6">#</th>
                            <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">Phân loại</th>
                            <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">Tên gọi</th>
                            <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase w-24">Số lượng</th>
                            <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase w-24">Đơn vị</th>
                            <th className="px-2 py-2 w-8"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {editItems.map((row, idx) => (
                            <tr key={idx}>
                              <td className="px-2 py-2 text-gray-500 text-center">{idx + 1}</td>
                              <td className="px-2 py-2">
                                <input
                                  type="text"
                                  value={row.phanLoai}
                                  onChange={(e) => setEditItems(prev => prev.map((r, i) => i === idx ? { ...r, phanLoai: e.target.value } : r))}
                                  className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                  placeholder="Phân loại"
                                />
                              </td>
                              <td className="px-2 py-2">
                                <input
                                  type="text"
                                  value={row.tenGoi}
                                  onChange={(e) => setEditItems(prev => prev.map((r, i) => i === idx ? { ...r, tenGoi: e.target.value } : r))}
                                  required
                                  className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                  placeholder="Tên gọi"
                                />
                              </td>
                              <td className="px-2 py-2">
                                <input
                                  type="number"
                                  value={row.soLuong}
                                  onChange={(e) => setEditItems(prev => prev.map((r, i) => i === idx ? { ...r, soLuong: parseNumberInput(e.target.value) } : r))}
                                  required
                                  min="0.01"
                                  step="0.01"
                                  className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                />
                              </td>
                              <td className="px-2 py-2">
                                <UnitSelect
                                  value={row.donViTinh}
                                  onChange={(val) => setEditItems(prev => prev.map((r, i) => i === idx ? { ...r, donViTinh: val } : r))}
                                  className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                />
                              </td>
                              <td className="px-2 py-2 text-center">
                                <button
                                  type="button"
                                  onClick={() => setEditItems(prev => prev.filter((_, i) => i !== idx))}
                                  disabled={editItems.length === 1}
                                  className="text-red-500 hover:text-red-700 disabled:text-gray-300"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Other edit fields */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Mục đích yêu cầu <span className="text-red-500">*</span></label>
                    <textarea
                      value={editMucDich}
                      onChange={(e) => setEditMucDich(e.target.value)}
                      required
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Mức độ ưu tiên <span className="text-red-500">*</span></label>
                    <select
                      value={editMucDoUuTien}
                      onChange={(e) => setEditMucDoUuTien(e.target.value)}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                    >
                      <option value="Cao">Cao</option>
                      <option value="Trung bình">Trung bình</option>
                      <option value="Thấp">Thấp</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú</label>
                    <textarea
                      value={editGhiChu}
                      onChange={(e) => setEditGhiChu(e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row sm:justify-end gap-3 pt-2">
                    <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">
                      Hủy
                    </button>
                    <button type="submit" disabled={loading} className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50">
                      {loading ? 'Đang xử lý...' : 'Cập nhật'}
                    </button>
                  </div>
                </form>
              )}
            </>)}
          </div>
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

      {/* Purchase Request Modal */}
      <CreatePurchaseRequestModal
        isOpen={showPurchaseRequestModal}
        onClose={() => setShowPurchaseRequestModal(false)}
        supplyRequest={selectedRequest}
        onSuccess={() => {
          fetchRequests();
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
                        <span className="text-xs text-gray-500">Sản phẩm {rIdx + 1}</span>
                        <p className="text-sm font-medium text-gray-800">{result.productName}</p>
                      </div>
                      {result.items.length === 0 ? (
                        <p className="text-sm text-orange-600 text-center py-2">Không tìm thấy tồn kho cho sản phẩm này</p>
                      ) : (
                        <div className="overflow-x-auto">
                          {(() => {
                            const totalStock = result.items.reduce((s, i) => s + i.soLuong, 0);
                            return totalStock === 0 ? (
                              <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800 mb-2">
                                Hết hàng toàn kho — sản phẩm "{result.productName}" có 0 tồn. Cần tạo <span className="font-semibold">Yêu cầu bổ sung</span> để thu mua.
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
    </div>
  );
};

export default SupplyRequestManagement;
