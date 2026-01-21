import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, Eye, X, FileText } from 'lucide-react';
import { quotationRequestService, QuotationRequest } from '../services/quotationRequestService';
import internationalCustomerService, { InternationalCustomer } from '../services/internationalCustomerService';
import internationalProductService, { InternationalProduct } from '../services/internationalProductService';
import QuotationCalculatorModal from './QuotationCalculatorModal';

interface QuotationRequestManagementProps {
  mode?: 'business' | 'pricing';
  customerType?: 'Quốc tế' | 'Nội địa' | 'all';
}

const QuotationRequestManagement: React.FC<QuotationRequestManagementProps> = ({ mode = 'business', customerType }) => {
  const [requests, setRequests] = useState<QuotationRequest[]>([]);
  const [customers, setCustomers] = useState<InternationalCustomer[]>([]);
  const [products, setProducts] = useState<InternationalProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showQuotationModal, setShowQuotationModal] = useState(false);
  const [editingRequest, setEditingRequest] = useState<QuotationRequest | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<QuotationRequest | null>(null);
  const [quotationRequest, setQuotationRequest] = useState<QuotationRequest | null>(null);
  const [formData, setFormData] = useState({
    maYeuCauBaoGia: '',
    employeeId: '',
    customerId: '',
    hinhThucVanChuyen: '',
    hinhThucThanhToan: '',
    quocGia: '',
    cangDen: '',
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

  const itemsPerPage = 10;

  useEffect(() => {
    fetchRequests();
    fetchCustomers();
    fetchProducts();
  }, [currentPage, searchTerm, customerType]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      // Nếu customerType là undefined hoặc 'all' thì không filter
      const filterCustomerType = customerType === 'all' ? undefined : customerType;
      const response = await quotationRequestService.getAllQuotationRequests(
        currentPage,
        itemsPerPage,
        searchTerm || undefined,
        filterCustomerType
      );
      setRequests(response.data);
      setTotalPages(response.pagination.totalPages);
    } catch (error) {
      console.error('Error fetching quotation requests:', error);
      alert('Lỗi khi tải danh sách yêu cầu báo giá');
    } finally {
      setLoading(false);
    }
  };

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
        alert('Không tìm thấy thông tin người dùng. Vui lòng đăng nhập lại.');
        return;
      }
      const user = JSON.parse(userStr);

      // Validate required fields
      if (!formData.customerId) {
        alert('Vui lòng chọn khách hàng');
        return;
      }
      if (formData.items.length === 0) {
        alert('Vui lòng thêm ít nhất 1 sản phẩm');
        return;
      }

      // Validate each item
      for (let i = 0; i < formData.items.length; i++) {
        const item = formData.items[i];
        if (!item.productId) {
          alert(`Sản phẩm ${i + 1}: Vui lòng chọn sản phẩm`);
          return;
        }
        if (!item.soLuong || item.soLuong <= 0) {
          alert(`Sản phẩm ${i + 1}: Vui lòng nhập số lượng hợp lệ`);
          return;
        }
        if (!item.donViTinh || item.donViTinh.trim() === '') {
          alert(`Sản phẩm ${i + 1}: Vui lòng nhập đơn vị tính`);
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
        ghiChu: formData.ghiChu,
        items: formData.items.map(item => ({
          ...item,
          soLuong: Number(item.soLuong),
          giaDoiThuBan: item.giaDoiThuBan ? Number(item.giaDoiThuBan) : undefined,
          giaBanGanNhat: item.giaBanGanNhat ? Number(item.giaBanGanNhat) : undefined,
        })),
      };

      await quotationRequestService.createQuotationRequest(requestData);
      alert('Tạo yêu cầu báo giá thành công!');
      setShowModal(false);
      resetForm();
      fetchRequests();
    } catch (error: any) {
      console.error('Error creating quotation request:', error);
      alert(error.response?.data?.message || 'Lỗi khi tạo yêu cầu báo giá');
    }
  };

  const handleUpdate = async () => {
    if (!editingRequest) return;

    try {
      // Validate required fields
      if (!formData.customerId) {
        alert('Vui lòng chọn khách hàng');
        return;
      }
      if (formData.items.length === 0) {
        alert('Vui lòng thêm ít nhất 1 sản phẩm');
        return;
      }

      // Validate each item
      for (let i = 0; i < formData.items.length; i++) {
        const item = formData.items[i];
        if (!item.productId) {
          alert(`Sản phẩm ${i + 1}: Vui lòng chọn sản phẩm`);
          return;
        }
        if (!item.soLuong || item.soLuong <= 0) {
          alert(`Sản phẩm ${i + 1}: Vui lòng nhập số lượng hợp lệ`);
          return;
        }
        if (!item.donViTinh || item.donViTinh.trim() === '') {
          alert(`Sản phẩm ${i + 1}: Vui lòng nhập đơn vị tính`);
          return;
        }
      }

      await quotationRequestService.updateQuotationRequest(editingRequest.id, {
        customerId: formData.customerId,
        hinhThucVanChuyen: formData.hinhThucVanChuyen,
        hinhThucThanhToan: formData.hinhThucThanhToan,
        quocGia: formData.quocGia,
        cangDen: formData.cangDen,
        ghiChu: formData.ghiChu,
        items: formData.items.map(item => ({
          ...item,
          soLuong: Number(item.soLuong),
          giaDoiThuBan: item.giaDoiThuBan ? Number(item.giaDoiThuBan) : undefined,
          giaBanGanNhat: item.giaBanGanNhat ? Number(item.giaBanGanNhat) : undefined,
        })),
      });
      alert('Cập nhật yêu cầu báo giá thành công!');
      setShowModal(false);
      resetForm();
      fetchRequests();
    } catch (error: any) {
      console.error('Error updating quotation request:', error);
      alert(error.response?.data?.message || 'Lỗi khi cập nhật yêu cầu báo giá');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa yêu cầu báo giá này?')) return;

    try {
      await quotationRequestService.deleteQuotationRequest(id);
      alert('Xóa yêu cầu báo giá thành công!');
      fetchRequests();
    } catch (error: any) {
      console.error('Error deleting quotation request:', error);
      alert(error.response?.data?.message || 'Lỗi khi xóa yêu cầu báo giá');
    }
  };

  const handleCreateQuotation = (request: QuotationRequest) => {
    setQuotationRequest(request);
    setShowQuotationModal(true);
  };

  const handleQuotationSuccess = () => {
    setShowQuotationModal(false);
    setQuotationRequest(null);
    fetchRequests();
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
      alert('Lỗi khi tạo mã yêu cầu báo giá');
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

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN');
  };

  const formatCurrency = (amount?: number) => {
    if (!amount) return '-';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Danh sách yêu cầu báo giá</h2>
        {mode === 'business' && (
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            Thêm yêu cầu báo giá
          </button>
        )}
      </div>

      {/* Search */}
      <div className="flex items-center gap-2">
        <div className="relative w-80">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Tìm kiếm..."
            value={searchTerm}
            onChange={handleSearch}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-300">
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">STT</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Ngày yêu cầu</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Mã YC</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Nhân viên</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Khách hàng</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Sản phẩm</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Số lượng</th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                    Đang tải...
                  </td>
                </tr>
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
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
                      {(currentPage - 1) * itemsPerPage + index + 1}
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
                      {(request as any).items && (request as any).items.length > 0 ? (
                        <div>
                          <div className="font-medium">{(request as any).items.length} sản phẩm</div>
                          <div className="text-xs text-gray-500">
                            {(request as any).items[0].tenSanPham}
                            {(request as any).items.length > 1 && ` +${(request as any).items.length - 1}`}
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400">Chưa có sản phẩm</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 border-r border-gray-200">
                      {(request as any).items && (request as any).items.length > 0 ? (
                        <div>
                          {(request as any).items.reduce((sum: number, item: any) => sum + item.soLuong, 0)} {(request as any).items[0].donViTinh}
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
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
      </div>

      {/* Pagination */}
      <div className="flex justify-between items-center">
        <div className="text-sm text-gray-700">
          Trang {currentPage} / {totalPages}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Trước
          </button>
          <button
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Sau
          </button>
        </div>
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">
                  {editingRequest ? 'Chỉnh sửa yêu cầu báo giá' : 'Thêm yêu cầu báo giá mới'}
                </h2>
                <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-gray-700">
                  <X className="w-6 h-6" />
                </button>
              </div>

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
                  <div className="flex justify-between items-center mb-4">
                    <label className="block text-sm font-medium text-gray-700">
                      Danh sách sản phẩm <span className="text-red-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={addItem}
                      className="flex items-center gap-2 px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
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
                        <div className="grid grid-cols-2 gap-3">
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
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Số lượng <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="number"
                              value={item.soLuong}
                              onChange={(e) => updateItem(index, 'soLuong', Number(e.target.value))}
                              required
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Đơn vị tính <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              value={item.donViTinh}
                              onChange={(e) => updateItem(index, 'donViTinh', e.target.value)}
                              required
                              placeholder="VD: kg, tấn, thùng..."
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        </div>

                        {/* Giá đối thủ bán & Giá bán gần nhất */}
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Giá đối thủ bán (VND)
                            </label>
                            <input
                              type="number"
                              value={item.giaDoiThuBan}
                              onChange={(e) => updateItem(index, 'giaDoiThuBan', Number(e.target.value))}
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
                              onChange={(e) => updateItem(index, 'giaBanGanNhat', Number(e.target.value))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Hình thức vận chuyển & Hình thức thanh toán */}
                <div className="grid grid-cols-2 gap-4">
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
                      <input
                        type="text"
                        name="hinhThucVanChuyen"
                        value={formData.hinhThucVanChuyen}
                        onChange={handleInputChange}
                        placeholder="VD: FOB, CIF, CFR..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
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
                      <input
                        type="text"
                        name="hinhThucThanhToan"
                        value={formData.hinhThucThanhToan}
                        onChange={handleInputChange}
                        placeholder="VD: T/T, L/C..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
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
                  <div className="grid grid-cols-2 gap-4">
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

                <div className="flex justify-end gap-2 mt-6">
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
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Chi tiết yêu cầu báo giá</h2>
                <button onClick={() => setShowDetailModal(false)} className="text-gray-500 hover:text-gray-700">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Mã yêu cầu báo giá</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedRequest.maYeuCauBaoGia}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Ngày yêu cầu</label>
                    <p className="mt-1 text-sm text-gray-900">{formatDate(selectedRequest.ngayYeuCau)}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Mã nhân viên</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedRequest.maNhanVien}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Tên nhân viên</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedRequest.tenNhanVien}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
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
                  {(selectedRequest as any).items && (selectedRequest as any).items.length > 0 ? (
                    <div className="space-y-3">
                      {(selectedRequest as any).items.map((item: any, index: number) => (
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

                <div className="grid grid-cols-2 gap-4">
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
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Quốc gia</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedRequest.quocGia || '-'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Cảng đến</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedRequest.cangDen || '-'}</p>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-500">Ghi chú</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedRequest.ghiChu || '-'}</p>
                </div>

                <div className="flex justify-end gap-2 mt-6">
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
          </div>
        </div>
      )}

      {/* Quotation Calculator Modal */}
      <QuotationCalculatorModal
        isOpen={showQuotationModal}
        onClose={() => setShowQuotationModal(false)}
        quotationRequest={quotationRequest}
        onSuccess={handleQuotationSuccess}
      />
    </div>
  );
};

export default QuotationRequestManagement;

