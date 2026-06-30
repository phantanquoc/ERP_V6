import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Eye, Edit, Trash2, Package, Calculator, Download, AlertCircle, CheckCircle } from 'lucide-react';
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

interface OrderManagementProps {
  hideHeader?: boolean;
  customerType?: 'Quốc tế' | 'Nội địa' | 'all';
}

const OrderManagement: React.FC<OrderManagementProps> = ({ hideHeader = false, customerType }) => {
  const { user } = useAuth();
  const [filterValues, setFilterValues] = useState<Record<string, string>>({
    _search: '',
    maDonHang: '',
    maBaoGia: '',
    tenKhachHang: '',
    trangThaiSanXuat: '',
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(20);
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
  const { data: ordersData, isLoading: loading, refetch: refetchOrders } = useOrders({
    page: currentPage,
    limit,
    search: filterValues._search || undefined,
    customerType: filterCustomerType,
    status: filterValues.trangThaiSanXuat || undefined,
  });

  const orders = ordersData?.data || [];
  const totalItems = (ordersData as any)?.pagination?.total ?? 0;
  const totalPages = (ordersData as any)?.pagination?.totalPages ?? 1;

  const orderFilterFields: FilterField[] = [
    { key: 'maDonHang', label: 'Mã ĐH', type: 'text' },
    { key: 'maBaoGia', label: 'Mã BG', type: 'text' },
    { key: 'tenKhachHang', label: 'Khách hàng', type: 'text' },
    { key: 'trangThaiSanXuat', label: 'Trạng thái SX', type: 'text' },
  ];

  const handleFilterChange = (newValues: Record<string, string>) => {
    setFilterValues(newValues);
    setCurrentPage(1);
  };

  const handleExportExcel = async () => {
    try {
      setExportError('');
      setExportLoading(true);
      await orderService.exportToExcel({});
      setExportSuccess('Đã xuất file Excel thành công');
      setTimeout(() => setExportSuccess(''), 3000);
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      setExportError('Không thể xuất file Excel');
    } finally {
      setExportLoading(false);
    }
  };

  const handleView = (order: Order) => {
    setSelectedOrder(order);
    setOrderDetailTab('info');
    setOrderAuditPage(1);
    setShowViewModal(true);
  };

  // Auto-open view modal when ?orderId= is in URL (deep-link from notifications)
  const [searchParams, setSearchParams] = useSearchParams();
  useEffect(() => {
    const orderId = searchParams.get('orderId');
    if (!orderId) return;
    let cancelled = false;
    orderService
      .getOrderById(orderId)
      .then((res: any) => {
        if (cancelled) return;
        const order = res?.data ?? res;
        if (order && order.id) {
          handleView(order as Order);
        }
        const next = new URLSearchParams(searchParams);
        next.delete('orderId');
        setSearchParams(next, { replace: true });
      })
      .catch((err) => {
        console.error('Error loading order from URL:', err);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.get('orderId')]);

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

  const handleDelete = async (id: string) => {
    setConfirmMessage('Bạn có chắc chắn muốn xóa đơn hàng này?');
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
      // Fetch quotation request data
      console.log('🔍 Fetching quotation request for order:', order.maDonHang, 'YCBG ID:', order.quotationRequestId);
      const response = await quotationRequestService.getQuotationRequestById(order.quotationRequestId);
      console.log('✅ Loaded quotation request:', response);
      setQuotationRequestForModal(response.data);
      setShowCostingModal(true);
    } catch (error) {
      console.error('Error fetching quotation request:', error);
      toast.error('Lỗi khi tải thông tin yêu cầu báo giá');
    }
  };



  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('vi-VN');
  };

  const getProductionStatusLabel = (status?: string) => {
    const statusMap: Record<string, string> = {
      CHO_LEN_KE_HOACH: 'Chờ lên kế hoạch',
      CHO_SAN_XUAT: 'Chờ sản xuất',
      DANG_SAN_XUAT: 'Đang sản xuất',
      CHO_GIAO_HANG: 'Chờ giao hàng',
      DA_LEN_CONTAINER: 'Đã lên container',
      DANG_VAN_CHUYEN: 'Đang vận chuyển',
      DA_GIAO_CHO_KHACH_HANG: 'Đã giao cho khách hàng',
    };
    return status ? statusMap[status] || status : 'Chọn trạng thái';
  };

  const getPaymentStatusLabel = (status?: string) => {
    const statusMap: Record<string, string> = {
      DA_THANH_TOAN_DOT_1: 'Đã thanh toán đợt 1',
      CHO_THANH_TOAN_DOT_2: 'Chờ thanh toán đợt 2',
      DA_THANH_TOAN_DU: 'Đã thanh toán đủ',
    };
    return status ? statusMap[status] || status : 'Chọn trạng thái';
  };

  const getProductionStatusColor = (status?: string) => {
    const colorMap: Record<string, string> = {
      CHO_LEN_KE_HOACH: 'bg-gray-100 text-gray-800',
      CHO_SAN_XUAT: 'bg-yellow-100 text-yellow-800',
      DANG_SAN_XUAT: 'bg-blue-100 text-blue-800',
      CHO_GIAO_HANG: 'bg-purple-100 text-purple-800',
      DA_LEN_CONTAINER: 'bg-indigo-100 text-indigo-800',
      DANG_VAN_CHUYEN: 'bg-orange-100 text-orange-800',
      DA_GIAO_CHO_KHACH_HANG: 'bg-green-100 text-green-800',
    };
    return status ? colorMap[status] || 'bg-gray-100 text-gray-800' : 'bg-gray-100 text-gray-800';
  };

  const getPaymentStatusColor = (status?: string) => {
    const colorMap: Record<string, string> = {
      DA_THANH_TOAN_DOT_1: 'bg-yellow-100 text-yellow-800',
      CHO_THANH_TOAN_DOT_2: 'bg-orange-100 text-orange-800',
      DA_THANH_TOAN_DU: 'bg-green-100 text-green-800',
    };
    return status ? colorMap[status] || 'bg-gray-100 text-gray-800' : 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Danh sách đơn hàng</h2>
        <button
          onClick={handleExportExcel}
          disabled={exportLoading}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
        >
          <Download size={18} />
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

      {/* Table */}
        <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-300">
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">STT</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Ngày đặt hàng</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Mã đơn hàng</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Mã báo giá</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Khách hàng</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Số lượng SP</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Trạng thái SX</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Trạng thái TT</th>
              <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">Hành động</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} className="px-6 py-8 text-center text-gray-500">
                  Đang tải...
                </td>
              </tr>
            ) : orders.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-6 py-8 text-center text-gray-500">
                  Không có dữ liệu
                </td>
              </tr>
            ) : (
              orders.map((order, index) => (
                <tr key={order.id} className={`border-b border-gray-200 hover:bg-blue-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                  <td className="px-6 py-4 text-sm text-gray-900 border-r border-gray-200">
                    {(currentPage - 1) * itemsPerPage + index + 1}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700 border-r border-gray-200">
                    {formatDate(order.ngayDatHang)}
                  </td>
                  <td className="px-6 py-4 text-sm font-semibold text-blue-600 border-r border-gray-200">
                    {order.maDonHang}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700 border-r border-gray-200">
                    {order.maBaoGia}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700 border-r border-gray-200">
                    {order.tenKhachHang}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700 border-r border-gray-200">
                    {order.items?.length || 0}
                  </td>
                  <td className="px-6 py-4 border-r border-gray-200">
                    <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getProductionStatusColor(order.trangThaiSanXuat)}`}>
                      {getProductionStatusLabel(order.trangThaiSanXuat)}
                    </span>
                  </td>
                  <td className="px-6 py-4 border-r border-gray-200">
                    <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getPaymentStatusColor(order.trangThaiThanhToan)}`}>
                      {getPaymentStatusLabel(order.trangThaiThanhToan)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-3">
                      <button
                        onClick={() => handleView(order)}
                        className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-md transition-colors"
                        title="Xem chi tiết"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleViewCosting(order)}
                        className="p-1.5 text-purple-600 hover:bg-purple-100 rounded-md transition-colors"
                        title="Xem bảng tính"
                      >
                        <Calculator className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleEdit(order)}
                        className="p-1.5 text-green-600 hover:bg-green-100 rounded-md transition-colors"
                        title="Chỉnh sửa"
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(order.id)}
                        className="p-1.5 text-red-600 hover:bg-red-100 rounded-md transition-colors"
                        title="Xóa"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
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
        <div className="flex items-center justify-between mt-4 px-2">
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600">
              Hiển thị {(currentPage - 1) * limit + 1}–{Math.min(currentPage * limit, totalItems)} / {totalItems} mục
            </span>
            <select
              value={limit}
              onChange={(e) => { setLimit(Number(e.target.value)); setCurrentPage(1); }}
              className="text-sm border border-gray-300 rounded-md px-2 py-1"
            >
              {[10, 20, 50, 100].map(n => <option key={n} value={n}>{n}/trang</option>)}
            </select>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
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
          )}
        </div>
      )}

      {/* View Modal */}
      <Modal isOpen={showViewModal && !!selectedOrder} onClose={() => setShowViewModal(false)} showBackdrop closeOnBackdrop={true}>
        <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full flex flex-col max-h-[calc(100vh-2rem)]" onClick={(e) => e.stopPropagation()}>
            {selectedOrder && (<>
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-blue-100 shrink-0">
              <h3 className="text-xl font-bold text-gray-900 flex items-center">
                <Package className="w-6 h-6 text-blue-600 mr-2" />
                Chi tiết đơn hàng - {selectedOrder.maDonHang}
              </h3>
              <button
                onClick={() => setShowViewModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Tab navigation (task 11.3) */}
            <div className="flex border-b border-gray-200 px-6 shrink-0">
              <button
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${orderDetailTab === 'info' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                onClick={() => setOrderDetailTab('info')}
              >
                Thông tin
              </button>
              {(user?.role === 'ADMIN' || user?.role === 'DEPARTMENT_HEAD') && (
                <button
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
                      <p className="text-sm text-gray-900 font-medium text-blue-600">{selectedOrder.maDonHang}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Ngày đặt hàng:</label>
                      <p className="text-sm text-gray-900">{new Date(selectedOrder.ngayDatHang).toLocaleDateString('vi-VN')}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Mã báo giá:</label>
                      <p className="text-sm text-gray-900">{selectedOrder.maBaoGia}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Mã YCBG:</label>
                      <p className="text-sm text-gray-900">{selectedOrder.maYeuCauBaoGia}</p>
                    </div>
                  </div>
                </div>

                {/* Thông tin khách hàng */}
                <div className="space-y-4">
                  <h4 className="text-md font-semibold text-gray-800 border-b pb-2">Thông tin khách hàng</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Mã khách hàng:</label>
                      <p className="text-sm text-gray-900">{selectedOrder.maKhachHang}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Tên khách hàng:</label>
                      <p className="text-sm text-gray-900">{selectedOrder.tenKhachHang}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Nhân viên phụ trách:</label>
                      <p className="text-sm text-gray-900">{selectedOrder.tenNhanVien || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                {/* Giá trị đơn hàng */}
                <div className="space-y-4">
                  <h4 className="text-md font-semibold text-gray-800 border-b pb-2">Giá trị đơn hàng</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Giá trị (USD):</label>
                      <p className="text-sm text-gray-900 font-semibold text-green-600">
                        {selectedOrder.giaTriDonHangUSD ? `$${selectedOrder.giaTriDonHangUSD.toLocaleString()}` : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Giá trị (VNĐ):</label>
                      <p className="text-sm text-gray-900 font-semibold text-green-600">
                        {selectedOrder.giaTriDonHangVND ? `${selectedOrder.giaTriDonHangVND.toLocaleString()} VNĐ` : 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Thanh toán đợt 1 */}
                <div className="space-y-4">
                  <h4 className="text-md font-semibold text-gray-800 border-b pb-2">Thanh toán đợt 1</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Xuất khẩu (USD):</label>
                      <p className="text-sm text-gray-900">
                        {selectedOrder.xuatKhauDot1USD ? `$${selectedOrder.xuatKhauDot1USD.toLocaleString()}` : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Nội địa (VNĐ):</label>
                      <p className="text-sm text-gray-900">
                        {selectedOrder.noiDiaDot1VND ? `${selectedOrder.noiDiaDot1VND.toLocaleString()} VNĐ` : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Ngày thanh toán:</label>
                      <p className="text-sm text-gray-900">
                        {selectedOrder.ngayThanhToanDot1 ? new Date(selectedOrder.ngayThanhToanDot1).toLocaleDateString('vi-VN') : 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Thanh toán đợt 2 */}
                <div className="space-y-4">
                  <h4 className="text-md font-semibold text-gray-800 border-b pb-2">Thanh toán đợt 2</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Xuất khẩu (USD):</label>
                      <p className="text-sm text-gray-900">
                        {selectedOrder.xuatKhauDot2USD ? `$${selectedOrder.xuatKhauDot2USD.toLocaleString()}` : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Nội địa (VNĐ):</label>
                      <p className="text-sm text-gray-900">
                        {selectedOrder.noiDiaDot2VND ? `${selectedOrder.noiDiaDot2VND.toLocaleString()} VNĐ` : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Ngày thanh toán:</label>
                      <p className="text-sm text-gray-900">
                        {selectedOrder.ngayThanhToanDot2 ? new Date(selectedOrder.ngayThanhToanDot2).toLocaleDateString('vi-VN') : 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Thông tin sản xuất */}
                <div className="space-y-4">
                  <h4 className="text-md font-semibold text-gray-800 border-b pb-2">Thông tin sản xuất</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Ngày bắt đầu KH:</label>
                      <p className="text-sm text-gray-900">
                        {selectedOrder.ngayBatDauSanXuatKeHoach ? new Date(selectedOrder.ngayBatDauSanXuatKeHoach).toLocaleDateString('vi-VN') : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Ngày hoàn thành KH:</label>
                      <p className="text-sm text-gray-900">
                        {selectedOrder.ngayHoanThanhSanXuatKeHoach ? new Date(selectedOrder.ngayHoanThanhSanXuatKeHoach).toLocaleDateString('vi-VN') : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Ngày hoàn thành thực tế:</label>
                      <p className="text-sm text-gray-900">
                        {selectedOrder.ngayHoanThanhThucTe ? new Date(selectedOrder.ngayHoanThanhThucTe).toLocaleDateString('vi-VN') : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Ngày giao hàng:</label>
                      <p className="text-sm text-gray-900">
                        {selectedOrder.ngayGiaoHang ? new Date(selectedOrder.ngayGiaoHang).toLocaleDateString('vi-VN') : 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Trạng thái */}
                <div className="space-y-4 md:col-span-2 lg:col-span-3">
                  <h4 className="text-md font-semibold text-gray-800 border-b pb-2">Trạng thái</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Trạng thái sản xuất:</label>
                      <p className="text-sm mt-1">
                        <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getProductionStatusColor(selectedOrder.trangThaiSanXuat)}`}>
                          {getProductionStatusLabel(selectedOrder.trangThaiSanXuat)}
                        </span>
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Trạng thái thanh toán:</label>
                      <p className="text-sm mt-1">
                        <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getPaymentStatusColor(selectedOrder.trangThaiThanhToan)}`}>
                          {getPaymentStatusLabel(selectedOrder.trangThaiThanhToan)}
                        </span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Danh sách hàng hóa */}
                <div className="space-y-4 md:col-span-2 lg:col-span-3">
                  <h4 className="text-md font-semibold text-gray-800 border-b pb-2">Danh sách hàng hóa</h4>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mã SP</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tên hàng hóa</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Loại hàng hóa</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Yêu cầu</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Đóng gói</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Số lượng</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Đơn vị</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {selectedOrder.items?.map((item, index) => (
                          <tr key={index}>
                            <td className="px-4 py-3 text-sm text-gray-900">{item.maSanPham}</td>
                            <td className="px-4 py-3 text-sm text-gray-900">{item.tenHangHoa}</td>
                            <td className="px-4 py-3 text-sm text-gray-900">{item.loaiHangHoa || 'N/A'}</td>
                            <td className="px-4 py-3 text-sm text-gray-900">{item.yeuCauHangHoa || 'N/A'}</td>
                            <td className="px-4 py-3 text-sm text-gray-900">{item.dongGoi || 'N/A'}</td>
                            <td className="px-4 py-3 text-sm text-gray-900">{item.soLuong.toLocaleString()}</td>
                            <td className="px-4 py-3 text-sm text-gray-900">{item.donVi}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

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
                onClick={() => setShowViewModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100 transition-colors"
              >
                Đóng
              </button>
              <button
                onClick={() => {
                  setShowViewModal(false);
                  setShowEditModal(true);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Chỉnh sửa
              </button>
            </div>
            </>)}
          </div>
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={showEditModal && !!selectedOrder} onClose={() => setShowEditModal(false)} showBackdrop>
        <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full flex flex-col max-h-[calc(100vh-2rem)]" onClick={(e) => e.stopPropagation()}>
            {selectedOrder && (<>
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-yellow-50 to-yellow-100 shrink-0">
              <h3 className="text-xl font-bold text-gray-900 flex items-center">
                <Edit className="w-6 h-6 text-yellow-600 mr-2" />
                Chỉnh sửa đơn hàng - {selectedOrder.maDonHang}
              </h3>
              <button
                onClick={() => setShowEditModal(false)}
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
                  <div className="grid grid-cols-2 gap-4">
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
                    <div className="grid grid-cols-3 gap-4">
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
                    <div className="grid grid-cols-3 gap-4">
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
                    <div className="grid grid-cols-2 gap-4">
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
                    <div className="grid grid-cols-2 gap-4">
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
        onConfirm={() => confirmAction && confirmAction()}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
};

export default OrderManagement;
