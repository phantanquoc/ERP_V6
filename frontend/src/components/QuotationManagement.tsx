import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Eye, Edit, Trash2, ShoppingCart, Download, AlertCircle, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from './Modal';
import ConfirmDialog from './common/ConfirmDialog';
import StatusBadge, { BadgeTone } from './shared/StatusBadge';
import TableFilter, { FilterField } from './TableFilter';
import { quotationService, Quotation } from '../services/quotationService';
import { orderService } from '../services/orderService';
import { useQuotations, quotationKeys } from '../hooks';
import { useQueryClient } from '@tanstack/react-query';
import { parseNumberInputStr } from '../utils/numberInput';
import { useAuth } from '../contexts/AuthContext';
import { canEditQuotation, canDeleteQuotation } from '../utils/permissions';
import { UserRole } from '../types/auth';
import { useAuditLogs } from '../hooks/useAuditLogs';
import AuditTimeline from './quotation/AuditTimeline';

// Aging badge thresholds (task 12.3)
const AGING_THRESHOLD = 7;
const NON_TERMINAL_STATUSES = ['DRAFT', 'DANG_CHO_PHAN_HOI', 'DANG_CHO_GUI_DON_HANG'];

const getAgingBand = (daysOpen?: number, status?: string): 'yellow' | 'red' | null => {
  if (!daysOpen || !status || !NON_TERMINAL_STATUSES.includes(status)) return null;
  if (daysOpen >= 14) return 'red';
  if (daysOpen >= AGING_THRESHOLD) return 'yellow';
  return null;
};

interface QuotationManagementProps {
  customerType?: 'Quốc tế' | 'Nội địa' | 'all';
}

