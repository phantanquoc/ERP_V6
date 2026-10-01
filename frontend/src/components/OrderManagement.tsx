import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Edit, Trash2, Package, Calculator, Download, AlertCircle, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import TableFilter, { FilterField } from './TableFilter';
import ConfirmDialog from './common/ConfirmDialog';
import { orderService, Order } from '../services/orderService';
import { quotationRequestService, QuotationRequest } from '../services/quotationRequestService';
import QuotationCalculatorModal from './QuotationCalculatorModal';
import Modal from './Modal';
import { useOrders, orderKeys } from '../hooks';
import { useQueryClient } from '@tanstack/react-query';
import { parseNumberInput } from '../utils/numberInput';
import { useAuth } from '../contexts/AuthContext';
import { useAuditLogs } from '../hooks/useAuditLogs';
import { AuditLog } from '../services/auditLogService';
import StatusBadge, { BadgeTone } from './shared/StatusBadge';
import { ErrorState } from '../design-system/States';
import { can } from '../utils/permissions';

const ORDER_ACTION_LABELS: Record<string, { label: string; className: string }> = {
  CREATE: { label: 'Tạo mới', className: 'bg-green-100 text-green-800' },
  UPDATE: { label: 'Cập nhật', className: 'bg-blue-100 text-blue-800' },
  DELETE: { label: 'Xóa', className: 'bg-red-100 text-red-800' },
  STATUS_CHANGE: { label: 'Đổi trạng thái', className: 'bg-yellow-100 text-yellow-800' },
};

