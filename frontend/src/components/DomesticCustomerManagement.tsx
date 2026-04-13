import React, { useState, useMemo } from 'react';
import { Plus, Edit, Trash2, Eye, X, Download } from 'lucide-react';
import TableFilter, { FilterField } from './TableFilter';
import internationalCustomerService, {
  InternationalCustomer,
  CreateInternationalCustomerRequest,
  UpdateInternationalCustomerRequest
} from '../services/internationalCustomerService';
import { useCustomers, customerKeys } from '../hooks';
import { useQueryClient } from '@tanstack/react-query';

const DomesticCustomerManagement: React.FC = () => {
  const [filterValues, setFilterValues] = useState<Record<string, string>>({
    _search: '',
    maKhachHang: '',
    tenCongTy: '',
    tinhThanh: '',
  });
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<InternationalCustomer | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<InternationalCustomer | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [formData, setFormData] = useState<CreateInternationalCustomerRequest>({
    tenCongTy: '',
    nguoiLienHe: '',
    loaiKhachHang: '',
    tinhThanh: '',
  });

  const queryClient = useQueryClient();
  const { data: customersData, isLoading: loading } = useCustomers({
    limit: 1000,
    search: filterValues._search,
    customerType: 'Nội địa',
  });
  const rawCustomers = customersData?.data || [];

  const customerFilterFields: FilterField[] = [
    { key: 'maKhachHang', label: 'Mã KH', type: 'text' },
    { key: 'tenCongTy', label: 'Tên công ty', type: 'text' },
    { key: 'tinhThanh', label: 'Tỉnh/Thành', type: 'text' },
  ];

  const customers = useMemo(() => {
    return rawCustomers.filter((c: any) => {
      const search = (filterValues._search || '').toLowerCase();
      const matchSearch = !search ||
        (c.maKhachHang || '').toLowerCase().includes(search) ||
        (c.tenCongTy || '').toLowerCase().includes(search) ||
        (c.nguoiLienHe || '').toLowerCase().includes(search) ||
        (c.tinhThanh || '').toLowerCase().includes(search);
      const matchMa = !filterValues.maKhachHang || (c.maKhachHang || '').toLowerCase().includes(filterValues.maKhachHang.toLowerCase());
      const matchTen = !filterValues.tenCongTy || (c.tenCongTy || '').toLowerCase().includes(filterValues.tenCongTy.toLowerCase());
      const matchTT = !filterValues.tinhThanh || (c.tinhThanh || '').toLowerCase().includes(filterValues.tinhThanh.toLowerCase());
      return matchSearch && matchMa && matchTen && matchTT;
    });
  }, [rawCustomers, filterValues]);

  const handleFilterChange = (newValues: Record<string, string>) => {
    setFilterValues(newValues);
    setCurrentPage(1);
  };

  const handleCreate = async () => {
    // Validate required fields
    if (!formData.tenCongTy || !formData.nguoiLienHe || !formData.loaiKhachHang || !formData.tinhThanh) {
      alert('Vui lòng điền đầy đủ các trường bắt buộc: Tên công ty, Người liên hệ, Loại khách hàng, Tỉnh/Thành phố');
      return;
    }

    try {
      console.log('Creating customer with data:', formData);
      await internationalCustomerService.createCustomer(formData);
      alert('Tạo khách hàng thành công!');
      setShowModal(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: customerKeys.lists() });
    } catch (error: any) {
      console.error('Error creating customer:', error);
      alert('Lỗi khi tạo khách hàng: ' + error.message);
    }
  };

  const handleUpdate = async () => {
    if (!editingCustomer) return;

    // Validate required fields
    if (!formData.tenCongTy || !formData.nguoiLienHe || !formData.loaiKhachHang || !formData.tinhThanh) {
      alert('Vui lòng điền đầy đủ các trường bắt buộc: Tên công ty, Người liên hệ, Loại khách hàng, Tỉnh/Thành phố');
      return;
    }

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
      tinhThanh: customer.tinhThanh,
      quanHuyen: customer.quanHuyen,
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
      maSoThue: customer.maSoThue,
      ghiChu: customer.ghiChu,
    });
    setShowModal(true);
  };

  const openDetailModal = (customer: InternationalCustomer) => {
    setSelectedCustomer(customer);
    setShowDetailModal(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'doanhThuNam' || name === 'soLuongDonHang' ? parseFloat(value) || 0 : value
    }));
  };

  const resetForm = () => {
    setFormData({
      tenCongTy: '',
      nguoiLienHe: '',
      loaiKhachHang: '',
      tinhThanh: '',
    });
    setEditingCustomer(null);
  };

  const handleExportExcel = async () => {
    try {
      await internationalCustomerService.exportToExcel({ search: filterValues._search, phanLoaiDiaLy: 'Nội địa' });
      alert('Đã xuất file Excel thành công');
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      alert('Không thể xuất file Excel');
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Danh sách khách hàng nội địa</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            Xuất Excel
          </button>
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Thêm khách hàng
          </button>
        </div>
      </div>

      {/* Search & Filter */}
      <TableFilter
        filters={customerFilterFields}
        values={filterValues}
        onChange={handleFilterChange}
        searchPlaceholder="Tìm kiếm mã KH, tên công ty, tỉnh/thành..."
      />

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-300">
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Mã KH</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Tên công ty</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Người liên hệ</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Tỉnh/Thành</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Quận/Huyện</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Loại KH</th>
              <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900 border-r border-gray-200">Trạng thái</th>
              <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">Hoạt động</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                  Đang tải...
                </td>
              </tr>
            ) : customers.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                  Không có dữ liệu
                </td>
              </tr>
            ) : (
              customers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((customer, index) => (
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
                    {customer.tinhThanh || '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 border-r border-gray-200">
                    {customer.quanHuyen || '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 border-r border-gray-200">
                    {customer.loaiKhachHang}
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

      {/* Pagination */}
      {(() => {
        const totalItems = customers.length;
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

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">
                  {editingCustomer ? 'Chỉnh sửa khách hàng' : 'Thêm khách hàng nội địa'}
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tỉnh/Thành phố <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="tinhThanh"
                      value={formData.tinhThanh || ''}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Quận/Huyện
                    </label>
                    <input
                      type="text"
                      name="quanHuyen"
                      value={formData.quanHuyen || ''}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Mã số thuế
                    </label>
                    <input
                      type="text"
                      name="maSoThue"
                      value={formData.maSoThue || ''}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Loại khách hàng <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="loaiKhachHang"
                      value={formData.loaiKhachHang}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                      required
                    >
                      <option value="">Chọn loại khách hàng</option>
                      <option value="Nhà phân phối">Nhà phân phối</option>
                      <option value="Nhà nhập khẩu">Nhà nhập khẩu</option>
                      <option value="Nhà bán lẻ">Nhà bán lẻ</option>
                      <option value="Đại lý">Đại lý</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Trạng thái
                    </label>
                    <select
                      name="trangThai"
                      value={formData.trangThai || 'Hoạt động'}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    >
                      <option value="Hoạt động">Hoạt động</option>
                      <option value="Tạm ngưng">Tạm ngưng</option>
                      <option value="Ngừng hợp tác">Ngừng hợp tác</option>
                    </select>
                  </div>
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  />
                </div>

                <div className="flex justify-end gap-2 mt-6">
                  <button
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Hủy
                  </button>
                  <button
                    onClick={editingCustomer ? handleUpdate : handleCreate}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
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
                  <div className="bg-gray-50 p-3 rounded">
                    <label className="text-sm font-medium text-gray-500">Mã khách hàng</label>
                    <p className="text-sm text-gray-900 mt-1">{selectedCustomer.maKhachHang}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded">
                    <label className="text-sm font-medium text-gray-500">Tên công ty</label>
                    <p className="text-sm text-gray-900 mt-1">{selectedCustomer.tenCongTy}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded">
                    <label className="text-sm font-medium text-gray-500">Người liên hệ</label>
                    <p className="text-sm text-gray-900 mt-1">{selectedCustomer.nguoiLienHe}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded">
                    <label className="text-sm font-medium text-gray-500">Tỉnh/Thành phố</label>
                    <p className="text-sm text-gray-900 mt-1">{selectedCustomer.tinhThanh || '-'}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded">
                    <label className="text-sm font-medium text-gray-500">Quận/Huyện</label>
                    <p className="text-sm text-gray-900 mt-1">{selectedCustomer.quanHuyen || '-'}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded">
                    <label className="text-sm font-medium text-gray-500">Mã số thuế</label>
                    <p className="text-sm text-gray-900 mt-1">{selectedCustomer.maSoThue || '-'}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded">
                    <label className="text-sm font-medium text-gray-500">Số điện thoại</label>
                    <p className="text-sm text-gray-900 mt-1">{selectedCustomer.soDienThoai || '-'}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded">
                    <label className="text-sm font-medium text-gray-500">Email</label>
                    <p className="text-sm text-gray-900 mt-1">{selectedCustomer.email || '-'}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded col-span-2">
                    <label className="text-sm font-medium text-gray-500">Địa chỉ</label>
                    <p className="text-sm text-gray-900 mt-1">{selectedCustomer.diaChi || '-'}</p>
                  </div>
                </div>

                <div className="flex justify-end gap-2 mt-6">
                  <button
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
    </div>
  );
};

export default DomesticCustomerManagement;

