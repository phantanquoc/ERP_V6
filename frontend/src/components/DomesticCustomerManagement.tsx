import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, Eye, MapPin, X } from 'lucide-react';
import internationalCustomerService, {
  InternationalCustomer,
  CreateInternationalCustomerRequest,
  UpdateInternationalCustomerRequest
} from '../services/internationalCustomerService';

const DomesticCustomerManagement: React.FC = () => {
  const [customers, setCustomers] = useState<InternationalCustomer[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<InternationalCustomer | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<InternationalCustomer | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [formData, setFormData] = useState<CreateInternationalCustomerRequest>({
    tenCongTy: '',
    nguoiLienHe: '',
    loaiKhachHang: '',
    tinhThanh: '',
  });

  useEffect(() => {
    fetchCustomers();
  }, [page, searchTerm]);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      // Chỉ lấy khách hàng Nội địa (có tinhThanh)
      const response = await internationalCustomerService.getAllCustomers(page, 10, searchTerm, 'Nội địa');
      setCustomers(response.data);
      setTotalPages(response.totalPages);
    } catch (error: any) {
      alert('Lỗi khi tải danh sách khách hàng: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setPage(1);
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
      fetchCustomers();
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
      fetchCustomers();
    } catch (error: any) {
      alert('Lỗi khi cập nhật khách hàng: ' + error.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa khách hàng này?')) return;
    try {
      await internationalCustomerService.deleteCustomer(id);
      alert('Xóa khách hàng thành công!');
      fetchCustomers();
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

  return (
    <div>
      {/* Header Actions */}
      <div className="mb-6 flex justify-between items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Tìm kiếm khách hàng nội địa..."
            value={searchTerm}
            onChange={handleSearch}
            className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <button
          onClick={openCreateModal}
          className="ml-4 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Thêm khách hàng
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mã KH</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tên công ty</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Người liên hệ</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tỉnh/Thành</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quận/Huyện</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Loại KH</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trạng thái</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hoạt động</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
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
              customers.map((customer) => (
                <tr key={customer.id} className="hover:bg-gray-50">
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {customer.maKhachHang}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                    {customer.tenCongTy}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                    {customer.nguoiLienHe}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                    {customer.tinhThanh || '-'}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                    {customer.quanHuyen || '-'}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                    {customer.loaiKhachHang}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      customer.trangThai === 'Hoạt động' ? 'bg-green-100 text-green-800' :
                      customer.trangThai === 'Tạm ngưng' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {customer.trangThai}
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openDetailModal(customer)}
                        className="text-blue-600 hover:text-blue-800"
                        title="Xem chi tiết"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openEditModal(customer)}
                        className="text-yellow-600 hover:text-yellow-800"
                        title="Chỉnh sửa"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(customer.id)}
                        className="text-red-600 hover:text-red-800"
                        title="Xóa"
                      >
                        <Trash2 className="w-4 h-4" />
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
      {totalPages > 1 && (
        <div className="mt-4 flex justify-center gap-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 border rounded-lg disabled:opacity-50"
          >
            Trước
          </button>
          <span className="px-4 py-2">
            Trang {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 border rounded-lg disabled:opacity-50"
          >
            Sau
          </button>
        </div>
      )}

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