const OrderAuditLogRow: React.FC<{ entry: AuditLog }> = ({ entry }) => {
  const [expanded, setExpanded] = React.useState(false);
  const chip = ORDER_ACTION_LABELS[entry.action] ?? { label: entry.action, className: 'bg-gray-100 text-gray-800' };
  return (
    <>
      <tr className="border-b border-gray-100 hover:bg-gray-50">
        <td className="px-3 py-2">
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${chip.className}`}>{chip.label}</span>
        </td>
        <td className="px-3 py-2 text-gray-700 text-xs">{entry.actorId}</td>
        <td className="px-3 py-2 text-gray-500 text-xs">{entry.actorRole}</td>
        <td className="px-3 py-2 text-gray-500 text-xs">{new Date(entry.createdAt).toLocaleString('vi-VN')}</td>
        <td className="px-3 py-2">
          {(entry.before !== null || entry.after !== null) && (
            <button onClick={() => setExpanded(e => !e)} className="text-blue-600 hover:underline text-xs">
              {expanded ? 'Ẩn' : 'Chi tiết'}
            </button>
          )}
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={5} className="px-3 pb-3 bg-gray-50">
            <div className="grid grid-cols-2 gap-2 mt-1">
              {entry.before !== null && (
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">Trước</p>
                  <pre className="whitespace-pre-wrap text-xs font-mono text-gray-700 bg-white border rounded p-2 max-h-40 overflow-y-auto">
                    {JSON.stringify(entry.before, null, 2)}
                  </pre>
                </div>
              )}
              {entry.after !== null && (
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">Sau</p>
                  <pre className="whitespace-pre-wrap text-xs font-mono text-gray-700 bg-white border rounded p-2 max-h-40 overflow-y-auto">
                    {JSON.stringify(entry.after, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
};

// Shared table styling tokens (presentation only)
const TH = 'px-3 py-2.5 text-left text-xs font-semibold text-gray-500 whitespace-nowrap';
const TD = 'px-3 py-2.5 text-gray-700 align-top';
// Sticky cells follow row hover so they never look mismatched
const STICKY_BG = 'bg-white group-hover:bg-gray-50 transition-colors';
const PAGE_BTN = 'h-8 px-3 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500';
const EMPTY = <span className="text-gray-400">—</span>;

// Mirrors Prisma enums OrderProductionStatus / OrderPaymentStatus (business_orders.prisma)
const PRODUCTION_STATUS_LABELS: Record<string, string> = {
  CHO_LEN_KE_HOACH: 'Chờ lên kế hoạch',
  CHO_SAN_XUAT: 'Chờ sản xuất',
  DANG_SAN_XUAT: 'Đang sản xuất',
  CHO_GIAO_HANG: 'Chờ giao hàng',
  DA_LEN_CONTAINER: 'Đã lên container',
  DANG_VAN_CHUYEN: 'Đang vận chuyển',
  DA_GIAO_CHO_KHACH_HANG: 'Đã giao cho khách hàng',
};
const PAYMENT_STATUS_LABELS: Record<string, string> = {
  DA_THANH_TOAN_DOT_1: 'Đã thanh toán đợt 1',
  CHO_THANH_TOAN_DOT_2: 'Chờ thanh toán đợt 2',
  DA_THANH_TOAN_DU: 'Đã thanh toán đủ',
};
const PRODUCTION_STATUS_OPTIONS = Object.entries(PRODUCTION_STATUS_LABELS).map(([value, label]) => ({ value, label }));
const isProductionStatus = (v: string): boolean => Object.prototype.hasOwnProperty.call(PRODUCTION_STATUS_LABELS, v);

const PRODUCTION_TONE: Record<string, BadgeTone> = {
  CHO_LEN_KE_HOACH: 'gray',
  CHO_SAN_XUAT: 'yellow',
  DANG_SAN_XUAT: 'blue',
  CHO_GIAO_HANG: 'yellow',
  DA_LEN_CONTAINER: 'blue',
  DANG_VAN_CHUYEN: 'yellow',
  DA_GIAO_CHO_KHACH_HANG: 'green',
};
const PAYMENT_TONE: Record<string, BadgeTone> = {
  DA_THANH_TOAN_DOT_1: 'yellow',
  CHO_THANH_TOAN_DOT_2: 'red',
  DA_THANH_TOAN_DU: 'green',
};

/** Namespaced URL keys (host pages use plain `q` / `page` for their other tabs). */
const URL_KEYS = { search: 'orderQ', status: 'orderStatus', page: 'orderPage', limit: 'orderLimit' } as const;
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];
const DEFAULT_LIMIT = 20;

/** DD/MM/YYYY with zero padding; '' for empty/invalid input. */
const formatDateVN = (value?: string | null): string => {
  if (!value) return '';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
};
const formatVND = (value?: number | null): string =>
  value ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value) : '';
const formatUSD = (value?: number | null): string =>
  value ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value) : '';

/** Status badge, or "—" when the order has no status yet (never the form placeholder). */
const OrderStatusBadge: React.FC<{ status?: string | null; labels: Record<string, string>; tones: Record<string, BadgeTone> }> = ({ status, labels, tones }) =>
  status ? <StatusBadge label={labels[status] ?? status} tone={tones[status] ?? 'gray'} /> : EMPTY;

/** Detail field: shows "—" for empty values. */
const DetailValue: React.FC<{ value?: React.ReactNode; className?: string }> = ({ value, className = 'text-gray-900' }) => (
  <p className={`text-sm ${className}`}>{value === undefined || value === null || value === '' ? EMPTY : value}</p>
);

interface OrderManagementProps {
  hideHeader?: boolean;
  customerType?: 'Quốc tế' | 'Nội địa' | 'all';
}

const OrderManagement: React.FC<OrderManagementProps> = ({ hideHeader = false, customerType }) => {
  const { user } = useAuth();
  const canEdit = String(user?.role) === 'ADMIN' || String(user?.role) === 'DEPARTMENT_HEAD';
  const canDeleteOrder = can('orders', 'DELETE', user?.role);

  // List state lives in the URL (F5 / share link). Params are namespaced because this
  // component is embedded as a tab in 9 pages whose sibling tabs use `q` / `page`.
  const [searchParams, setSearchParams] = useSearchParams();
  const searchTerm = searchParams.get(URL_KEYS.search) ?? '';
  const rawStatus = searchParams.get(URL_KEYS.status) ?? '';
  const statusFilter = isProductionStatus(rawStatus) ? rawStatus : '';
  const currentPage = Math.max(1, Number(searchParams.get(URL_KEYS.page)) || 1);
  const rawLimit = Number(searchParams.get(URL_KEYS.limit));
  const limit = PAGE_SIZE_OPTIONS.includes(rawLimit) ? rawLimit : DEFAULT_LIMIT;

  const updateListParams = useCallback((patch: Record<string, string | null>) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      for (const [k, v] of Object.entries(patch)) {
        if (v === null || v === '') next.delete(k);
        else next.set(k, v);
      }
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const setCurrentPage = (page: number) => updateListParams({ [URL_KEYS.page]: page > 1 ? String(page) : null });
  const filterValues = useMemo(
    () => ({ _search: searchTerm, trangThaiSanXuat: statusFilter }),
    [searchTerm, statusFilter],
  );
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState('');
  const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCostingModal, setShowCostingModal] = useState(false);
  const [formData, setFormData] = useState<Partial<Order>>({});
  const [quotationRequestForModal, setQuotationRequestForModal] = useState<QuotationRequest | null>(null);
  const [exportError, setExportError] = useState<string>('');
  const [exportSuccess, setExportSuccess] = useState<string>('');
  // Audit log tab state (task 11.3)
  const [orderDetailTab, setOrderDetailTab] = useState<'info' | 'audit'>('info');
  const [orderAuditPage, setOrderAuditPage] = useState(1);
  const { data: orderAuditData } = useAuditLogs(
    { entityType: 'Order', entityId: selectedOrder?.id ?? '', page: orderAuditPage, limit: 10 },
    !!selectedOrder?.id && orderDetailTab === 'audit'
  );
  const [exportLoading, setExportLoading] = useState(false);

  const itemsPerPage = limit;

  const queryClient = useQueryClient();
  const filterCustomerType = customerType === 'all' ? undefined : customerType;
  const { data: ordersData, isLoading: loading, isError, refetch } = useOrders({
    page: currentPage,
    limit,
    search: searchTerm || undefined,
    customerType: filterCustomerType,
    status: statusFilter || undefined,
  });

  const orders = (ordersData as any)?.data || [];
  const totalItems = (ordersData as any)?.pagination?.total ?? 0;
  const totalPages = (ordersData as any)?.pagination?.totalPages ?? 1;

  // Stale ?orderPage= (shared link, last row deleted) → clamp to the last page
  useEffect(() => {
    if (loading || isError || !ordersData) return;
    const last = Math.max(1, totalPages || 1);
    if (currentPage > last) updateListParams({ [URL_KEYS.page]: last > 1 ? String(last) : null });
  }, [loading, isError, ordersData, totalPages, currentPage, updateListParams]);

  // Only filters the list endpoint actually supports: free-text search (OR over
  // maDonHang / maBaoGia / tenKhachHang) + production status enum.
  const orderFilterFields: FilterField[] = [
    { key: 'trangThaiSanXuat', label: 'Trạng thái SX', type: 'select', options: PRODUCTION_STATUS_OPTIONS },
  ];

  const handleFilterChange = (newValues: Record<string, string>) => {
    const nextStatus = newValues.trangThaiSanXuat ?? '';
    updateListParams({
      [URL_KEYS.search]: newValues._search || null,
      [URL_KEYS.status]: isProductionStatus(nextStatus) ? nextStatus : null,
      [URL_KEYS.page]: null,
    });
  };

  const handleExportExcel = async () => {
    try {
      setExportError('');
      setExportLoading(true);
      // Export endpoint only accepts `search`; pass the current search term.
      await orderService.exportToExcel({ search: searchTerm || undefined });
      setExportSuccess('Đã xuất file Excel thành công');
      setTimeout(() => setExportSuccess(''), 3000);
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      setExportError('Không thể xuất file Excel');
    } finally {
      setExportLoading(false);
    }
  };

  // Detail modal is synced to ?orderId= (deep-link from notifications, F5, share link).
  // The ref records which id this component opened itself so the URL effect doesn't refetch it.
  const openedOrderIdRef = useRef<string | null>(null);

  const handleView = (order: Order) => {
    setSelectedOrder(order);
    setOrderDetailTab('info');
    setOrderAuditPage(1);
    setShowViewModal(true);
    openedOrderIdRef.current = order.id;
    updateListParams({ orderId: order.id });
  };

  const closeViewModal = () => {
    setShowViewModal(false);
    openedOrderIdRef.current = null;
    updateListParams({ orderId: null });
  };

  const orderIdParam = searchParams.get('orderId');
  useEffect(() => {
    const orderId = orderIdParam;
    if (!orderId) {
      // URL lost the id (Back button / host tab switch) → close the detail
      if (openedOrderIdRef.current) {
        openedOrderIdRef.current = null;
        setShowViewModal(false);
      }
      return;
    }
    if (openedOrderIdRef.current === orderId) return;
    let cancelled = false;
    orderService
      .getOrderById(orderId)
      .then((res: any) => {
        if (cancelled) return;
        const order = res?.data ?? res;
        if (order && order.id) {
          handleView(order as Order);
        } else {
          updateListParams({ orderId: null });
        }
      })
      .catch(() => {
        if (cancelled) return;
        toast.error('Không tìm thấy đơn hàng');
        updateListParams({ orderId: null });
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderIdParam]);

  const handleEdit = (order: Order) => {
    setSelectedOrder(order);
    setFormData(order);
    setShowEditModal(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;

    try {
      await orderService.updateOrder(selectedOrder.id, formData);
      toast.success('Cập nhật đơn hàng thành công');
      setShowEditModal(false);
      queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
    } catch (error) {
      console.error('Error updating order:', error);
      toast.error('Lỗi khi cập nhật đơn hàng');
    }
  };

  const handleDelete = async (id: string, maDonHang?: string) => {
    setConfirmMessage(`Bạn có chắc chắn muốn xóa đơn hàng ${maDonHang ?? ''}? Thao tác này không thể hoàn tác.`);
    setConfirmAction(() => async () => {
      setConfirmOpen(false);
      try {
        await orderService.deleteOrder(id);
        toast.success('Xóa đơn hàng thành công');
        queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
      } catch (error) {
        console.error('Error deleting order:', error);
        toast.error('Lỗi khi xóa đơn hàng');
      }
    });
    setConfirmOpen(true);
  };

  const handleViewCosting = async (order: Order) => {
    try {
      const response = await quotationRequestService.getQuotationRequestById(order.quotationRequestId);
      setQuotationRequestForModal(response.data);
      setShowCostingModal(true);
    } catch (error) {
      console.error('Error fetching quotation request:', error);
      toast.error('Lỗi khi tải thông tin yêu cầu báo giá');
    }
  };



  return (
    <div className="space-y-4">
      {/* Header — host tabs pass hideHeader (tab label already names the list) */}
      <div className={`flex items-center ${hideHeader ? 'justify-end' : 'justify-between'}`}>
        {!hideHeader && <h2 className="text-2xl font-bold">Danh sách đơn hàng</h2>}
        <button
          type="button"
          onClick={handleExportExcel}
          disabled={exportLoading}
          title={searchTerm ? 'Xuất theo từ khóa tìm kiếm hiện tại' : 'Xuất toàn bộ đơn hàng'}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
        >
          <Download size={18} aria-hidden="true" />
          {exportLoading ? 'Đang xuất...' : 'Xuất Excel'}
        </button>
      </div>

      {/* Search & Filter */}
      <TableFilter
        filters={orderFilterFields}
        values={filterValues}
        onChange={handleFilterChange}
        searchPlaceholder="Tìm kiếm mã ĐH, mã BG, khách hàng..."
      />

      {/* Alert Messages */}
      {exportError && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <p className="text-red-800">{exportError}</p>
        </div>
      )}
      {exportSuccess && (
        <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-green-600" />
          <p className="text-green-800">{exportSuccess}</p>
        </div>
      )}

      {/* Table — bounded scroll container so the sticky header actually sticks */}
      <div className="overflow-auto max-h-[calc(100vh-16rem)] border border-gray-200 rounded-lg">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-gray-50 sticky top-0 z-20 shadow-[inset_0_-1px_0_0_rgb(229_231_235)]">
            <tr>
              <th scope="col" className={`${TH} w-12 sticky left-0 z-30 bg-gray-50`}>STT</th>
              <th scope="col" className={`${TH} sticky left-12 z-30 bg-gray-50 shadow-[1px_0_0_0_rgb(229_231_235)]`}>Mã đơn hàng</th>
              <th scope="col" className={TH}>Trạng thái SX</th>
              <th scope="col" className={TH}>Trạng thái TT</th>
              <th scope="col" className={TH}>Ngày đặt hàng</th>
              <th scope="col" className={TH}>Khách hàng</th>
              <th scope="col" className={`${TH} hidden xl:table-cell`}>Mã báo giá</th>
              <th scope="col" className={`${TH} text-right`}>Số mặt hàng</th>
              <th scope="col" className={`${TH} text-center sticky right-0 z-30 bg-gray-50 shadow-[-1px_0_0_0_rgb(229_231_235)]`}>Hành động</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              Array.from({ length: 5 }, (_, i) => (
                <tr key={`skeleton-${i}`} aria-hidden="true">
                  {Array.from({ length: 9 }, (__, j) => (
                    <td key={j} className="px-3 py-3">
                      <div className="h-3 rounded bg-gray-200 animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : isError ? (
              <tr>
                <td colSpan={9} className="px-3">
                  <ErrorState message="Không tải được danh sách đơn hàng." onRetry={() => { void refetch(); }} />
                </td>
              </tr>
            ) : orders.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-3 py-10 text-center text-sm text-gray-400">
                  {searchTerm || statusFilter
                    ? 'Không có đơn hàng nào phù hợp với bộ lọc hiện tại.'
                    : 'Chưa có đơn hàng nào.'}
                </td>
              </tr>
            ) : (
              orders.map((order: any, index: number) => (
                <tr
                  key={order.id}
                  onClick={() => handleView(order)}
                  className="group bg-white hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <td className={`${TD} w-12 text-gray-500 tabular-nums sticky left-0 z-10 ${STICKY_BG}`}>
                    {(currentPage - 1) * itemsPerPage + index + 1}
                  </td>
                  <td className={`${TD} whitespace-nowrap font-semibold text-blue-600 sticky left-12 z-10 ${STICKY_BG} shadow-[1px_0_0_0_rgb(229_231_235)]`}>
                    {order.maDonHang || EMPTY}
                  </td>
                  <td className={`${TD} whitespace-nowrap`}>
                    <OrderStatusBadge status={order.trangThaiSanXuat} labels={PRODUCTION_STATUS_LABELS} tones={PRODUCTION_TONE} />
                  </td>
                  <td className={`${TD} whitespace-nowrap`}>
                    <OrderStatusBadge status={order.trangThaiThanhToan} labels={PAYMENT_STATUS_LABELS} tones={PAYMENT_TONE} />
                  </td>
                  <td className={`${TD} whitespace-nowrap tabular-nums`}>
                    {formatDateVN(order.ngayDatHang) || EMPTY}
                  </td>
                  <td className={TD}>
                    {order.tenKhachHang ? (
                      <span className="block max-w-[12rem] xl:max-w-[16rem] truncate" title={order.tenKhachHang}>
                        {order.tenKhachHang}
                      </span>
                    ) : EMPTY}
                  </td>
                  <td className={`${TD} whitespace-nowrap hidden xl:table-cell`}>
                    {order.maBaoGia || EMPTY}
                  </td>
                  <td className={`${TD} text-right tabular-nums`}>
                    {order.items?.length ? order.items.length.toLocaleString('vi-VN') : EMPTY}
                  </td>
                  <td className={`${TD} sticky right-0 z-10 ${STICKY_BG} shadow-[-1px_0_0_0_rgb(229_231_235)]`}>
                    <div className="flex items-center justify-center gap-1">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleViewCosting(order); }}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-md text-purple-600 hover:bg-purple-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
                        title="Xem bảng tính"
                        aria-label={`Xem bảng tính đơn hàng ${order.maDonHang ?? ''}`}
                      >
                        <Calculator className="w-4 h-4" aria-hidden="true" />
                        <span className="sr-only">Xem bảng tính</span>
                      </button>
                      {canDeleteOrder && (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleDelete(order.id, order.maDonHang); }}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-red-600 hover:bg-red-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                          title="Xóa"
                          aria-label={`Xóa đơn hàng ${order.maDonHang ?? ''}`}
                        >
                          <Trash2 className="w-4 h-4" aria-hidden="true" />
                          <span className="sr-only">Xóa</span>
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

      {/* Server-side pagination + page-size selector */}
      {totalItems > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-1 text-sm">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-gray-600">
              Tổng {totalItems.toLocaleString('vi-VN')} dòng — Trang {currentPage}/{Math.max(totalPages, 1)}
            </span>
            <select
              value={limit}
              onChange={(e) => {
                const n = Number(e.target.value);
                updateListParams({ [URL_KEYS.limit]: n === DEFAULT_LIMIT ? null : String(n), [URL_KEYS.page]: null });
              }}
              aria-label="Số dòng mỗi trang"
              className="text-sm border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              {PAGE_SIZE_OPTIONS.map(n => <option key={n} value={n}>{n}/trang</option>)}
            </select>
          </div>
          {totalPages > 1 && (
            <nav className="flex flex-wrap items-center gap-1" aria-label="Phân trang đơn hàng">
              <button
                type="button"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className={PAGE_BTN}
              >
                Trước
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(page => page === 1 || page === totalPages || Math.abs(page - currentPage) <= 2)
                .map((page, idx, arr) => (
                  <React.Fragment key={page}>
                    {idx > 0 && arr[idx - 1] !== page - 1 && <span className="px-1 text-gray-400">...</span>}
                    <button
                      type="button"
                      onClick={() => setCurrentPage(page)}
                      aria-current={page === currentPage ? 'page' : undefined}
                      className={`h-8 min-w-[2rem] px-2 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${page === currentPage ? 'bg-blue-600 text-white' : 'border border-gray-300 hover:bg-gray-50'}`}
                    >
                      {page}
                    </button>
                  </React.Fragment>
                ))}
              <button
                type="button"
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage >= totalPages}
                className={PAGE_BTN}
              >
                Sau
              </button>
            </nav>
          )}
        </div>
      )}

      {/* View Modal */}
      <Modal isOpen={showViewModal && !!selectedOrder} onClose={closeViewModal} showBackdrop closeOnBackdrop={true}>
        <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full flex flex-col modal-viewport-h" onClick={(e) => e.stopPropagation()}>
            {selectedOrder && (<>
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-blue-100 shrink-0">
              <h3 className="text-xl font-bold text-gray-900 flex items-center">
                <Package className="w-6 h-6 text-blue-600 mr-2" />
                Chi tiết đơn hàng - {selectedOrder.maDonHang}
              </h3>
              <button
                type="button"
                onClick={closeViewModal}
                aria-label="Đóng"
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Tab navigation (task 11.3) */}
            <div className="flex border-b border-gray-200 px-6 shrink-0" role="tablist" aria-label="Chi tiết đơn hàng">
              <button
                type="button"
                role="tab"
                aria-selected={orderDetailTab === 'info'}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${orderDetailTab === 'info' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                onClick={() => setOrderDetailTab('info')}
              >
                Thông tin
              </button>
              {(String(user?.role) === 'ADMIN' || String(user?.role) === 'DEPARTMENT_HEAD') && (
                <button
                  type="button"
                  role="tab"
                  aria-selected={orderDetailTab === 'audit'}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${orderDetailTab === 'audit' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                  onClick={() => setOrderDetailTab('audit')}
                >
                  Lịch sử hoạt động
                </button>
              )}
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1">
              {orderDetailTab === 'audit' ? (
                <div>
                  {!orderAuditData?.data?.length ? (
                    <p className="text-gray-500 text-sm text-center py-6">Chưa có hoạt động nào</p>
                  ) : (
                    <>
                      <table className="w-full text-sm border-collapse">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-200">
                            <th className="px-3 py-2 text-left font-medium text-gray-700">Hành động</th>
                            <th className="px-3 py-2 text-left font-medium text-gray-700">Người thực hiện</th>
                            <th className="px-3 py-2 text-left font-medium text-gray-700">Vai trò</th>
                            <th className="px-3 py-2 text-left font-medium text-gray-700">Thời gian</th>
                            <th className="px-3 py-2"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {orderAuditData.data.map((entry) => (
                            <OrderAuditLogRow key={entry.id} entry={entry} />
                          ))}
                        </tbody>
                      </table>
                      {orderAuditData.pagination.totalPages > 1 && (
                        <div className="flex justify-center gap-2 mt-3">
                          <button disabled={orderAuditPage <= 1} onClick={() => setOrderAuditPage(p => p - 1)} className="px-2 py-1 text-xs border rounded disabled:opacity-40">Trước</button>
                          <span className="text-xs self-center">{orderAuditPage}/{orderAuditData.pagination.totalPages}</span>
                          <button disabled={orderAuditPage >= orderAuditData.pagination.totalPages} onClick={() => setOrderAuditPage(p => p + 1)} className="px-2 py-1 text-xs border rounded disabled:opacity-40">Sau</button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Thông tin cơ bản */}
                <div className="space-y-4">
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Mã đơn hàng:</label>
                      <DetailValue value={selectedOrder.maDonHang} className="font-medium text-blue-600" />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Ngày đặt hàng:</label>
                      <DetailValue value={formatDateVN(selectedOrder.ngayDatHang)} />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Mã báo giá:</label>
                      <DetailValue value={selectedOrder.maBaoGia} />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Mã YCBG:</label>
                      <DetailValue value={selectedOrder.maYeuCauBaoGia} />
                    </div>
                  </div>
                </div>

                {/* Thông tin khách hàng */}
                <div className="space-y-4">
                  <h4 className="text-md font-semibold text-gray-800 border-b pb-2">Thông tin khách hàng</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Mã khách hàng:</label>
                      <DetailValue value={selectedOrder.maKhachHang} />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Tên khách hàng:</label>
                      <DetailValue value={selectedOrder.tenKhachHang} />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Nhân viên phụ trách:</label>
                      <DetailValue value={selectedOrder.tenNhanVien} />
                    </div>
                  </div>
                </div>

                {/* Giá trị đơn hàng */}
                <div className="space-y-4">
                  <h4 className="text-md font-semibold text-gray-800 border-b pb-2">Giá trị đơn hàng</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Giá trị (USD):</label>
                      <DetailValue value={formatUSD(selectedOrder.giaTriDonHangUSD)} className="font-semibold text-green-600 tabular-nums" />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Giá trị (VNĐ):</label>
                      <DetailValue value={formatVND(selectedOrder.giaTriDonHangVND)} className="font-semibold text-green-600 tabular-nums" />
                    </div>
                  </div>
                </div>

                {/* Thanh toán đợt 1 / 2 — omitted entirely when the installment has no data */}
                {([
                  { title: 'Thanh toán đợt 1', usd: selectedOrder.xuatKhauDot1USD, vnd: selectedOrder.noiDiaDot1VND, date: selectedOrder.ngayThanhToanDot1 },
                  { title: 'Thanh toán đợt 2', usd: selectedOrder.xuatKhauDot2USD, vnd: selectedOrder.noiDiaDot2VND, date: selectedOrder.ngayThanhToanDot2 },
                ]).filter((p) => p.usd || p.vnd || p.date).map((p) => (
                  <div key={p.title} className="space-y-4">
                    <h4 className="text-md font-semibold text-gray-800 border-b pb-2">{p.title}</h4>
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium text-gray-500">Xuất khẩu (USD):</label>
                        <DetailValue value={formatUSD(p.usd)} className="text-gray-900 tabular-nums" />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Nội địa (VNĐ):</label>
                        <DetailValue value={formatVND(p.vnd)} className="text-gray-900 tabular-nums" />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Ngày thanh toán:</label>
                        <DetailValue value={formatDateVN(p.date)} />
                      </div>
                    </div>
                  </div>
                ))}

                {/* Thông tin sản xuất — omitted when no production date is set */}
                {(selectedOrder.ngayBatDauSanXuatKeHoach || selectedOrder.ngayHoanThanhSanXuatKeHoach || selectedOrder.ngayHoanThanhThucTe || selectedOrder.ngayGiaoHang) && (
                  <div className="space-y-4">
                    <h4 className="text-md font-semibold text-gray-800 border-b pb-2">Thông tin sản xuất</h4>
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium text-gray-500">Ngày bắt đầu KH:</label>
                        <DetailValue value={formatDateVN(selectedOrder.ngayBatDauSanXuatKeHoach)} />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Ngày hoàn thành KH:</label>
                        <DetailValue value={formatDateVN(selectedOrder.ngayHoanThanhSanXuatKeHoach)} />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Ngày hoàn thành thực tế:</label>
                        <DetailValue value={formatDateVN(selectedOrder.ngayHoanThanhThucTe)} />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Ngày giao hàng:</label>
                        <DetailValue value={formatDateVN(selectedOrder.ngayGiaoHang)} />
                      </div>
                    </div>
                  </div>
                )}

                {/* Trạng thái */}
                <div className="space-y-4 md:col-span-2 lg:col-span-3">
                  <h4 className="text-md font-semibold text-gray-800 border-b pb-2">Trạng thái</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Trạng thái sản xuất:</label>
                      <p className="text-sm mt-1">
                        <OrderStatusBadge status={selectedOrder.trangThaiSanXuat} labels={PRODUCTION_STATUS_LABELS} tones={PRODUCTION_TONE} />
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Trạng thái thanh toán:</label>
                      <p className="text-sm mt-1">
                        <OrderStatusBadge status={selectedOrder.trangThaiThanhToan} labels={PAYMENT_STATUS_LABELS} tones={PAYMENT_TONE} />
                      </p>
                    </div>
                  </div>
                </div>

                {/* Danh sách hàng hóa — optional columns hidden when empty on every item */}
                {(() => {
                  const items = selectedOrder.items ?? [];
                  const showLoai = items.some((i) => i.loaiHangHoa);
                  const showYeuCau = items.some((i) => i.yeuCauHangHoa);
                  const showDongGoi = items.some((i) => i.dongGoi);
                  const ITEM_TH = 'px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase';
                  const ITEM_TD = 'px-4 py-3 text-sm text-gray-900';
                  return (
                    <div className="space-y-4 md:col-span-2 lg:col-span-3">
                      <h4 className="text-md font-semibold text-gray-800 border-b pb-2">Danh sách hàng hóa</h4>
                      {items.length === 0 ? (
                        <p className="text-sm text-gray-400">Đơn hàng chưa có mặt hàng.</p>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th scope="col" className={ITEM_TH}>Mã SP</th>
                                <th scope="col" className={ITEM_TH}>Tên hàng hóa</th>
                                {showLoai && <th scope="col" className={ITEM_TH}>Loại hàng hóa</th>}
                                {showYeuCau && <th scope="col" className={ITEM_TH}>Yêu cầu</th>}
                                {showDongGoi && <th scope="col" className={ITEM_TH}>Đóng gói</th>}
                                <th scope="col" className={`${ITEM_TH} text-right`}>Số lượng</th>
                                <th scope="col" className={ITEM_TH}>Đơn vị</th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {items.map((item, index) => (
                                <tr key={index}>
                                  <td className={ITEM_TD}>{item.maSanPham || EMPTY}</td>
                                  <td className={ITEM_TD}>{item.tenHangHoa || EMPTY}</td>
                                  {showLoai && <td className={ITEM_TD}>{item.loaiHangHoa || EMPTY}</td>}
                                  {showYeuCau && <td className={ITEM_TD}>{item.yeuCauHangHoa || EMPTY}</td>}
                                  {showDongGoi && <td className={ITEM_TD}>{item.dongGoi || EMPTY}</td>}
                                  <td className={`${ITEM_TD} text-right tabular-nums`}>
                                    {typeof item.soLuong === 'number' ? item.soLuong.toLocaleString('vi-VN') : EMPTY}
                                  </td>
                                  <td className={ITEM_TD}>{item.donVi || EMPTY}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Ghi chú */}
                {selectedOrder.ghiChu && (
                  <div className="space-y-4 md:col-span-2 lg:col-span-3">
                    <h4 className="text-md font-semibold text-gray-800 border-b pb-2">Ghi chú</h4>
                    <p className="text-sm text-gray-900">{selectedOrder.ghiChu}</p>
                  </div>
                )}
              </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50 shrink-0">
              <button
                type="button"
                onClick={closeViewModal}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100 transition-colors"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={() => {
                  closeViewModal();
                  handleEdit(selectedOrder);
                }}
                disabled={!canEdit}
                title={!canEdit ? "Bạn không có quyền chỉnh sửa" : ""}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                Chỉnh sửa
              </button>
            </div>
            </>)}
          </div>
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={showEditModal && !!selectedOrder} onClose={() => setShowEditModal(false)} showBackdrop>
        <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full flex flex-col modal-viewport-h" onClick={(e) => e.stopPropagation()}>
            {selectedOrder && (<>
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-yellow-50 to-yellow-100 shrink-0">
              <h3 className="text-xl font-bold text-gray-900 flex items-center">
                <Edit className="w-6 h-6 text-yellow-600 mr-2" />
                Chỉnh sửa đơn hàng - {selectedOrder.maDonHang}
              </h3>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                aria-label="Đóng"
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1">
              <form onSubmit={handleUpdate}>
                <div className="space-y-6">
                  {/* Giá trị đơn hàng */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Giá trị đơn hàng (USD)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.giaTriDonHangUSD || ''}
                        onChange={(e) => setFormData({ ...formData, giaTriDonHangUSD: parseNumberInput(e.target.value) || undefined })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Giá trị đơn hàng (VNĐ)
                      </label>
                      <input
                        type="number"
                        step="1"
                        value={formData.giaTriDonHangVND || ''}
                        onChange={(e) => setFormData({ ...formData, giaTriDonHangVND: parseNumberInput(e.target.value) || undefined })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="0"
                      />
                    </div>
                  </div>

                  {/* Thanh toán đợt 1 */}
                  <div className="border-t pt-4">
                    <h5 className="text-sm font-semibold text-gray-700 mb-3">Thanh toán đợt 1</h5>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Xuất khẩu (USD)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={formData.xuatKhauDot1USD || ''}
                          onChange={(e) => setFormData({ ...formData, xuatKhauDot1USD: parseNumberInput(e.target.value) || undefined })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="0.00"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Nội địa (VNĐ)
                        </label>
                        <input
                          type="number"
                          step="1"
                          value={formData.noiDiaDot1VND || ''}
                          onChange={(e) => setFormData({ ...formData, noiDiaDot1VND: parseNumberInput(e.target.value) || undefined })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Ngày thanh toán
                        </label>
                        <input
                          type="date"
                          value={formData.ngayThanhToanDot1 ? new Date(formData.ngayThanhToanDot1).toISOString().split('T')[0] : ''}
                          onChange={(e) => setFormData({ ...formData, ngayThanhToanDot1: e.target.value || undefined })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Thanh toán đợt 2 */}
                  <div className="border-t pt-4">
                    <h5 className="text-sm font-semibold text-gray-700 mb-3">Thanh toán đợt 2</h5>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Xuất khẩu (USD)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={formData.xuatKhauDot2USD || ''}
                          onChange={(e) => setFormData({ ...formData, xuatKhauDot2USD: parseNumberInput(e.target.value) || undefined })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="0.00"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Nội địa (VNĐ)
                        </label>
                        <input
                          type="number"
                          step="1"
                          value={formData.noiDiaDot2VND || ''}
                          onChange={(e) => setFormData({ ...formData, noiDiaDot2VND: parseNumberInput(e.target.value) || undefined })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Ngày thanh toán
                        </label>
                        <input
                          type="date"
                          value={formData.ngayThanhToanDot2 ? new Date(formData.ngayThanhToanDot2).toISOString().split('T')[0] : ''}
                          onChange={(e) => setFormData({ ...formData, ngayThanhToanDot2: e.target.value || undefined })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Thông tin sản xuất */}
                  <div className="border-t pt-4">
                    <h5 className="text-sm font-semibold text-gray-700 mb-3">Thông tin sản xuất</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Ngày bắt đầu sản xuất (KH)
                        </label>
                        <input
                          type="date"
                          value={formData.ngayBatDauSanXuatKeHoach ? new Date(formData.ngayBatDauSanXuatKeHoach).toISOString().split('T')[0] : ''}
                          onChange={(e) => setFormData({ ...formData, ngayBatDauSanXuatKeHoach: e.target.value || undefined })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Ngày hoàn thành sản xuất (KH)
                        </label>
                        <input
                          type="date"
                          value={formData.ngayHoanThanhSanXuatKeHoach ? new Date(formData.ngayHoanThanhSanXuatKeHoach).toISOString().split('T')[0] : ''}
                          onChange={(e) => setFormData({ ...formData, ngayHoanThanhSanXuatKeHoach: e.target.value || undefined })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Ngày hoàn thành thực tế
                        </label>
                        <input
                          type="date"
                          value={formData.ngayHoanThanhThucTe ? new Date(formData.ngayHoanThanhThucTe).toISOString().split('T')[0] : ''}
                          onChange={(e) => setFormData({ ...formData, ngayHoanThanhThucTe: e.target.value || undefined })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Ngày giao hàng
                        </label>
                        <input
                          type="date"
                          value={formData.ngayGiaoHang ? new Date(formData.ngayGiaoHang).toISOString().split('T')[0] : ''}
                          onChange={(e) => setFormData({ ...formData, ngayGiaoHang: e.target.value || undefined })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Trạng thái */}
                  <div className="border-t pt-4">
                    <h5 className="text-sm font-semibold text-gray-700 mb-3">Trạng thái</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Trạng thái sản xuất
                        </label>
                        <select
                          value={formData.trangThaiSanXuat || ''}
                          onChange={(e) => setFormData({ ...formData, trangThaiSanXuat: e.target.value || undefined })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="">-- Chọn trạng thái --</option>
                          <option value="CHO_LEN_KE_HOACH">Chờ lên kế hoạch</option>
                          <option value="CHO_SAN_XUAT">Chờ sản xuất</option>
                          <option value="DANG_SAN_XUAT">Đang sản xuất</option>
                          <option value="CHO_GIAO_HANG">Chờ giao hàng</option>
                          <option value="DA_LEN_CONTAINER">Đã lên container</option>
                          <option value="DANG_VAN_CHUYEN">Đang vận chuyển</option>
                          <option value="DA_GIAO_CHO_KHACH_HANG">Đã giao cho khách hàng</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Trạng thái thanh toán
                        </label>
                        <select
                          value={formData.trangThaiThanhToan || ''}
                          onChange={(e) => setFormData({ ...formData, trangThaiThanhToan: e.target.value || undefined })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="">-- Chọn trạng thái --</option>
                          <option value="DA_THANH_TOAN_DOT_1">Đã thanh toán đợt 1</option>
                          <option value="CHO_THANH_TOAN_DOT_2">Chờ thanh toán đợt 2</option>
                          <option value="DA_THANH_TOAN_DU">Đã thanh toán đủ</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Ghi chú */}
                  <div className="border-t pt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Ghi chú
                    </label>
                    <textarea
                      rows={4}
                      value={formData.ghiChu || ''}
                      onChange={(e) => setFormData({ ...formData, ghiChu: e.target.value || undefined })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Nhập ghi chú..."
                    />
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="flex justify-end space-x-3 mt-6 pt-6 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100 transition-colors"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    Lưu thay đổi
                  </button>
                </div>
              </form>
            </div>
            </>)}
          </div>
      </Modal>
      <QuotationCalculatorModal
        isOpen={showCostingModal}
        onClose={() => {
          setShowCostingModal(false);
          setQuotationRequestForModal(null);
        }}
        quotationRequest={quotationRequestForModal}
        onSuccess={() => {
          setShowCostingModal(false);
          setQuotationRequestForModal(null);
        }}
      />

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmOpen}
        title="Xác nhận xóa"
        message={confirmMessage}
        confirmText="Xóa"
        cancelText="Hủy"
        onConfirm={() => confirmAction && confirmAction()}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
};

export default OrderManagement;
