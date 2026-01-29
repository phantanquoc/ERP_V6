import React, { useState } from 'react';
import { Plus, Search, Edit, Trash2, Eye, MapPin, X } from 'lucide-react';
import internationalCustomerService, {
  InternationalCustomer,
  CreateInternationalCustomerRequest,
  UpdateInternationalCustomerRequest
} from '../services/internationalCustomerService';
import { useCustomers, customerKeys } from '../hooks';
import { useQueryClient } from '@tanstack/react-query';

const InternationalCustomerManagement: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<InternationalCustomer | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<InternationalCustomer | null>(null);
  const [page, setPage] = useState(1);
  const [formData, setFormData] = useState<CreateInternationalCustomerRequest>({
    tenCongTy: '',
    nguoiLienHe: '',
    quocGia: '',
    loaiKhachHang: '',
  });

  const queryClient = useQueryClient();
  const { data: customersData, isLoading: loading } = useCustomers({
    page,
    limit: 10,
    search: searchTerm,
    customerType: 'Quốc tế',
  });
  const customers = customersData?.data || [];
  const totalPages = customersData?.totalPages || 1;

  const handleCreate = async () => {
    try {
      await internationalCustomerService.createCustomer(formData);
      alert('Tạo khách hàng thành công!');
      setShowModal(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: customerKeys.lists() });
    } catch (error: any) {
      alert('Lỗi khi tạo khách hàng: ' + error.message);
    }
  };

  const handleUpdate = async () => {
    if (!editingCustomer) return;
    try {
      await internationalCustomerService.updateCustomer(editingCustomer.id, formData);
      alert('Cập nhật khách hàng thành công!');
      setShowModal(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: customerKeys.lists() });
    } catch (error: any) {
      alert('Lỗi khi cập nhật khách hàng: ' + error.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa khách hàng này?')) return;
    try {
      await internationalCustomerService.deleteCustomer(id);
      alert('Xóa khách hàng thành công!');
      queryClient.invalidateQueries({ queryKey: customerKeys.lists() });
    } catch (error: any) {
      alert('Lỗi khi xóa khách hàng: ' + error.message);
    }
  };

  const openCreateModal = () => {
    setEditingCustomer(null);
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (customer: InternationalCustomer) => {
    setEditingCustomer(customer);
    setFormData({
      tenCongTy: customer.tenCongTy,
      nguoiLienHe: customer.nguoiLienHe,
      quocGia: customer.quocGia,
      thanhPho: customer.thanhPho,
      diaChi: customer.diaChi,
      soDienThoai: customer.soDienThoai,
      email: customer.email,
      website: customer.website,
      loaiKhachHang: customer.loaiKhachHang,
      trangThai: customer.trangThai,
      ngayHopTac: customer.ngayHopTac,
      doanhThuNam: customer.doanhThuNam,
      soLuongDonHang: customer.soLuongDonHang,
      sanPhamChinh: customer.sanPhamChinh,
      ghiChu: customer.ghiChu,
    });
    setShowModal(true);
  };

  const openDetailModal = (customer: InternationalCustomer) => {
    setSelectedCustomer(customer);
    setShowDetailModal(true);
  };

  const resetForm = () => {
    setFormData({
      tenCongTy: '',
      nguoiLienHe: '',
      quocGia: '',
      loaiKhachHang: '',
    });
    setEditingCustomer(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'doanhThuNam' || name === 'soLuongDonHang' ? Number(value) : value
    }));
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setPage(1);
  };

  return (
    <div>
      {/* Header Actions */}
      <div className="mb-6 flex justify-between items-center">
        <div className="relative w-80">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Tìm kiếm..."
            value={searchTerm}
            onChange={handleSearch}
            className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <button
          onClick={openCreateModal}
          className="ml-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Thêm khách hàng
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-300">
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Mã KH</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Tên công ty</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Người liên hệ</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Quốc gia</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Loại KH</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Doanh thu năm</th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900 border-r border-gray-200">Trạng thái</th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">Hoạt động</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                    Đang tải...
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                    Không có dữ liệu
                  </td>
                </tr>
              ) : (
                customers.map((customer, index) => (
                  <tr
                    key={customer.id}
                    className={`border-b border-gray-200 hover:bg-blue-50 transition-colors ${
                      index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                    }`}
                  >
                    <td className="px-6 py-4 text-sm font-semibold text-blue-600 border-r border-gray-200">
                      {customer.maKhachHang}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 border-r border-gray-200">
                      {customer.tenCongTy}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700 border-r border-gray-200">
                      {customer.nguoiLienHe}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 border-r border-gray-200">
                      <div className="flex items-center">
                        <MapPin className="w-4 h-4 text-gray-400 mr-1" />
                        {customer.quocGia}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 border-r border-gray-200">
                      {customer.loaiKhachHang}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 border-r border-gray-200">
                      <span className="font-medium text-green-600">
                        ${customer.doanhThuNam.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center border-r border-gray-200">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                        customer.trangThai === 'Hoạt động' ? 'bg-green-100 text-green-700 border border-green-300' :
                        customer.trangThai === 'Tạm ngưng' ? 'bg-yellow-100 text-yellow-700 border border-yellow-300' :
                        'bg-red-100 text-red-700 border border-red-300'
                      }`}>
                        {customer.trangThai}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-3">
                        <button
                          onClick={() => openDetailModal(customer)}
                          className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-md transition-colors"
                          title="Xem chi tiết"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => openEditModal(customer)}
                          className="p-1.5 text-green-600 hover:bg-green-100 rounded-md transition-colors"
                          title="Chỉnh sửa"
                        >
                          <Edit className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(customer.id)}
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
      </div>

      {/* Pagination */}
      <div className="mt-4 flex justify-between items-center">
        <div className="text-sm text-gray-600">
          Trang {page} / {totalPages}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Trước
          </button>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Sau
          </button>
        </div>
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">
                  {editingCustomer ? 'Chỉnh sửa khách hàng' : 'Thêm khách hàng mới'}
                </h2>
                <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-gray-700">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tên công ty <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="tenCongTy"
                      value={formData.tenCongTy}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Người liên hệ <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="nguoiLienHe"
                      value={formData.nguoiLienHe}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Quốc gia <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="quocGia"
                      value={formData.quocGia}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Thành phố
                    </label>
                    <input
                      type="text"
                      name="thanhPho"
                      value={formData.thanhPho || ''}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Địa chỉ
                  </label>
                  <input
                    type="text"
                    name="diaChi"
                    value={formData.diaChi || ''}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Số điện thoại
                    </label>
                    <input
                      type="text"
                      name="soDienThoai"
                      value={formData.soDienThoai || ''}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email || ''}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Website
                    </label>
                    <input
                      type="text"
                      name="website"
                      value={formData.website || ''}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Loại khách hàng <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="loaiKhachHang"
                      value={formData.loaiKhachHang}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="">Chọn loại khách hàng</option>
                      <option value="Nhà phân phối">Nhà phân phối</option>
                      <option value="Nhà nhập khẩu">Nhà nhập khẩu</option>
                      <option value="Nhà bán lẻ">Nhà bán lẻ</option>
                      <option value="Đại lý">Đại lý</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Trạng thái
                    </label>
                    <select
                      name="trangThai"
                      value={formData.trangThai || 'Hoạt động'}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="Hoạt động">Hoạt động</option>
                      <option value="Tạm ngưng">Tạm ngưng</option>
                      <option value="Ngừng hợp tác">Ngừng hợp tác</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Ngày hợp tác
                    </label>
                    <input
                      type="date"
                      name="ngayHopTac"
                      value={formData.ngayHopTac || ''}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Doanh thu năm (USD)
                    </label>
                    <input
                      type="number"
                      name="doanhThuNam"
                      value={formData.doanhThuNam || 0}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Số lượng đơn hàng
                    </label>
                    <input
                      type="number"
                      name="soLuongDonHang"
                      value={formData.soLuongDonHang || 0}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sản phẩm chính
                  </label>
                  <input
                    type="text"
                    name="sanPhamChinh"
                    value={formData.sanPhamChinh || ''}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ghi chú
                  </label>
                  <textarea
                    name="ghiChu"
                    value={formData.ghiChu || ''}
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
                    onClick={editingCustomer ? handleUpdate : handleCreate}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    {editingCustomer ? 'Cập nhật' : 'Tạo mới'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedCustomer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Chi tiết khách hàng</h2>
                <button onClick={() => setShowDetailModal(false)} className="text-gray-500 hover:text-gray-700">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Mã khách hàng</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedCustomer.maKhachHang}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Tên công ty</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedCustomer.tenCongTy}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Người liên hệ</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedCustomer.nguoiLienHe}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Quốc gia</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedCustomer.quocGia}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Thành phố</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedCustomer.thanhPho || '-'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Số điện thoại</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedCustomer.soDienThoai || '-'}</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-500">Địa chỉ</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedCustomer.diaChi || '-'}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Email</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedCustomer.email || '-'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Website</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedCustomer.website || '-'}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Loại khách hàng</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedCustomer.loaiKhachHang}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Trạng thái</label>
                    <p className="mt-1">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        selectedCustomer.trangThai === 'Hoạt động' ? 'bg-green-100 text-green-800' :
                        selectedCustomer.trangThai === 'Tạm ngưng' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {selectedCustomer.trangThai}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Ngày hợp tác</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedCustomer.ngayHopTac || '-'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Doanh thu năm</label>
                    <p className="mt-1 text-sm font-medium text-green-600">
                      ${selectedCustomer.doanhThuNam.toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Số lượng đơn hàng</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedCustomer.soLuongDonHang}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Sản phẩm chính</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedCustomer.sanPhamChinh || '-'}</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-500">Ghi chú</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedCustomer.ghiChu || '-'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InternationalCustomerManagement;
