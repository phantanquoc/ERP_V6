import React, { useState } from 'react';
import { Eye, Edit, Trash2, Package, Calculator, Download, AlertCircle, CheckCircle } from 'lucide-react';
import { orderService, Order } from '../services/orderService';
import { quotationRequestService, QuotationRequest } from '../services/quotationRequestService';
import QuotationCalculatorModal from './QuotationCalculatorModal';
import { useOrders, orderKeys } from '../hooks';
import { useQueryClient } from '@tanstack/react-query';
import { parseNumberInput } from '../utils/numberInput';

interface OrderManagementProps {
  hideHeader?: boolean;
  customerType?: 'Quốc tế' | 'Nội địa' | 'all';
}

const OrderManagement: React.FC<OrderManagementProps> = ({ hideHeader = false, customerType }) => {
  const [columnFilters, setColumnFilters] = useState({
    maDonHang: '',
    maBaoGia: '',
    tenKhachHang: '',
    trangThaiSanXuat: '',
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCostingModal, setShowCostingModal] = useState(false);
  const [formData, setFormData] = useState<Partial<Order>>({});
  const [quotationRequestForModal, setQuotationRequestForModal] = useState<QuotationRequest | null>(null);
  const [exportError, setExportError] = useState<string>('');
  const [exportSuccess, setExportSuccess] = useState<string>('');
  const [exportLoading, setExportLoading] = useState(false);

  const itemsPerPage = 10;

  const queryClient = useQueryClient();
  const filterCustomerType = customerType === 'all' ? undefined : customerType;
  const { data: ordersData, isLoading: loading, refetch: refetchOrders } = useOrders({
    page: 1,
    limit: 1000,
    customerType: filterCustomerType,
  });
  const orders = React.useMemo(() => {
    const allOrders = ordersData?.data || [];
    return allOrders.filter(order => {
      const matchMaDH = !columnFilters.maDonHang || (order.maDonHang || '').toLowerCase().includes(columnFilters.maDonHang.toLowerCase());
      const matchMaBG = !columnFilters.maBaoGia || (order.maBaoGia || '').toLowerCase().includes(columnFilters.maBaoGia.toLowerCase());
      const matchKH = !columnFilters.tenKhachHang || (order.tenKhachHang || '').toLowerCase().includes(columnFilters.tenKhachHang.toLowerCase());
      const matchTTSX = !columnFilters.trangThaiSanXuat || (order.trangThaiSanXuat || '').toLowerCase().includes(columnFilters.trangThaiSanXuat.toLowerCase());
      return matchMaDH && matchMaBG && matchKH && matchTTSX;
    });
  }, [ordersData, columnFilters]);

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
    setShowViewModal(true);
  };

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
      alert('Cập nhật đơn hàng thành công');
      setShowEditModal(false);
      queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
    } catch (error) {
      console.error('Error updating order:', error);
      alert('Lỗi khi cập nhật đơn hàng');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa đơn hàng này?')) {
      return;
    }

    try {
      await orderService.deleteOrder(id);
      alert('Xóa đơn hàng thành công');
      queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
    } catch (error) {
      console.error('Error deleting order:', error);
      alert('Lỗi khi xóa đơn hàng');
    }
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
      console.error('❌ Error fetching quotation request:', error);
      alert('Lỗi khi tải thông tin yêu cầu báo giá');
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
    <div>
      {/* Action Bar */}
      <div className="mb-4 flex flex-wrap gap-4 items-center justify-end">
        <button
          onClick={handleExportExcel}
          disabled={exportLoading}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
        >
          <Download size={18} />
          {exportLoading ? 'Đang xuất...' : 'Xuất Excel'}
        </button>
      </div>

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
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
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
            <tr className="bg-white border-b border-gray-200">
              <th className="px-2 py-2 border-r border-gray-200"></th>
              <th className="px-2 py-2 border-r border-gray-200"></th>
              <th className="px-2 py-2 border-r border-gray-200">
                <input type="text" placeholder="Lọc..." value={columnFilters.maDonHang} onChange={(e) => { setColumnFilters(prev => ({...prev, maDonHang: e.target.value})); setCurrentPage(1); }} className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500" />
              </th>
              <th className="px-2 py-2 border-r border-gray-200">
                <input type="text" placeholder="Lọc..." value={columnFilters.maBaoGia} onChange={(e) => { setColumnFilters(prev => ({...prev, maBaoGia: e.target.value})); setCurrentPage(1); }} className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500" />
              </th>
              <th className="px-2 py-2 border-r border-gray-200">
                <input type="text" placeholder="Lọc..." value={columnFilters.tenKhachHang} onChange={(e) => { setColumnFilters(prev => ({...prev, tenKhachHang: e.target.value})); setCurrentPage(1); }} className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500" />
              </th>
              <th className="px-2 py-2 border-r border-gray-200"></th>
              <th className="px-2 py-2 border-r border-gray-200">
                <input type="text" placeholder="Lọc..." value={columnFilters.trangThaiSanXuat} onChange={(e) => { setColumnFilters(prev => ({...prev, trangThaiSanXuat: e.target.value})); setCurrentPage(1); }} className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500" />
              </th>
              <th className="px-2 py-2 border-r border-gray-200"></th>
              <th className="px-2 py-2"></th>
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
              orders.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((order, index) => (
                <tr key={order.id} className={`border-b border-gray-200 hover:bg-blue-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                  <td className="px-6 py-4 text-sm text-blue-600 font-medium border-r border-gray-200">
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
                        className="text-gray-500 hover:text-blue-600"
                        title="Xem chi tiết"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleViewCosting(order)}
                        className="text-gray-500 hover:text-purple-600"
                        title="Xem bảng tính"
                      >
                        <Calculator className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleEdit(order)}
                        className="text-gray-500 hover:text-green-600"
                        title="Chỉnh sửa"
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(order.id)}
                        className="text-gray-500 hover:text-red-600"
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
      </div>

      {(() => {
        const totalItems = orders.length;
        const totalPages = Math.ceil(totalItems / itemsPerPage);
        return totalPages > 1 ? (
          <div className="flex items-center justify-between mt-4 px-2">
            <span className="text-sm text-gray-600">
              Hiển thị {(currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, totalItems)} / {totalItems} mục
            </span>
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
          </div>
        ) : null;
      })()}

      {/* View Modal */}
      {showViewModal && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-blue-100">
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

            {/* Modal Body */}
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Thông tin cơ bản */}
                <div className="space-y-4">
                  <h4 className="text-md font-semibold text-gray-800 border-b pb-2">Thông tin cơ bản</h4>
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
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
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
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-yellow-50 to-yellow-100">
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
            <div className="p-6">
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
          </div>
        </div>
      )}

      {/* Quotation Calculator Modal */}
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
    </div>
  );
};

export default OrderManagement;
