import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, Download, Edit, Eye, Trash2, Calendar, FileText, Upload } from 'lucide-react';
import debtService, { Debt, DebtSummary } from '../services/debtService';

const DebtManagement: React.FC = () => {
  const [debtData, setDebtData] = useState<Debt[]>([]);
  const [summary, setSummary] = useState<DebtSummary>({
    tongPhaiTra: 0,
    daThanhToan: 0,
    conNo: 0,
    soLuongCongNo: 0,
    chuaThanhToan: 0,
    daThanhToanHet: 0,
  });
  const [loading, setLoading] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedDebt, setSelectedDebt] = useState<Debt | null>(null);
  const [formData, setFormData] = useState({
    ngayPhatSinh: '',
    loaiChiPhi: '',
    maNhaCungCap: '',
    tenNhaCungCap: '',
    loaiCungCap: '',
    cungCap: '',
    noiDungChiCho: '',
    loaiHinh: '',
    soTienPhaiTra: '',
    soTienDaThanhToan: '',
    ngayHoachToan: '',
    ngayDenHan: '',
    soTaiKhoan: '',
    ghiChu: '',
  });

  useEffect(() => {
    fetchDebts();
    fetchSummary();
  }, []);

  const fetchDebts = async () => {
    try {
      setLoading(true);
      const response = await debtService.getAllDebts();
      setDebtData(response.data.data);
    } catch (error) {
      console.error('Error fetching debts:', error);
      alert('Lỗi khi tải danh sách công nợ');
    } finally {
      setLoading(false);
    }
  };

  const fetchSummary = async () => {
    try {
      const response = await debtService.getDebtSummary();
      setSummary(response.data.data);
    } catch (error) {
      console.error('Error fetching summary:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa công nợ này?')) return;

    try {
      await debtService.deleteDebt(id);
      alert('Xóa công nợ thành công!');
      fetchDebts();
      fetchSummary();
    } catch (error: any) {
      console.error('Error deleting debt:', error);
      alert(error.response?.data?.message || 'Lỗi khi xóa công nợ');
    }
  };

  const handleView = (debt: Debt) => {
    setSelectedDebt(debt);
    setIsViewModalOpen(true);
  };

  const handleEdit = (debt: Debt) => {
    setSelectedDebt(debt);
    setFormData({
      ngayPhatSinh: debt.ngayPhatSinh.split('T')[0],
      loaiChiPhi: debt.loaiChiPhi || '',
      maNhaCungCap: debt.maNhaCungCap,
      tenNhaCungCap: debt.tenNhaCungCap,
      loaiCungCap: debt.loaiCungCap || '',
      cungCap: debt.cungCap || '',
      noiDungChiCho: debt.noiDungChiCho || '',
      loaiHinh: debt.loaiHinh || '',
      soTienPhaiTra: debt.soTienPhaiTra.toString(),
      soTienDaThanhToan: debt.soTienDaThanhToan.toString(),
      ngayHoachToan: debt.ngayHoachToan ? debt.ngayHoachToan.split('T')[0] : '',
      ngayDenHan: debt.ngayDenHan ? debt.ngayDenHan.split('T')[0] : '',
      soTaiKhoan: debt.soTaiKhoan || '',
      ghiChu: debt.ghiChu || '',
    });
    setIsEditModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.maNhaCungCap || !formData.tenNhaCungCap || !formData.ngayPhatSinh) {
      alert('Vui lòng điền đầy đủ thông tin bắt buộc!');
      return;
    }

    try {
      setLoading(true);
      await debtService.createDebt(formData);
      alert('Thêm công nợ thành công!');
      setIsAddModalOpen(false);
      setFormData({
        ngayPhatSinh: '',
        loaiChiPhi: '',
        maNhaCungCap: '',
        tenNhaCungCap: '',
        loaiCungCap: '',
        cungCap: '',
        noiDungChiCho: '',
        loaiHinh: '',
        soTienPhaiTra: '',
        soTienDaThanhToan: '',
        ngayHoachToan: '',
        ngayDenHan: '',
        soTaiKhoan: '',
        ghiChu: '',
      });
      fetchDebts();
      fetchSummary();
    } catch (error: any) {
      console.error('Error creating debt:', error);
      alert(error.response?.data?.message || 'Lỗi khi thêm công nợ');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedDebt || !formData.maNhaCungCap || !formData.tenNhaCungCap || !formData.ngayPhatSinh) {
      alert('Vui lòng điền đầy đủ thông tin bắt buộc!');
      return;
    }

    try {
      setLoading(true);
      await debtService.updateDebt(selectedDebt.id, formData);
      alert('Cập nhật công nợ thành công!');
      setIsEditModalOpen(false);
      setSelectedDebt(null);
      setFormData({
        ngayPhatSinh: '',
        loaiChiPhi: '',
        maNhaCungCap: '',
        tenNhaCungCap: '',
        loaiCungCap: '',
        cungCap: '',
        noiDungChiCho: '',
        loaiHinh: '',
        soTienPhaiTra: '',
        soTienDaThanhToan: '',
        ngayHoachToan: '',
        ngayDenHan: '',
        soTaiKhoan: '',
        ghiChu: '',
      });
      fetchDebts();
      fetchSummary();
    } catch (error: any) {
      console.error('Error updating debt:', error);
      alert(error.response?.data?.message || 'Lỗi khi cập nhật công nợ');
    } finally {
      setLoading(false);
    }
  };



  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('vi-VN');
  };

  return (
    <div>
      {/* Action Bar */}
      <div className="mb-6 bg-white rounded-lg shadow-sm p-4">
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Tìm kiếm công nợ..."
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 w-64"
              />
            </div>
            <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50">
              <Filter className="h-4 w-4" />
              Lọc
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">
              <Download className="h-4 w-4" />
              Xuất Excel
            </button>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700"
            >
              <Plus className="h-4 w-4" />
              Thêm mới
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        {loading ? (
          <div className="text-center py-8">
            <p className="text-gray-500">Đang tải...</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">STT</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ngày phát sinh</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Loại chi phí</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mã nhà cung cấp</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tên nhà cung cấp</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Loại cung cấp</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cung cấp</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nội dung chi cho</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Loại hình</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Số tiền phải trả</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Số tiền đã thanh toán</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ngày hoạch toán</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ngày đến hạn</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Số tài khoản</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ghi chú</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">File đính kèm</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hoạt động</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {debtData.map((item, index) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{index + 1}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 text-gray-400 mr-1" />
                      {formatDate(item.ngayPhatSinh)}
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{item.loaiChiPhi || '-'}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-blue-600">{item.maNhaCungCap}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{item.tenNhaCungCap}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{item.loaiCungCap || '-'}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{item.cungCap || '-'}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{item.noiDungChiCho || '-'}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      item.loaiHinh === 'Hóa đơn' ? 'bg-blue-100 text-blue-800' :
                      item.loaiHinh === 'Có nhận' ? 'bg-green-100 text-green-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {item.loaiHinh || '-'}
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                    <span className="font-medium text-red-600">
                      {formatCurrency(item.soTienPhaiTra)}
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                    <span className="font-medium text-green-600">
                      {formatCurrency(item.soTienDaThanhToan)}
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 text-gray-400 mr-1" />
                      {formatDate(item.ngayHoachToan)}
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 text-gray-400 mr-1" />
                      {formatDate(item.ngayDenHan)}
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{item.soTaiKhoan || '-'}</td>
                  <td className="px-4 py-4 text-sm text-gray-900 max-w-xs truncate">{item.ghiChu || '-'}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                    {item.fileDinhKem ? (
                      <button className="text-blue-600 hover:text-blue-800" title="Xem file">
                        <FileText className="w-4 h-4" />
                      </button>
                    ) : (
                      <button className="text-gray-400 hover:text-gray-600" title="Upload file">
                        <Upload className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleView(item)}
                        className="text-blue-600 hover:text-blue-800"
                        title="Xem chi tiết"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleEdit(item)}
                        className="text-green-600 hover:text-green-800"
                        title="Chỉnh sửa"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="text-red-600 hover:text-red-800"
                        title="Xóa"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Summary */}
      <div className="mt-6 bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Tổng hợp công nợ</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-red-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">Tổng phải trả</p>
            <p className="text-2xl font-bold text-red-600">
              {formatCurrency(summary.tongPhaiTra)}
            </p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">Đã thanh toán</p>
            <p className="text-2xl font-bold text-green-600">
              {formatCurrency(summary.daThanhToan)}
            </p>
          </div>
          <div className="bg-orange-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">Còn nợ</p>
            <p className="text-2xl font-bold text-orange-600">
              {formatCurrency(summary.conNo)}
            </p>
          </div>
        </div>
      </div>

      {/* Add Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-800">Thêm công nợ mới</h2>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Ngày phát sinh */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ngày phát sinh <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.ngayPhatSinh}
                    onChange={(e) => setFormData({ ...formData, ngayPhatSinh: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                {/* Loại chi phí */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Loại chi phí
                  </label>
                  <input
                    type="text"
                    value={formData.loaiChiPhi}
                    onChange={(e) => setFormData({ ...formData, loaiChiPhi: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="VD: BB-001"
                  />
                </div>

                {/* Mã nhà cung cấp */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mã nhà cung cấp <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.maNhaCungCap}
                    onChange={(e) => setFormData({ ...formData, maNhaCungCap: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="VD: NCC-001"
                  />
                </div>

                {/* Tên nhà cung cấp */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tên nhà cung cấp <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.tenNhaCungCap}
                    onChange={(e) => setFormData({ ...formData, tenNhaCungCap: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="VD: CTY TNHH ABC"
                  />
                </div>

                {/* Loại cung cấp */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Loại cung cấp
                  </label>
                  <select
                    value={formData.loaiCungCap}
                    onChange={(e) => setFormData({ ...formData, loaiCungCap: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="">-- Chọn loại --</option>
                    <option value="Bao bì">Bao bì</option>
                    <option value="Nguyên vật liệu">Nguyên vật liệu</option>
                    <option value="Dịch vụ">Dịch vụ</option>
                    <option value="Khác">Khác</option>
                  </select>
                </div>

                {/* Cung cấp */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cung cấp
                  </label>
                  <input
                    type="text"
                    value={formData.cungCap}
                    onChange={(e) => setFormData({ ...formData, cungCap: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="VD: Thùng carton"
                  />
                </div>

                {/* Nội dung chi cho */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nội dung chi cho
                  </label>
                  <input
                    type="text"
                    value={formData.noiDungChiCho}
                    onChange={(e) => setFormData({ ...formData, noiDungChiCho: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                {/* Loại hình */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Loại hình
                  </label>
                  <select
                    value={formData.loaiHinh}
                    onChange={(e) => setFormData({ ...formData, loaiHinh: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="">-- Chọn loại hình --</option>
                    <option value="Hóa đơn">Hóa đơn</option>
                    <option value="Có nhận">Có nhận</option>
                    <option value="Chưa có">Chưa có</option>
                  </select>
                </div>

                {/* Số tiền phải trả */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Số tiền phải trả
                  </label>
                  <input
                    type="number"
                    value={formData.soTienPhaiTra}
                    onChange={(e) => setFormData({ ...formData, soTienPhaiTra: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="0"
                  />
                </div>

                {/* Số tiền đã thanh toán */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Số tiền đã thanh toán
                  </label>
                  <input
                    type="number"
                    value={formData.soTienDaThanhToan}
                    onChange={(e) => setFormData({ ...formData, soTienDaThanhToan: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="0"
                  />
                </div>

                {/* Ngày hoạch toán */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ngày hoạch toán
                  </label>
                  <input
                    type="date"
                    value={formData.ngayHoachToan}
                    onChange={(e) => setFormData({ ...formData, ngayHoachToan: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                {/* Ngày đến hạn */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ngày đến hạn
                  </label>
                  <input
                    type="date"
                    value={formData.ngayDenHan}
                    onChange={(e) => setFormData({ ...formData, ngayDenHan: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                {/* Số tài khoản */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Số tài khoản
                  </label>
                  <input
                    type="text"
                    value={formData.soTaiKhoan}
                    onChange={(e) => setFormData({ ...formData, soTaiKhoan: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                {/* Ghi chú */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ghi chú
                  </label>
                  <textarea
                    value={formData.ghiChu}
                    onChange={(e) => setFormData({ ...formData, ghiChu: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                    rows={3}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50"
                >
                  {loading ? 'Đang lưu...' : 'Lưu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {isEditModalOpen && selectedDebt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-800">Chỉnh sửa công nợ</h2>
              <button
                onClick={() => {
                  setIsEditModalOpen(false);
                  setSelectedDebt(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdate} className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Same form fields as Add Modal */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ngày phát sinh <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.ngayPhatSinh}
                    onChange={(e) => setFormData({ ...formData, ngayPhatSinh: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Loại chi phí
                  </label>
                  <input
                    type="text"
                    value={formData.loaiChiPhi}
                    onChange={(e) => setFormData({ ...formData, loaiChiPhi: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mã nhà cung cấp <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.maNhaCungCap}
                    onChange={(e) => setFormData({ ...formData, maNhaCungCap: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tên nhà cung cấp <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.tenNhaCungCap}
                    onChange={(e) => setFormData({ ...formData, tenNhaCungCap: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Loại cung cấp
                  </label>
                  <select
                    value={formData.loaiCungCap}
                    onChange={(e) => setFormData({ ...formData, loaiCungCap: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="">-- Chọn loại --</option>
                    <option value="Bao bì">Bao bì</option>
                    <option value="Nguyên vật liệu">Nguyên vật liệu</option>
                    <option value="Dịch vụ">Dịch vụ</option>
                    <option value="Khác">Khác</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cung cấp
                  </label>
                  <input
                    type="text"
                    value={formData.cungCap}
                    onChange={(e) => setFormData({ ...formData, cungCap: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nội dung chi cho
                  </label>
                  <input
                    type="text"
                    value={formData.noiDungChiCho}
                    onChange={(e) => setFormData({ ...formData, noiDungChiCho: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Loại hình
                  </label>
                  <select
                    value={formData.loaiHinh}
                    onChange={(e) => setFormData({ ...formData, loaiHinh: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="">-- Chọn loại hình --</option>
                    <option value="Hóa đơn">Hóa đơn</option>
                    <option value="Có nhận">Có nhận</option>
                    <option value="Chưa có">Chưa có</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Số tiền phải trả
                  </label>
                  <input
                    type="number"
                    value={formData.soTienPhaiTra}
                    onChange={(e) => setFormData({ ...formData, soTienPhaiTra: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Số tiền đã thanh toán
                  </label>
                  <input
                    type="number"
                    value={formData.soTienDaThanhToan}
                    onChange={(e) => setFormData({ ...formData, soTienDaThanhToan: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ngày hoạch toán
                  </label>
                  <input
                    type="date"
                    value={formData.ngayHoachToan}
                    onChange={(e) => setFormData({ ...formData, ngayHoachToan: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ngày đến hạn
                  </label>
                  <input
                    type="date"
                    value={formData.ngayDenHan}
                    onChange={(e) => setFormData({ ...formData, ngayDenHan: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Số tài khoản
                  </label>
                  <input
                    type="text"
                    value={formData.soTaiKhoan}
                    onChange={(e) => setFormData({ ...formData, soTaiKhoan: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ghi chú
                  </label>
                  <textarea
                    value={formData.ghiChu}
                    onChange={(e) => setFormData({ ...formData, ghiChu: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                    rows={3}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setSelectedDebt(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50"
                >
                  {loading ? 'Đang lưu...' : 'Cập nhật'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Modal */}
      {isViewModalOpen && selectedDebt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-800">Chi tiết công nợ</h2>
              <button
                onClick={() => {
                  setIsViewModalOpen(false);
                  setSelectedDebt(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Ngày phát sinh</label>
                  <p className="text-gray-900">{formatDate(selectedDebt.ngayPhatSinh)}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Loại chi phí</label>
                  <p className="text-gray-900">{selectedDebt.loaiChiPhi || '-'}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Mã nhà cung cấp</label>
                  <p className="text-gray-900 font-medium text-blue-600">{selectedDebt.maNhaCungCap}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Tên nhà cung cấp</label>
                  <p className="text-gray-900">{selectedDebt.tenNhaCungCap}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Loại cung cấp</label>
                  <p className="text-gray-900">{selectedDebt.loaiCungCap || '-'}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Cung cấp</label>
                  <p className="text-gray-900">{selectedDebt.cungCap || '-'}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Nội dung chi cho</label>
                  <p className="text-gray-900">{selectedDebt.noiDungChiCho || '-'}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Loại hình</label>
                  <p>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      selectedDebt.loaiHinh === 'Hóa đơn' ? 'bg-blue-100 text-blue-800' :
                      selectedDebt.loaiHinh === 'Có nhận' ? 'bg-green-100 text-green-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {selectedDebt.loaiHinh || '-'}
                    </span>
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Số tiền phải trả</label>
                  <p className="text-red-600 font-bold text-lg">{formatCurrency(selectedDebt.soTienPhaiTra)}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Số tiền đã thanh toán</label>
                  <p className="text-green-600 font-bold text-lg">{formatCurrency(selectedDebt.soTienDaThanhToan)}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Còn nợ</label>
                  <p className="text-orange-600 font-bold text-lg">
                    {formatCurrency(selectedDebt.soTienPhaiTra - selectedDebt.soTienDaThanhToan)}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Ngày hoạch toán</label>
                  <p className="text-gray-900">{formatDate(selectedDebt.ngayHoachToan)}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Ngày đến hạn</label>
                  <p className="text-gray-900">{formatDate(selectedDebt.ngayDenHan)}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Số tài khoản</label>
                  <p className="text-gray-900">{selectedDebt.soTaiKhoan || '-'}</p>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-500 mb-1">Ghi chú</label>
                  <p className="text-gray-900">{selectedDebt.ghiChu || '-'}</p>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => {
                    setIsViewModalOpen(false);
                    setSelectedDebt(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Đóng
                </button>
                <button
                  onClick={() => {
                    setIsViewModalOpen(false);
                    handleEdit(selectedDebt);
                  }}
                  className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700"
                >
                  Chỉnh sửa
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DebtManagement;

