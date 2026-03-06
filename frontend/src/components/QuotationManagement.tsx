import React, { useState } from 'react';
import { Search, Eye, Edit, Trash2, ShoppingCart, Download, AlertCircle, CheckCircle } from 'lucide-react';
import { quotationService, Quotation } from '../services/quotationService';
import { orderService } from '../services/orderService';
import { useQuotations, quotationKeys } from '../hooks';
import { useQueryClient } from '@tanstack/react-query';

interface QuotationManagementProps {
  customerType?: 'Quốc tế' | 'Nội địa' | 'all';
}

const QuotationManagement: React.FC<QuotationManagementProps> = ({ customerType }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedQuotation, setSelectedQuotation] = useState<Quotation | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [exportError, setExportError] = useState<string>('');
  const [exportSuccess, setExportSuccess] = useState<string>('');
  const [editFormData, setEditFormData] = useState({
    giaBaoKhach: '',
    thoiGianGiaoHang: '',
    hieuLucBaoGia: '',
    tinhTrang: '',
    ghiChu: '',
  });

  const itemsPerPage = 10;
  const queryClient = useQueryClient();

  const filterCustomerType = customerType === 'all' ? undefined : customerType;
  const { data: quotationsData, isLoading: loading } = useQuotations({
    page: 1,
    limit: 1000,
    search: searchTerm || undefined,
    customerType: filterCustomerType,
  });
  const quotations = quotationsData?.data || [];

  const handleView = (quotation: Quotation) => {
    setSelectedQuotation(quotation);
    setShowViewModal(true);
  };

  const handleEdit = (quotation: Quotation) => {
    setSelectedQuotation(quotation);
    setEditFormData({
      giaBaoKhach: quotation.giaBaoKhach?.toString() || '',
      thoiGianGiaoHang: quotation.thoiGianGiaoHang?.toString() || '',
      hieuLucBaoGia: quotation.hieuLucBaoGia?.toString() || '',
      tinhTrang: quotation.tinhTrang || '',
      ghiChu: quotation.ghiChu || '',
    });
    setShowEditModal(true);
  };

  const handleUpdateQuotation = async () => {
    if (!selectedQuotation) return;

    try {
      const updateData: any = {};

      if (editFormData.giaBaoKhach) {
        updateData.giaBaoKhach = parseFloat(editFormData.giaBaoKhach);
      }
      if (editFormData.thoiGianGiaoHang) {
        updateData.thoiGianGiaoHang = parseInt(editFormData.thoiGianGiaoHang);
      }
      if (editFormData.hieuLucBaoGia) {
        updateData.hieuLucBaoGia = parseInt(editFormData.hieuLucBaoGia);
      }
      if (editFormData.tinhTrang) {
        updateData.tinhTrang = editFormData.tinhTrang;
      }
      if (editFormData.ghiChu !== selectedQuotation.ghiChu) {
        updateData.ghiChu = editFormData.ghiChu;
      }

      await quotationService.updateQuotation(selectedQuotation.id, updateData);
      alert('Cập nhật báo giá thành công!');
      setShowEditModal(false);
      queryClient.invalidateQueries({ queryKey: quotationKeys.lists() });
    } catch (error: any) {
      console.error('Error updating quotation:', error);
      alert(error.response?.data?.message || 'Lỗi khi cập nhật báo giá');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa báo giá này?')) {
      return;
    }

    try {
      await quotationService.deleteQuotation(id);
      alert('Xóa báo giá thành công!');
      queryClient.invalidateQueries({ queryKey: quotationKeys.lists() });
    } catch (error: any) {
      console.error('Error deleting quotation:', error);
      alert(error.response?.data?.message || 'Lỗi khi xóa báo giá');
    }
  };

  const handleCreateOrder = async (quotationId: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn tạo đơn hàng từ báo giá này?')) {
      return;
    }

    try {
      await orderService.createOrderFromQuotation(quotationId);
      alert('Tạo đơn hàng thành công!');
      queryClient.invalidateQueries({ queryKey: quotationKeys.lists() });
    } catch (error: any) {
      console.error('Error creating order:', error);
      alert(error.response?.data?.message || 'Lỗi khi tạo đơn hàng');
    }
  };

  const handleExportExcel = async () => {
    try {
      setExportError('');
      setExportLoading(true);
      await quotationService.exportToExcel({ search: searchTerm || undefined });
      setExportSuccess('Đã xuất file Excel thành công');
      setTimeout(() => setExportSuccess(''), 3000);
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      setExportError('Không thể xuất file Excel');
    } finally {
      setExportLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; className: string }> = {
      DRAFT: { label: 'Nháp', className: 'bg-gray-100 text-gray-800' },
      DANG_CHO_PHAN_HOI: { label: 'Đang chờ phản hồi', className: 'bg-yellow-100 text-yellow-800' },
      DANG_CHO_GUI_DON_HANG: { label: 'Đang chờ gửi đơn hàng', className: 'bg-blue-100 text-blue-800' },
      DA_DAT_HANG: { label: 'Đã đặt hàng', className: 'bg-green-100 text-green-800' },
      KHONG_DAT_HANG: { label: 'Không đặt hàng', className: 'bg-red-100 text-red-800' },
      SENT: { label: 'Đã gửi', className: 'bg-blue-100 text-blue-800' },
      APPROVED: { label: 'Đã duyệt', className: 'bg-green-100 text-green-800' },
      REJECTED: { label: 'Từ chối', className: 'bg-red-100 text-red-800' },
      EXPIRED: { label: 'Hết hạn', className: 'bg-gray-100 text-gray-800' },
    };

    const statusInfo = statusMap[status] || { label: status, className: 'bg-gray-100 text-gray-800' };
    return (
      <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${statusInfo.className}`}>
        {statusInfo.label}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN');
  };

  const formatCurrency = (value?: number) => {
    if (!value) return '-';
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(value);
  };

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="flex items-center justify-between">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Tìm kiếm..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            className="pl-10 pr-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:border-blue-400 transition-colors w-64"
          />
        </div>
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
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b-2 border-gray-200">
              <th className="px-4 py-3 text-left text-sm font-semibold text-blue-600">STT</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-blue-600">Ngày BG</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-blue-600">Mã báo giá</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-blue-600">Giá báo khách</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-blue-600">TG giao hàng</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-blue-600">Hiệu lực</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-blue-600">Nhân viên</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-blue-600">Trạng thái</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-blue-600">Ghi chú</th>
              <th className="px-4 py-3 text-center text-sm font-semibold text-blue-600">Hành động</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={10} className="px-4 py-8 text-center text-gray-500">
                  Đang tải...
                </td>
              </tr>
            ) : quotations.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-4 py-8 text-center text-gray-500">
                  Không có dữ liệu
                </td>
              </tr>
            ) : (
              quotations.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((quotation, index) => (
                <tr key={quotation.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-blue-600 font-medium">
                    {(currentPage - 1) * itemsPerPage + index + 1}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                    {formatDate(quotation.ngayBaoGia)}
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold text-blue-600">
                    {quotation.maBaoGia}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {quotation.quotationRequest?.calculator?.products && quotation.quotationRequest.calculator.products.length > 0 ? (
                      <div className="space-y-1">
                        {quotation.quotationRequest.calculator.products.map((product: any, idx: number) => {
                          const giaBaoKhach = (product.giaHoaVon || 0) + (product.loiNhuanCongThem || 0);
                          return (
                            <div key={idx} className="flex items-center gap-1.5">
                              <span className="text-gray-600 text-xs">{product.tenSanPham}:</span>
                              <span className="font-semibold text-green-600">{formatCurrency(giaBaoKhach)}</span>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <span className="font-semibold text-green-600">{formatCurrency(quotation.giaBaoKhach)}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                    {quotation.thoiGianGiaoHang ? `${quotation.thoiGianGiaoHang} ngày` : '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                    {quotation.hieuLucBaoGia ? `${quotation.hieuLucBaoGia} ngày` : '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {quotation.tenNhanVien || '-'}
                  </td>
                  <td className="px-4 py-3">
                    {getStatusBadge(quotation.tinhTrang)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 max-w-xs truncate">
                    {quotation.ghiChu || '-'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-3">
                      <button
                        onClick={() => handleView(quotation)}
                        className="text-gray-500 hover:text-blue-600"
                        title="Xem chi tiết"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleEdit(quotation)}
                        className="text-gray-500 hover:text-green-600"
                        title="Chỉnh sửa"
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleCreateOrder(quotation.id)}
                        className="text-gray-500 hover:text-purple-600"
                        title="Tạo đơn hàng"
                      >
                        <ShoppingCart className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(quotation.id)}
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

      {(() => {
        const totalItems = quotations.length;
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

      {/* Modal Xem Chi Tiết */}
      {showViewModal && selectedQuotation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 flex justify-between items-center rounded-t-xl">
              <h2 className="text-2xl font-bold">Chi Tiết Báo Giá</h2>
              <button
                onClick={() => setShowViewModal(false)}
                className="text-white hover:text-gray-200 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Thông tin cơ bản */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mã báo giá</label>
                  <p className="text-lg font-semibold text-blue-600">
                    {selectedQuotation.maBaoGia}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ngày báo giá</label>
                  <p className="text-lg">{new Date(selectedQuotation.ngayBaoGia).toLocaleDateString('vi-VN')}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Khách hàng</label>
                  <p className="text-lg">{selectedQuotation.tenKhachHang}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sản phẩm</label>
                  <p className="text-lg">{selectedQuotation.tenSanPham}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Khối lượng</label>
                  <p className="text-lg">{selectedQuotation.khoiLuong} {selectedQuotation.donViTinh}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Giá báo khách</label>
                  <p className="text-lg font-semibold text-green-600">
                    {selectedQuotation.giaBaoKhach
                      ? `${selectedQuotation.giaBaoKhach.toLocaleString('vi-VN')} VNĐ/KG`
                      : '-'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Thời gian giao hàng</label>
                  <p className="text-lg">{selectedQuotation.thoiGianGiaoHang ? `${selectedQuotation.thoiGianGiaoHang} ngày` : '-'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Hiệu lực báo giá</label>
                  <p className="text-lg">{selectedQuotation.hieuLucBaoGia ? `${selectedQuotation.hieuLucBaoGia} ngày` : '-'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nhân viên báo giá</label>
                  <p className="text-lg">{selectedQuotation.tenNhanVien || '-'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Trạng thái</label>
                  <span className={`inline-flex px-3 py-1 rounded-full text-sm font-semibold ${
                    selectedQuotation.tinhTrang === 'DANG_CHO_PHAN_HOI' ? 'bg-yellow-100 text-yellow-800' :
                    selectedQuotation.tinhTrang === 'DANG_CHO_GUI_DON_HANG' ? 'bg-blue-100 text-blue-800' :
                    selectedQuotation.tinhTrang === 'DA_DAT_HANG' ? 'bg-green-100 text-green-800' :
                    selectedQuotation.tinhTrang === 'KHONG_DAT_HANG' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {selectedQuotation.tinhTrang === 'DANG_CHO_PHAN_HOI' ? 'Đang chờ phản hồi' :
                     selectedQuotation.tinhTrang === 'DANG_CHO_GUI_DON_HANG' ? 'Đang chờ gửi đơn hàng' :
                     selectedQuotation.tinhTrang === 'DA_DAT_HANG' ? 'Đã đặt hàng' :
                     selectedQuotation.tinhTrang === 'KHONG_DAT_HANG' ? 'Không đặt hàng' :
                     selectedQuotation.tinhTrang}
                  </span>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú</label>
                  <p className="text-lg">{selectedQuotation.ghiChu || '-'}</p>
                </div>
              </div>

              {/* Thông tin định mức */}
              {selectedQuotation.maDinhMuc && (
                <div className="border-t pt-4">
                  <h3 className="text-lg font-semibold mb-3">Thông tin định mức</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Mã định mức</label>
                      <p className="text-lg">{selectedQuotation.maDinhMuc}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Tên định mức</label>
                      <p className="text-lg">{selectedQuotation.tenDinhMuc}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Tỉ lệ thu hồi</label>
                      <p className="text-lg">{selectedQuotation.tiLeThuHoi ? `${selectedQuotation.tiLeThuHoi}%` : '-'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Sản phẩm đầu ra</label>
                      <p className="text-lg">{selectedQuotation.sanPhamDauRa || '-'}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Thông tin sản xuất */}
              <div className="border-t pt-4">
                <h3 className="text-lg font-semibold mb-3">Thông tin sản xuất</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Thành phẩm tồn kho</label>
                    <p className="text-lg">{selectedQuotation.thanhPhamTonKho ? `${selectedQuotation.thanhPhamTonKho} KG` : '-'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tổng thành phẩm cần SX thêm</label>
                    <p className="text-lg">{selectedQuotation.tongThanhPhamCanSxThem ? `${selectedQuotation.tongThanhPhamCanSxThem} KG` : '-'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tổng nguyên liệu cần sản xuất</label>
                    <p className="text-lg">{selectedQuotation.tongNguyenLieuCanSanXuat ? `${selectedQuotation.tongNguyenLieuCanSanXuat} KG` : '-'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nguyên liệu tồn kho</label>
                    <p className="text-lg">{selectedQuotation.nguyenLieuTonKho ? `${selectedQuotation.nguyenLieuTonKho} KG` : '-'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nguyên liệu cần nhập thêm</label>
                    <p className="text-lg">{selectedQuotation.nguyenLieuCanNhapThem ? `${selectedQuotation.nguyenLieuCanNhapThem} KG` : '-'}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 bg-gray-50 px-6 py-4 flex justify-end rounded-b-xl border-t">
              <button
                onClick={() => setShowViewModal(false)}
                className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Chỉnh Sửa */}
      {showEditModal && selectedQuotation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-yellow-600 to-yellow-700 text-white px-6 py-4 flex justify-between items-center rounded-t-xl">
              <h2 className="text-2xl font-bold">Chỉnh Sửa Báo Giá</h2>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-white hover:text-gray-200 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Thông tin không thể chỉnh sửa */}
              <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                <h3 className="font-semibold text-gray-700 mb-3">Thông tin báo giá</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Mã báo giá</label>
                    <p className="text-lg font-semibold text-blue-600">
                      {selectedQuotation.maBaoGia}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Ngày báo giá</label>
                    <p className="text-lg">{new Date(selectedQuotation.ngayBaoGia).toLocaleDateString('vi-VN')}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Khách hàng</label>
                    <p className="text-lg">{selectedQuotation.tenKhachHang}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Sản phẩm</label>
                    <p className="text-lg">{selectedQuotation.tenSanPham}</p>
                  </div>
                </div>
              </div>

              {/* Form chỉnh sửa */}
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-700">Thông tin có thể chỉnh sửa</h3>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Giá báo khách (VNĐ/KG) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editFormData.giaBaoKhach}
                    onChange={(e) => setEditFormData({ ...editFormData, giaBaoKhach: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                    placeholder="Nhập giá báo khách"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Thời gian giao hàng (ngày) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={editFormData.thoiGianGiaoHang}
                    onChange={(e) => setEditFormData({ ...editFormData, thoiGianGiaoHang: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                    placeholder="Nhập thời gian giao hàng"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Hiệu lực báo giá (ngày) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={editFormData.hieuLucBaoGia}
                    onChange={(e) => setEditFormData({ ...editFormData, hieuLucBaoGia: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                    placeholder="Nhập hiệu lực báo giá"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Trạng thái <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={editFormData.tinhTrang}
                    onChange={(e) => setEditFormData({ ...editFormData, tinhTrang: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  >
                    <option value="">-- Chọn trạng thái --</option>
                    <option value="DANG_CHO_PHAN_HOI">Đang chờ phản hồi</option>
                    <option value="DANG_CHO_GUI_DON_HANG">Đang chờ gửi đơn hàng</option>
                    <option value="DA_DAT_HANG">Đã đặt hàng</option>
                    <option value="KHONG_DAT_HANG">Không đặt hàng</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ghi chú
                  </label>
                  <textarea
                    value={editFormData.ghiChu}
                    onChange={(e) => setEditFormData({ ...editFormData, ghiChu: e.target.value })}
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                    placeholder="Nhập ghi chú (nếu có)"
                  />
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 bg-gray-50 px-6 py-4 flex justify-end gap-3 rounded-b-xl border-t">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={handleUpdateQuotation}
                className="px-6 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
              >
                Lưu thay đổi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuotationManagement;

