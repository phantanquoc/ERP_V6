import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Eye, X, FileText, Download, AlertCircle, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import TableFilter, { FilterField } from './TableFilter';
import Modal from './Modal';
import ConfirmDialog from './common/ConfirmDialog';
import { useQueryClient } from '@tanstack/react-query';
import { quotationRequestService, QuotationRequest } from '../services/quotationRequestService';
import internationalCustomerService, { InternationalCustomer } from '../services/internationalCustomerService';
import internationalProductService, { InternationalProduct } from '../services/internationalProductService';
import { useQuotationRequests, quotationRequestKeys } from '../hooks';
import QuotationCalculatorModal from './QuotationCalculatorModal';
import { parseNumberInput } from '../utils/numberInput';
import UnitSelect from './common/UnitSelect';

interface QuotationRequestManagementProps {
  mode?: 'business' | 'pricing';
  customerType?: 'Quốc tế' | 'Nội địa' | 'all';
}

const QuotationRequestManagement: React.FC<QuotationRequestManagementProps> = ({ mode = 'business', customerType }) => {
  const queryClient = useQueryClient();
  const [customers, setCustomers] = useState<InternationalCustomer[]>([]);
  const [products, setProducts] = useState<InternationalProduct[]>([]);
  const [filterValues, setFilterValues] = useState<Record<string, string>>({
    _search: '',
    maYeuCauBaoGia: '',
    tenNhanVien: '',
    tenKhachHang: '',
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showQuotationModal, setShowQuotationModal] = useState(false);
  const [editingRequest, setEditingRequest] = useState<QuotationRequest | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<QuotationRequest | null>(null);
  const [quotationRequest, setQuotationRequest] = useState<QuotationRequest | null>(null);
  const [exportLoading, setExportLoading] = useState(false);
  const [exportError, setExportError] = useState<string>('');
  const [exportSuccess, setExportSuccess] = useState<string>('');
  const [formData, setFormData] = useState({
    maYeuCauBaoGia: '',
    employeeId: '',
    customerId: '',
    hinhThucVanChuyen: '',
    hinhThucThanhToan: '',
    quocGia: '',
    cangDen: '',
    tiGiaUSD: '',
    ghiChu: '',
    items: [] as Array<{
      productId: string;
      yeuCauSanPham: string;
      quyDongGoi: string;
      soLuong: number;
      donViTinh: string;
      giaDoiThuBan: number;
      giaBanGanNhat: number;
    }>,
  });

  const [limit, setLimit] = useState(20);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState('');
  const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null);

  // React Query for fetching quotation requests — server-side pagination and search
  const filterCustomerType = customerType === 'all' ? undefined : customerType;
  const { data: requestsData, isLoading: loading } = useQuotationRequests({
    page: currentPage,
    limit,
    search: filterValues._search || undefined,
    customerType: filterCustomerType,
    status: statusFilter || undefined,
  });

  // Derive data from query result
  const requests = requestsData?.data ?? [];
  const totalItems = requestsData?.pagination?.total ?? 0;
  const totalPages = requestsData?.pagination?.totalPages ?? 1;

  const handleFilterChange = (newValues: Record<string, string>) => {
    setFilterValues(newValues);
    setCurrentPage(1);
  };

  const quotationRequestFilterFields: FilterField[] = [
    { key: 'maYeuCauBaoGia', label: 'Mã YC', type: 'text' },
    { key: 'tenNhanVien', label: 'Nhân viên', type: 'text' },
    { key: 'tenKhachHang', label: 'Khách hàng', type: 'text' },
  ];

  // Fetch customers and products on mount and when customerType changes
  useEffect(() => {
    fetchCustomers();
    fetchProducts();
  }, [customerType]);

  const fetchCustomers = async () => {
    try {
      const response = await internationalCustomerService.getAllCustomers(1, 1000, '', customerType);
      setCustomers(response.data);
    } catch (error) {
      console.error('Error fetching customers:', error);
      setCustomers([]); // Set empty array on error
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await internationalProductService.getAllProducts(1, 1000);
      setProducts(response.data);
    } catch (error) {
      console.error('Error fetching products:', error);
      setProducts([]); // Set empty array on error
    }
  };

  // Helper functions for managing items
  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [
        ...prev.items,
        {
          productId: '',
          yeuCauSanPham: '',
          quyDongGoi: '',
          soLuong: 0,
          donViTinh: '',
          giaDoiThuBan: 0,
          giaBanGanNhat: 0,
        },
      ],
    }));
  };

  const removeItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const updateItem = (index: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      ),
    }));
  };

  const handleCreate = async () => {
    try {
      // Get current user's employee ID from localStorage
      const userStr = localStorage.getItem('user');
      if (!userStr) {
        toast.error('Không tìm thấy thông tin người dùng. Vui lòng đăng nhập lại.');
        return;
      }
      const user = JSON.parse(userStr);

      // Validate required fields
      if (!formData.customerId) {
        toast.error('Vui lòng chọn khách hàng');
        return;
      }
      if (formData.items.length === 0) {
        toast.error('Vui lòng thêm ít nhất 1 sản phẩm');
        return;
      }

      // Validate each item
      for (let i = 0; i < formData.items.length; i++) {
        const item = formData.items[i];
        if (!item.productId) {
          toast.error(`Sản phẩm ${i + 1}: Vui lòng chọn sản phẩm`);
          return;
        }
        if (!item.soLuong || item.soLuong <= 0) {
          toast.error(`Sản phẩm ${i + 1}: Vui lòng nhập số lượng hợp lệ`);
          return;
        }
        if (!item.donViTinh || item.donViTinh.trim() === '') {
          toast.error(`Sản phẩm ${i + 1}: Vui lòng nhập đơn vị tính`);
          return;
        }
      }

      const requestData = {
        maYeuCauBaoGia: formData.maYeuCauBaoGia,
        employeeId: user.employeeId,
        customerId: formData.customerId,
        hinhThucVanChuyen: formData.hinhThucVanChuyen,
        hinhThucThanhToan: formData.hinhThucThanhToan,
        quocGia: formData.quocGia,
        cangDen: formData.cangDen,
        tiGiaUSD: formData.tiGiaUSD ? Number(formData.tiGiaUSD) : undefined,
        ghiChu: formData.ghiChu,
        items: formData.items.map(item => ({
          ...item,
          soLuong: Number(item.soLuong),
          giaDoiThuBan: item.giaDoiThuBan ? Number(item.giaDoiThuBan) : undefined,
          giaBanGanNhat: item.giaBanGanNhat ? Number(item.giaBanGanNhat) : undefined,
        })),
      };

      await quotationRequestService.createQuotationRequest(requestData);
      toast.success('Tạo yêu cầu báo giá thành công!');
      setShowModal(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: quotationRequestKeys.lists() });
    } catch (error: any) {
      console.error('Error creating quotation request:', error);
      toast.error(error.response?.data?.message || 'Lỗi khi tạo yêu cầu báo giá');
    }
  };

  const handleUpdate = async () => {
    if (!editingRequest) return;

    try {
      // Validate required fields
      if (!formData.customerId) {
        toast.error('Vui lòng chọn khách hàng');
        return;
      }
      if (formData.items.length === 0) {
        toast.error('Vui lòng thêm ít nhất 1 sản phẩm');
        return;
      }

      // Validate each item
      for (let i = 0; i < formData.items.length; i++) {
        const item = formData.items[i];
        if (!item.productId) {
          toast.error(`Sản phẩm ${i + 1}: Vui lòng chọn sản phẩm`);
          return;
        }
        if (!item.soLuong || item.soLuong <= 0) {
          toast.error(`Sản phẩm ${i + 1}: Vui lòng nhập số lượng hợp lệ`);
          return;
        }
        if (!item.donViTinh || item.donViTinh.trim() === '') {
          toast.error(`Sản phẩm ${i + 1}: Vui lòng nhập đơn vị tính`);
          return;
        }
      }

      await quotationRequestService.updateQuotationRequest(editingRequest.id, {
        customerId: formData.customerId,
        hinhThucVanChuyen: formData.hinhThucVanChuyen,
        hinhThucThanhToan: formData.hinhThucThanhToan,
        quocGia: formData.quocGia,
        cangDen: formData.cangDen,
        tiGiaUSD: formData.tiGiaUSD ? Number(formData.tiGiaUSD) : undefined,
        ghiChu: formData.ghiChu,
        items: formData.items.map(item => ({
          ...item,
          soLuong: Number(item.soLuong),
          giaDoiThuBan: item.giaDoiThuBan ? Number(item.giaDoiThuBan) : undefined,
          giaBanGanNhat: item.giaBanGanNhat ? Number(item.giaBanGanNhat) : undefined,
        })),
      });
      toast.success('Cập nhật yêu cầu báo giá thành công!');
      setShowModal(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: quotationRequestKeys.lists() });
    } catch (error: any) {
      console.error('Error updating quotation request:', error);
      toast.error(error.response?.data?.message || 'Lỗi khi cập nhật yêu cầu báo giá');
    }
  };

  const handleDelete = async (id: string) => {
    setConfirmMessage('Bạn có chắc chắn muốn xóa yêu cầu báo giá này?');
    setConfirmAction(() => async () => {
      setConfirmOpen(false);
      try {
        await quotationRequestService.deleteQuotationRequest(id);
        toast.success('Xóa yêu cầu báo giá thành công!');
        queryClient.invalidateQueries({ queryKey: quotationRequestKeys.lists() });
      } catch (error: any) {
        console.error('Error deleting quotation request:', error);
        toast.error(error.response?.data?.message || 'Lỗi khi xóa yêu cầu báo giá');
      }
    });
    setConfirmOpen(true);
  };

  const handleCreateQuotation = (request: QuotationRequest) => {
    setQuotationRequest(request);
    setShowQuotationModal(true);
    // Spec W3: when opening create-quotation popup for a CHO_XU_LY request,
    // advance it to DANG_BAO_GIA. Fire-and-forget — do not block UI.
    if (request.status === 'CHO_XU_LY') {
      quotationRequestService.markInProgress(request.id)
        .then(() => {
          queryClient.invalidateQueries({ queryKey: quotationRequestKeys.lists() });
        })
        .catch(() => {
          // Best-effort; badge will refresh on next list query
        });
    }
  };

  const handleQuotationSuccess = () => {
    setShowQuotationModal(false);
    setQuotationRequest(null);
    queryClient.invalidateQueries({ queryKey: quotationRequestKeys.lists() });
  };

  const openCreateModal = async () => {
    try {
      const response = await quotationRequestService.generateQuotationRequestCode();
      setFormData({
        maYeuCauBaoGia: response.data.code,
        employeeId: '',
        customerId: '',
        hinhThucVanChuyen: '',
        hinhThucThanhToan: '',
        quocGia: '',
        cangDen: '',
        tiGiaUSD: '',
        ghiChu: '',
        items: [{
          productId: '',
          yeuCauSanPham: '',
          quyDongGoi: '',
          soLuong: 0,
          donViTinh: '',
          giaDoiThuBan: 0,
          giaBanGanNhat: 0,
        }],
      });
      setEditingRequest(null);
      setShowModal(true);
    } catch (error) {
      console.error('Error generating quotation request code:', error);
      toast.error('Lỗi khi tạo mã yêu cầu báo giá');
    }
  };

  const openEditModal = (request: any) => {
    setEditingRequest(request);
    setFormData({
      maYeuCauBaoGia: request.maYeuCauBaoGia,
      employeeId: request.employeeId,
      customerId: request.customerId,
      hinhThucVanChuyen: request.hinhThucVanChuyen || '',
      hinhThucThanhToan: request.hinhThucThanhToan || '',
      quocGia: request.quocGia || '',
      cangDen: request.cangDen || '',
      tiGiaUSD: request.tiGiaUSD ? String(request.tiGiaUSD) : '',
      ghiChu: request.ghiChu || '',
      items: request.items && request.items.length > 0 ? request.items.map((item: any) => ({
        productId: item.productId,
        yeuCauSanPham: item.yeuCauSanPham || '',
        quyDongGoi: item.quyDongGoi || '',
        soLuong: item.soLuong,
        donViTinh: item.donViTinh,
        giaDoiThuBan: item.giaDoiThuBan || 0,
        giaBanGanNhat: item.giaBanGanNhat || 0,
      })) : [{
        productId: '',
        yeuCauSanPham: '',
        quyDongGoi: '',
        soLuong: 0,
        donViTinh: '',
        giaDoiThuBan: 0,
        giaBanGanNhat: 0,
      }],
    });
    setShowModal(true);
  };

  const openDetailModal = (request: QuotationRequest) => {
    setSelectedRequest(request);
    setShowDetailModal(true);
  };

  const resetForm = () => {
    setFormData({
      maYeuCauBaoGia: '',
      employeeId: '',
      customerId: '',
      hinhThucVanChuyen: '',
      hinhThucThanhToan: '',
      quocGia: '',
      cangDen: '',
      tiGiaUSD: '',
      ghiChu: '',
      items: [],
    });
    setEditingRequest(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleExportExcel = async () => {
    try {
      setExportError('');
      setExportLoading(true);
      await quotationRequestService.exportToExcel({ search: filterValues._search || undefined });
      setExportSuccess('Đã xuất file Excel thành công');
      setTimeout(() => setExportSuccess(''), 3000);
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      setExportError('Không thể xuất file Excel');
    } finally {
      setExportLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN');
  };

  const formatCurrency = (amount?: number) => {
    if (!amount) return '-';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  // Status badge helper (task 8.4)
  const renderStatusBadge = (status?: string) => {
    const badgeMap: Record<string, { label: string; className: string }> = {
      CHO_XU_LY: { label: 'Chờ xử lý', className: 'bg-gray-100 text-gray-800 border border-gray-200' },
      DANG_BAO_GIA: { label: 'Đang báo giá', className: 'bg-blue-100 text-blue-800 border border-blue-200' },
      DA_BAO_GIA: { label: 'Đã báo giá', className: 'bg-green-100 text-green-800 border border-green-200' },
      HUY: { label: 'Đã hủy', className: 'bg-red-100 text-red-800 border border-red-200' },
    };
    const badge = status ? badgeMap[status] : undefined;
    if (!badge) return <span className="text-gray-400 text-xs">-</span>;
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${badge.className}`}>
        {badge.label}
      </span>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <h2 className="text-xl sm:text-2xl font-bold">Danh sách yêu cầu báo giá</h2>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto">
          <button
            onClick={handleExportExcel}
            disabled={exportLoading}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            <Download size={18} />
            {exportLoading ? 'Đang xuất...' : 'Xuất Excel'}
          </button>
          {mode === 'business' && (
            <button
              onClick={openCreateModal}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Thêm yêu cầu báo giá
            </button>
          )}
        </div>
      </div>

      {/* Search */}
      <TableFilter
        filters={quotationRequestFilterFields}
        values={filterValues}
        onChange={handleFilterChange}
        searchPlaceholder="Tìm kiếm mã YC, nhân viên, khách hàng..."
      />

      {/* Status filter dropdown (task 8.3) */}
      <div className="mb-4 flex items-center gap-3">
        <label className="text-sm font-medium text-gray-700">Trạng thái:</label>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
          className="border border-gray-300 rounded-md px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Tất cả</option>
          <option value="CHO_XU_LY">Chờ xử lý</option>
          <option value="DANG_BAO_GIA">Đang báo giá</option>
          <option value="DA_BAO_GIA">Đã báo giá</option>
          <option value="HUY">Đã hủy</option>
        </select>
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
          <table className="w-full min-w-[920px] border-collapse">
            <thead>
              <tr className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-300">
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">STT</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Ngày yêu cầu</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Mã YC</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Nhân viên</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Khách hàng</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Sản phẩm</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Số lượng</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Trạng thái</th>
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
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-8 text-center text-gray-500">
                    Không có dữ liệu
                  </td>
                </tr>
              ) : (
                requests.map((request, index) => (
                  <tr
                    key={request.id}
                    className={`border-b border-gray-200 hover:bg-blue-50 transition-colors ${
                      index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                    }`}
                  >
                    <td className="px-6 py-4 text-sm text-gray-900 border-r border-gray-200">
                      {(currentPage - 1) * limit + index + 1}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700 border-r border-gray-200">
                      {formatDate(request.ngayYeuCau)}
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-blue-600 border-r border-gray-200">
                      {request.maYeuCauBaoGia}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 border-r border-gray-200">
                      <div className="font-medium">{request.tenNhanVien}</div>
                      <div className="text-xs text-gray-500">{request.maNhanVien}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 border-r border-gray-200">
                      <div className="font-medium">{request.tenKhachHang}</div>
                      <div className="text-xs text-gray-500">{request.maKhachHang}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 border-r border-gray-200">
                      {request.items && request.items.length > 0 ? (
                        <div>
                          <div className="font-medium">{request.items.length} sản phẩm</div>
                          <div className="text-xs text-gray-500">
                            {request.items[0].tenSanPham}
                            {request.items.length > 1 && ` +${request.items.length - 1}`}
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400">Chưa có sản phẩm</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 border-r border-gray-200">
                      {request.items && request.items.length > 0 ? (
                        <div>
                          {request.items.reduce((sum, item) => sum + item.soLuong, 0)} {request.items[0].donViTinh}
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm border-r border-gray-200">
                      {renderStatusBadge((request as any).status)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-3">
                        <button
                          onClick={() => openDetailModal(request)}
                          className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-md transition-colors"
                          title="Xem chi tiết"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                        {mode === 'business' ? (
                          <>
                            <button
                              onClick={() => openEditModal(request)}
                              className="p-1.5 text-green-600 hover:bg-green-100 rounded-md transition-colors"
                              title="Chỉnh sửa"
                            >
                              <Edit className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => handleDelete(request.id)}
                              className="p-1.5 text-red-600 hover:bg-red-100 rounded-md transition-colors"
                              title="Xóa"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => handleCreateQuotation(request)}
                            className="p-1.5 text-green-600 hover:bg-green-100 rounded-md transition-colors"
                            title="Tạo báo giá"
                          >
                            <FileText className="w-5 h-5" />
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

      {/* Create/Edit Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} showBackdrop>
        <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full flex flex-col max-h-[calc(100vh-2rem)]" onClick={(e) => e.stopPropagation()}>
          <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200 shrink-0">
            <h2 className="text-xl font-bold">
              {editingRequest ? 'Chỉnh sửa yêu cầu báo giá' : 'Thêm yêu cầu báo giá mới'}
            </h2>
            <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-gray-700">
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="overflow-y-auto flex-1 p-6">
            <div className="space-y-4">
                {/* Mã yêu cầu báo giá */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mã yêu cầu báo giá <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="maYeuCauBaoGia"
                    value={formData.maYeuCauBaoGia}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
                  />
                </div>

                {/* Khách hàng */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Khách hàng <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="customerId"
                    value={formData.customerId}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- Chọn khách hàng --</option>
                    {customers.map(customer => (
                      <option key={customer.id} value={customer.id}>
                        {customer.maKhachHang} - {customer.tenCongTy}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Danh sách sản phẩm */}
                <div className="border-t border-b border-gray-200 py-4">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
                    <label className="block text-sm font-medium text-gray-700">
                      Danh sách sản phẩm <span className="text-red-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={addItem}
                      className="flex items-center justify-center gap-2 px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                    >
                      <Plus className="w-4 h-4" />
                      Thêm sản phẩm
                    </button>
                  </div>

                  {formData.items.map((item, index) => (
                    <div key={index} className="border border-gray-300 rounded-lg p-4 mb-4 bg-gray-50">
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="font-medium text-gray-700">Sản phẩm {index + 1}</h4>
                        {formData.items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeItem(index)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      <div className="space-y-3">
                        {/* Chọn sản phẩm */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Sản phẩm <span className="text-red-500">*</span>
                          </label>
                          <select
                            value={item.productId}
                            onChange={(e) => updateItem(index, 'productId', e.target.value)}
                            required
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">-- Chọn sản phẩm --</option>
                            {products.map(product => (
                              <option key={product.id} value={product.id}>
                                {product.maSanPham} - {product.tenSanPham}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Yêu cầu sản phẩm & Quy cách đóng gói */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Yêu cầu sản phẩm
                            </label>
                            <input
                              type="text"
                              value={item.yeuCauSanPham}
                              onChange={(e) => updateItem(index, 'yeuCauSanPham', e.target.value)}
                              placeholder="VD: kg, tấn, thùng..."
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Quy cách đóng gói
                            </label>
                            <input
                              type="text"
                              value={item.quyDongGoi}
                              onChange={(e) => updateItem(index, 'quyDongGoi', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        </div>

                        {/* Số lượng & Đơn vị tính */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Số lượng <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="number"
                              value={item.soLuong}
                              onChange={(e) => updateItem(index, 'soLuong', parseNumberInput(e.target.value))}
                              required
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Đơn vị tính <span className="text-red-500">*</span>
                            </label>
                            <UnitSelect
                              value={item.donViTinh}
                              onChange={(val) => updateItem(index, 'donViTinh', val)}
                              required
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        </div>

                        {/* Giá đối thủ bán & Giá bán gần nhất */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Giá đối thủ bán (VND)
                            </label>
                            <input
                              type="number"
                              value={item.giaDoiThuBan}
                              onChange={(e) => updateItem(index, 'giaDoiThuBan', parseNumberInput(e.target.value))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Giá bán gần nhất (VND)
                            </label>
                            <input
                              type="number"
                              value={item.giaBanGanNhat}
                              onChange={(e) => updateItem(index, 'giaBanGanNhat', parseNumberInput(e.target.value))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Hình thức vận chuyển & Hình thức thanh toán */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Hình thức vận chuyển
                    </label>
                    {customerType === 'Nội địa' ? (
                      <select
                        name="hinhThucVanChuyen"
                        value={formData.hinhThucVanChuyen}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">-- Chọn hình thức --</option>
                        <option value="Giao hàng tận nơi">Giao hàng tận nơi</option>
                        <option value="Khách tự đến lấy">Khách tự đến lấy</option>
                        <option value="Vận chuyển đường bộ">Vận chuyển đường bộ</option>
                        <option value="Vận chuyển đường thủy">Vận chuyển đường thủy</option>
                      </select>
                    ) : (
                      <select
                        name="hinhThucVanChuyen"
                        value={formData.hinhThucVanChuyen}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">-- Chọn hình thức --</option>
                        <option value="Đường biển">Đường biển</option>
                        <option value="Đường hàng không">Đường hàng không</option>
                        <option value="Đường bộ">Đường bộ</option>
                        <option value="Đường sắt">Đường sắt</option>
                        <option value="Đa phương thức">Đa phương thức</option>
                      </select>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Hình thức thanh toán
                    </label>
                    {customerType === 'Nội địa' ? (
                      <select
                        name="hinhThucThanhToan"
                        value={formData.hinhThucThanhToan}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">-- Chọn hình thức --</option>
                        <option value="Tiền mặt">Tiền mặt</option>
                        <option value="Chuyển khoản">Chuyển khoản</option>
                        <option value="Công nợ 15 ngày">Công nợ 15 ngày</option>
                        <option value="Công nợ 30 ngày">Công nợ 30 ngày</option>
                        <option value="Công nợ 45 ngày">Công nợ 45 ngày</option>
                      </select>
                    ) : (
                      <select
                        name="hinhThucThanhToan"
                        value={formData.hinhThucThanhToan}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">-- Chọn hình thức --</option>
                        <option value="T/T">T/T</option>
                        <option value="L/C">L/C</option>
                        <option value="D/P">D/P</option>
                        <option value="D/A">D/A</option>
                        <option value="CAD">CAD</option>
                        <option value="Open Account">Open Account</option>
                      </select>
                    )}
                  </div>
                </div>

                {/* Quốc gia & Cảng đến (Quốc tế) hoặc Địa chỉ giao hàng (Nội địa) */}
                {customerType === 'Nội địa' ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Địa chỉ giao hàng
                    </label>
                    <input
                      type="text"
                      name="cangDen"
                      value={formData.cangDen}
                      onChange={handleInputChange}
                      placeholder="Nhập địa chỉ giao hàng..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Quốc gia
                      </label>
                      <input
                        type="text"
                        name="quocGia"
                        value={formData.quocGia}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Cảng đến
                      </label>
                      <input
                        type="text"
                        name="cangDen"
                        value={formData.cangDen}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Tỉ giá USD
                      </label>
                      <input
                        type="number"
                        name="tiGiaUSD"
                        value={formData.tiGiaUSD}
                        onChange={handleInputChange}
                        placeholder="VD: 25000"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                )}

                {/* Ghi chú */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ghi chú
                  </label>
                  <textarea
                    name="ghiChu"
                    value={formData.ghiChu}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex flex-col sm:flex-row sm:justify-end gap-2 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    onClick={editingRequest ? handleUpdate : handleCreate}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    {editingRequest ? 'Cập nhật' : 'Tạo mới'}
                  </button>
                </div>
              </div>
          </div>
        </div>
      </Modal>

      {/* Detail Modal */}
      <Modal isOpen={showDetailModal && !!selectedRequest} onClose={() => setShowDetailModal(false)} showBackdrop closeOnBackdrop={true}>
        <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full flex flex-col max-h-[calc(100vh-2rem)]" onClick={(e) => e.stopPropagation()}>
          <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200 shrink-0">
            <h2 className="text-xl font-bold">Chi tiết yêu cầu báo giá</h2>
            <button onClick={() => setShowDetailModal(false)} className="text-gray-500 hover:text-gray-700">
              <X className="w-6 h-6" />
            </button>
          </div>

          {selectedRequest && (
            <div className="overflow-y-auto flex-1 p-6">
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Mã yêu cầu báo giá</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedRequest.maYeuCauBaoGia}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Ngày yêu cầu</label>
                    <p className="mt-1 text-sm text-gray-900">{formatDate(selectedRequest.ngayYeuCau)}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Mã nhân viên</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedRequest.maNhanVien}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Tên nhân viên</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedRequest.tenNhanVien}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Mã khách hàng</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedRequest.maKhachHang}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Tên khách hàng</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedRequest.tenKhachHang}</p>
                  </div>
                </div>

                {/* Danh sách sản phẩm */}
                <div className="border-t border-b border-gray-200 py-4">
                  <label className="block text-sm font-medium text-gray-700 mb-3">Danh sách sản phẩm</label>
                  {selectedRequest.items && selectedRequest.items.length > 0 ? (
                    <div className="space-y-3">
                      {selectedRequest.items.map((item, index) => (
                        <div key={index} className="border border-gray-300 rounded-lg p-4 bg-gray-50">
                          <h4 className="font-medium text-gray-700 mb-2">Sản phẩm {index + 1}</h4>
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                              <span className="text-gray-500">Mã sản phẩm:</span>
                              <p className="text-gray-900">{item.maSanPham}</p>
                            </div>
                            <div>
                              <span className="text-gray-500">Tên sản phẩm:</span>
                              <p className="text-gray-900">{item.tenSanPham}</p>
                            </div>
                            <div>
                              <span className="text-gray-500">Số lượng:</span>
                              <p className="text-gray-900">{item.soLuong} {item.donViTinh}</p>
                            </div>
                            <div>
                              <span className="text-gray-500">Yêu cầu sản phẩm:</span>
                              <p className="text-gray-900">{item.yeuCauSanPham || '-'}</p>
                            </div>
                            <div>
                              <span className="text-gray-500">Quy cách đóng gói:</span>
                              <p className="text-gray-900">{item.quyDongGoi || '-'}</p>
                            </div>
                            <div>
                              <span className="text-gray-500">Giá đối thủ bán:</span>
                              <p className="text-gray-900">{formatCurrency(item.giaDoiThuBan)}</p>
                            </div>
                            <div>
                              <span className="text-gray-500">Giá bán gần nhất:</span>
                              <p className="text-gray-900">{formatCurrency(item.giaBanGanNhat)}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">Chưa có sản phẩm</p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Hình thức vận chuyển</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedRequest.hinhThucVanChuyen || '-'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Hình thức thanh toán</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedRequest.hinhThucThanhToan || '-'}</p>
                  </div>
                </div>

                {customerType === 'Nội địa' ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Địa chỉ giao hàng</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedRequest.cangDen || '-'}</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Quốc gia</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedRequest.quocGia || '-'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Cảng đến</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedRequest.cangDen || '-'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Tỉ giá USD</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedRequest.tiGiaUSD ? selectedRequest.tiGiaUSD.toLocaleString('vi-VN') : '-'}</p>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-500">Ghi chú</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedRequest.ghiChu || '-'}</p>
                </div>

                <div className="flex flex-col sm:flex-row sm:justify-end gap-2 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowDetailModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Đóng
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Quotation Calculator Modal */}
      <QuotationCalculatorModal
        isOpen={showQuotationModal}
        onClose={() => setShowQuotationModal(false)}
        quotationRequest={quotationRequest}
        onSuccess={handleQuotationSuccess}
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

export default QuotationRequestManagement;