const QuotationManagement: React.FC<QuotationManagementProps> = ({ customerType }) => {
  const { user } = useAuth();
  const [filterValues, setFilterValues] = useState<Record<string, string>>({
    _search: '',
    maBaoGia: '',
    tenKhachHang: '',
    tenNhanVien: '',
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState('');
  const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null);
  const [selectedQuotation, setSelectedQuotation] = useState<Quotation | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  // Detail tab navigation (task 11.3)
  const [detailActiveTab, setDetailActiveTab] = useState<'info' | 'audit'>('info');
  // Audit log data (task 11.3)
  const [auditPage, setAuditPage] = useState(1);
  const { data: auditData } = useAuditLogs(
    { entityType: 'Quotation', entityId: selectedQuotation?.id ?? '', page: auditPage, limit: 10 },
    !!selectedQuotation?.id && detailActiveTab === 'audit'
  );
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
  // Price lock (task 10.3–10.4)
  // Derived: disable price inputs when locked and current user is not ADMIN (spec W2).
  // ADMIN can edit locked prices directly; backend records a PRICE_UNLOCK audit entry.
  const priceInputsDisabled = !!(selectedQuotation?.priceLocked && user?.role !== UserRole.ADMIN);

  const itemsPerPage = limit;
  const queryClient = useQueryClient();

  const filterCustomerType = customerType === 'all' ? undefined : customerType;
  const { data: quotationsData, isLoading: loading } = useQuotations({
    page: currentPage,
    limit,
    search: filterValues._search || undefined,
    customerType: filterCustomerType,
  });
  const quotations = quotationsData?.data || [];
  const totalItems = quotationsData?.pagination?.total ?? 0;
  const totalPages = quotationsData?.pagination?.totalPages ?? 1;

  const quotationFilterFields: FilterField[] = [
    { key: 'maBaoGia', label: 'Mã BG', type: 'text' },
    { key: 'tenKhachHang', label: 'Khách hàng', type: 'text' },
    { key: 'tenNhanVien', label: 'Nhân viên', type: 'text' },
  ];

  const handleFilterChange = (newValues: Record<string, string>) => {
    setFilterValues(newValues);
    setCurrentPage(1);
  };

  const handleView = (quotation: Quotation) => {
    setSelectedQuotation(quotation);
    setDetailActiveTab('info');
    setAuditPage(1);
    setShowViewModal(true);
  };

  const [searchParams, setSearchParams] = useSearchParams();
  useEffect(() => {
    const quotationId = searchParams.get('quotationId');
    if (!quotationId) return;
    let cancelled = false;
    quotationService.getQuotationById(quotationId).then((res: any) => {
      if (cancelled) return;
      const quotation = res?.data ?? res;
      if (quotation && quotation.id) {
        handleView(quotation as Quotation);
      }
      const next = new URLSearchParams(searchParams);
      next.delete('quotationId');
      setSearchParams(next, { replace: true });
    }).catch((err) => {
      console.error('Error loading quotation from URL:', err);
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.get('quotationId')]);

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
      toast.success('Cập nhật báo giá thành công!');
      setShowEditModal(false);
      queryClient.invalidateQueries({ queryKey: quotationKeys.lists() });
    } catch (error: any) {
      console.error('Error updating quotation:', error);
      toast.error(error.response?.data?.message || 'Lỗi khi cập nhật báo giá');
    }
  };

  const handleDelete = async (id: string) => {
    setConfirmMessage('Bạn có chắc chắn muốn xóa báo giá này?');
    setConfirmAction(() => async () => {
      setConfirmOpen(false);
      try {
        await quotationService.deleteQuotation(id);
        toast.success('Xóa báo giá thành công!');
        queryClient.invalidateQueries({ queryKey: quotationKeys.lists() });
      } catch (error: any) {
        console.error('Error deleting quotation:', error);
        toast.error(error.response?.data?.message || 'Lỗi khi xóa báo giá');
      }
    });
    setConfirmOpen(true);
  };

  const handleCreateOrder = async (quotationId: string) => {
    setConfirmMessage('Bạn có chắc chắn muốn tạo đơn hàng từ báo giá này?');
    setConfirmAction(() => async () => {
      setConfirmOpen(false);
      try {
        await orderService.createOrderFromQuotation(quotationId);
        toast.success('Tạo đơn hàng thành công!');
        queryClient.invalidateQueries({ queryKey: quotationKeys.lists() });
      } catch (error: any) {
        console.error('Error creating order:', error);
        toast.error(error.response?.data?.message || 'Lỗi khi tạo đơn hàng');
      }
    });
    setConfirmOpen(true);
  };

  const handleExportExcel = async () => {
    try {
      setExportError('');
      setExportLoading(true);
      await quotationService.exportToExcel({ search: filterValues._search || undefined });
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
    const statusMap: Record<string, { label: string; tone: BadgeTone }> = {
      DRAFT: { label: 'Nháp', tone: 'gray' },
      DANG_CHO_PHAN_HOI: { label: 'Đang chờ phản hồi', tone: 'yellow' },
      DANG_CHO_GUI_DON_HANG: { label: 'Đang chờ gửi đơn hàng', tone: 'blue' },
      DA_DAT_HANG: { label: 'Đã đặt hàng', tone: 'green' },
      KHONG_DAT_HANG: { label: 'Không đặt hàng', tone: 'red' },
      SENT: { label: 'Đã gửi', tone: 'blue' },
      APPROVED: { label: 'Đã duyệt', tone: 'green' },
      REJECTED: { label: 'Từ chối', tone: 'red' },
      EXPIRED: { label: 'Hết hạn', tone: 'gray' },
    };
    const info = statusMap[status] ?? { label: status, tone: 'gray' as BadgeTone };
    return <StatusBadge label={info.label} tone={info.tone} />;
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <h2 className="text-xl sm:text-2xl font-bold">Danh sách báo giá</h2>
        <button
          onClick={handleExportExcel}
          disabled={exportLoading}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
        >
          <Download size={18} />
          {exportLoading ? 'Đang xuất...' : 'Xuất Excel'}
        </button>
      </div>

      {/* Search & Filter */}
      <TableFilter
        filters={quotationFilterFields}
        values={filterValues}
        onChange={handleFilterChange}
        searchPlaceholder="Tìm kiếm mã BG, khách hàng, nhân viên..."
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
        <table className="w-full min-w-[1200px] border-collapse">
          <thead>
            <tr className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-300">
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">STT</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Ngày BG</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Mã báo giá</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Giá báo khách</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">TG giao hàng</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Hiệu lực</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Nhân viên</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Trạng thái</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Ghi chú</th>
              <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">Hành động</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={10} className="px-6 py-8 text-center text-gray-500">
                  Đang tải...
                </td>
              </tr>
            ) : quotations.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-6 py-8 text-center text-gray-500">
                  Không có dữ liệu
                </td>
              </tr>
            ) : (
              quotations.map((quotation, index) => (
                <tr
                  key={quotation.id}
                  className={`border-b border-gray-200 hover:bg-blue-50 transition-colors ${
                    index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                  }`}
                >
                  <td className="px-6 py-4 text-sm text-gray-900 border-r border-gray-200">
                    {(currentPage - 1) * itemsPerPage + index + 1}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700 whitespace-nowrap border-r border-gray-200">
                    {formatDate(quotation.ngayBaoGia)}
                  </td>
                  <td className="px-6 py-4 text-sm font-semibold text-blue-600 border-r border-gray-200">
                    {quotation.maBaoGia}
                  </td>
                  <td className="px-6 py-4 text-sm border-r border-gray-200">
                    {(quotation.quotationRequestId as any)?.calculator?.products && (quotation.quotationRequestId as any).calculator.products.length > 0 ? (
                      <div className="space-y-1">
                        {(quotation.quotationRequestId as any).calculator.products.map((product: any, idx: number) => {
                          const giaBaoKhach = (product.giaHoaVon || 0) + (product.loiNhuanCongThem || 0);
                          const tiGiaUSD = product.tiGiaUSD || 0;
                          const giaBaoKhachUSD = tiGiaUSD > 0 ? giaBaoKhach / tiGiaUSD : 0;
                          return (
                            <div key={idx}>
                              <span className="text-gray-600 text-xs">{product.tenSanPham}:</span>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-green-600">{formatCurrency(giaBaoKhach)}</span>
                                {tiGiaUSD > 0 && (
                                  <>
                                    <span className="text-gray-400">-</span>
                                    <span className="font-semibold text-blue-600">
                                      {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(giaBaoKhachUSD)}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <span className="font-semibold text-green-600">{formatCurrency(quotation.giaBaoKhach)}</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700 whitespace-nowrap border-r border-gray-200">
                    {quotation.thoiGianGiaoHang ? `${quotation.thoiGianGiaoHang} ngày` : '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700 whitespace-nowrap border-r border-gray-200">
                    {quotation.hieuLucBaoGia ? `${quotation.hieuLucBaoGia} ngày` : '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700 border-r border-gray-200">
                    {quotation.tenNhanVien || '-'}
                  </td>
                  <td className="px-6 py-4 border-r border-gray-200">
                    <div className="flex flex-col gap-1">
                      {getStatusBadge(quotation.tinhTrang)}
                      {(quotation as any).priceLocked && user?.role !== UserRole.ADMIN && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800 border border-orange-200 w-fit">
                          Đã khóa giá
                        </span>
                      )}
                      {(() => {
                        const band = getAgingBand((quotation as any).daysOpen, quotation.tinhTrang);
                        if (!band) return null;
                        const daysOpen = (quotation as any).daysOpen as number;
                        return (
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium w-fit ${band === 'red' ? 'bg-red-100 text-red-800 border border-red-200' : 'bg-yellow-100 text-yellow-800 border border-yellow-200'}`}>
                            {daysOpen} ngày chờ
                          </span>
                        );
                      })()}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700 max-w-xs truncate border-r border-gray-200">
                    {quotation.ghiChu || '-'}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-3">
                      <button
                        onClick={() => handleView(quotation)}
                        className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-md transition-colors"
                        title="Xem chi tiết"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                      {canEditQuotation(user?.role) && (
                        <button
                          onClick={() => handleEdit(quotation)}
                          className="p-1.5 text-green-600 hover:bg-green-100 rounded-md transition-colors"
                          title="Chỉnh sửa"
                        >
                          <Edit className="w-5 h-5" />
                        </button>
                      )}
                      <button
                        onClick={() => handleCreateOrder(quotation.id)}
                        className="p-1.5 text-purple-600 hover:bg-purple-100 rounded-md transition-colors"
                        title="Tạo đơn hàng"
                      >
                        <ShoppingCart className="w-5 h-5" />
                      </button>
                      {canDeleteQuotation(user?.role) && (
                        <button
                          onClick={() => handleDelete(quotation.id)}
                          className="p-1.5 text-red-600 hover:bg-red-100 rounded-md transition-colors"
                          title="Xóa"
                        >
                          <Trash2 className="w-5 h-5" />
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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-4 px-2">
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
          )}
        </div>
      )}

      {/* Modal Xem Chi Tiết */}
      <Modal isOpen={showViewModal && !!selectedQuotation} onClose={() => setShowViewModal(false)} showBackdrop closeOnBackdrop={true}>
        <div className="bg-white rounded-xl shadow-2xl w-[calc(100vw-1rem)] sm:max-w-4xl sm:w-full flex flex-col max-h-[calc(100vh-1rem)] sm:max-h-[calc(100vh-2rem)]" onClick={(e) => e.stopPropagation()}>
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 sm:px-6 py-4 flex justify-between items-start sm:items-center gap-3 rounded-t-xl shrink-0">
              <h2 className="text-xl sm:text-2xl font-bold">Chi Tiết Báo Giá</h2>
              <button
                onClick={() => setShowViewModal(false)}
                className="text-white hover:text-gray-200 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-4 sm:p-6 space-y-6">
              {selectedQuotation && (<>

              {/* Tab navigation (task 9.3 + 11.3) */}
              <div className="flex border-b border-gray-200">
                <button
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${detailActiveTab === 'info' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                  onClick={() => setDetailActiveTab('info')}
                >
                  Thông tin
                </button>
                {(user?.role === UserRole.ADMIN || user?.role === UserRole.DEPARTMENT_HEAD) && (
                  <button
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${detailActiveTab === 'audit' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    onClick={() => setDetailActiveTab('audit')}
                  >
                    Lịch sử hoạt động
                  </button>
                )}
              </div>

              {/* Audit log tab content (task 11.3) */}
              {detailActiveTab === 'audit' && (
                <div>
                  <AuditTimeline entries={auditData?.data ?? []} />
                  {auditData && auditData.pagination.totalPages > 1 && (
                    <div className="flex justify-center gap-2 mt-4">
                      <button
                        disabled={auditPage <= 1}
                        onClick={() => setAuditPage(p => p - 1)}
                        className="px-2 py-1 text-xs border rounded disabled:opacity-40"
                      >Trước</button>
                      <span className="text-xs self-center">{auditPage}/{auditData.pagination.totalPages}</span>
                      <button
                        disabled={auditPage >= auditData.pagination.totalPages}
                        onClick={() => setAuditPage(p => p + 1)}
                        className="px-2 py-1 text-xs border rounded disabled:opacity-40"
                      >Sau</button>
                    </div>
                  )}
                </div>
              )}

              {/* Main info tab */}
              {detailActiveTab === 'info' && (<>
              {/* Thông tin cơ bản */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú</label>
                  <p className="text-lg">{selectedQuotation.ghiChu || '-'}</p>
                </div>
              </div>

              {/* Thông tin định mức */}
              {selectedQuotation.maDinhMuc && (
                <div className="border-t pt-4">
                  <h3 className="text-lg font-semibold mb-3">Thông tin định mức</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              </>)}
              </>)}
            </div>

            <div className="bg-gray-50 px-4 sm:px-6 py-4 flex justify-end rounded-b-xl border-t shrink-0">
              <button
                onClick={() => setShowViewModal(false)}
                className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </Modal>

      {/* Modal Chỉnh Sửa */}
      <Modal isOpen={showEditModal && !!selectedQuotation} onClose={() => setShowEditModal(false)} showBackdrop>
        <div className="bg-white rounded-xl shadow-2xl w-[calc(100vw-1rem)] sm:max-w-2xl sm:w-full flex flex-col max-h-[calc(100vh-1rem)] sm:max-h-[calc(100vh-2rem)]" onClick={(e) => e.stopPropagation()}>
          <div className="bg-gradient-to-r from-yellow-600 to-yellow-700 text-white px-4 sm:px-6 py-4 flex justify-between items-start sm:items-center gap-3 rounded-t-xl shrink-0">
              <h2 className="text-xl sm:text-2xl font-bold">Chỉnh Sửa Báo Giá</h2>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-white hover:text-gray-200 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-4 sm:p-6 space-y-6">
              {selectedQuotation && (<>
              {/* Thông tin không thể chỉnh sửa */}
              <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                <h3 className="font-semibold text-gray-700 mb-3">Thông tin báo giá</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

                {/* Price lock banner — hidden for ADMIN (ADMIN bypasses lock entirely) */}
                {(selectedQuotation as any).priceLocked && user?.role !== UserRole.ADMIN && (
                  <div className="flex items-center gap-3 rounded-lg px-4 py-3 bg-orange-50 border border-orange-200">
                    <span className="text-sm font-medium text-orange-800">
                      Báo giá đã khóa giá — không thể sửa giá. Liên hệ ADMIN nếu cần thay đổi.
                    </span>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Giá báo khách (VNĐ/KG) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editFormData.giaBaoKhach}
                    onChange={(e) => setEditFormData({ ...editFormData, giaBaoKhach: parseNumberInputStr(e.target.value) })}
                    disabled={priceInputsDisabled}
                    className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent${priceInputsDisabled ? ' bg-gray-100 cursor-not-allowed opacity-60' : ''}`}
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
                    onChange={(e) => setEditFormData({ ...editFormData, thoiGianGiaoHang: parseNumberInputStr(e.target.value) })}
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
                    onChange={(e) => setEditFormData({ ...editFormData, hieuLucBaoGia: parseNumberInputStr(e.target.value) })}
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
              </>)}
            </div>

            <div className="bg-gray-50 px-4 sm:px-6 py-4 flex flex-col-reverse sm:flex-row sm:justify-end gap-3 rounded-b-xl border-t shrink-0">
              <button
                onClick={() => setShowEditModal(false)}
                className="w-full sm:w-auto px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={handleUpdateQuotation}
                className="w-full sm:w-auto px-6 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
              >
                Lưu thay đổi
              </button>
            </div>
          </div>
        </Modal>

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmOpen}
        title="Xác nhận"
        message={confirmMessage}
        onConfirm={() => confirmAction && confirmAction()}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
};

export default QuotationManagement;

