import React, { useState, useEffect } from 'react';
import { Search, Edit, Eye, Trash2, Calendar, Plus, X } from 'lucide-react';
import invoiceService, { Invoice } from '../services/invoiceService';
import DatePicker from './DatePicker';
import { useAuth } from '../contexts/AuthContext';
import internationalCustomerService from '../services/internationalCustomerService';

interface Customer {
  id: string;
  tenCongTy: string;
  maSoThue?: string;
  quocGia?: string;  // Khách hàng quốc tế
  tinhThanh?: string; // Khách hàng nội địa
}

const InvoiceManagement: React.FC = () => {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  // Form data
  const [formData, setFormData] = useState({
    soHoaDon: '',
    ngayLap: '',
    khachHang: '',
    maSoThue: '',
    tongTien: '',
    thue: '',
    thanhTien: '',
    trangThai: '',
    loaiHoaDon: '',
    phuongThucThanhToan: '',
    ngayThanhToan: '',
    nhanVienLap: '',
    ghiChu: '',
  });

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const response = await invoiceService.getAllInvoices(1, 100, searchTerm);
      setInvoices(response.data || []);
    } catch (error) {
      console.error('Error fetching invoices:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      // Lấy cả khách hàng quốc tế và nội địa
      const [internationalRes, domesticRes] = await Promise.all([
        internationalCustomerService.getAllCustomers(1, 1000, '', 'Quốc tế'),
        internationalCustomerService.getAllCustomers(1, 1000, '', 'Nội địa'),
      ]);

      const allCustomers = [
        ...(internationalRes.data || []),
        ...(domesticRes.data || []),
      ];
      setCustomers(allCustomers);
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  // Generate next invoice number
  const generateInvoiceNumber = (): string => {
    const currentYear = new Date().getFullYear();
    const prefix = `HD-${currentYear}-`;

    // Find the highest invoice number for current year
    const currentYearInvoices = invoices.filter(inv => inv.soHoaDon?.startsWith(prefix));
    let maxNumber = 0;

    currentYearInvoices.forEach(inv => {
      const match = inv.soHoaDon.match(/HD-\d{4}-(\d+)/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNumber) maxNumber = num;
      }
    });

    return `${prefix}${String(maxNumber + 1).padStart(4, '0')}`;
  };

  useEffect(() => {
    fetchInvoices();
    fetchCustomers();
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('vi-VN');
  };

  const resetFormData = () => {
    setFormData({
      soHoaDon: '',
      ngayLap: '',
      khachHang: '',
      maSoThue: '',
      tongTien: '',
      thue: '',
      thanhTien: '',
      trangThai: '',
      loaiHoaDon: '',
      phuongThucThanhToan: '',
      ngayThanhToan: '',
      nhanVienLap: '',
      ghiChu: '',
    });
  };

  const handleAddClick = () => {
    // Auto-fill số hóa đơn và nhân viên lập
    const autoInvoiceNumber = generateInvoiceNumber();
    const employeeName = user ? `${user.firstName} ${user.lastName}` : '';

    setFormData({
      soHoaDon: autoInvoiceNumber,
      ngayLap: new Date().toISOString().split('T')[0],
      khachHang: '',
      maSoThue: '',
      tongTien: '',
      thue: '',
      thanhTien: '',
      trangThai: 'Chưa thanh toán',
      loaiHoaDon: '',
      phuongThucThanhToan: '',
      ngayThanhToan: '',
      nhanVienLap: employeeName,
      ghiChu: '',
    });
    setIsAddModalOpen(true);
  };

  const handleEditClick = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setFormData({
      soHoaDon: invoice.soHoaDon || '',
      ngayLap: invoice.ngayLap || '',
      khachHang: invoice.khachHang || '',
      maSoThue: invoice.maSoThue || '',
      tongTien: String(invoice.tongTien || ''),
      thue: String(invoice.thue || ''),
      thanhTien: String(invoice.thanhTien || ''),
      trangThai: invoice.trangThai || '',
      loaiHoaDon: invoice.loaiHoaDon || '',
      phuongThucThanhToan: invoice.phuongThucThanhToan || '',
      ngayThanhToan: invoice.ngayThanhToan || '',
      nhanVienLap: invoice.nhanVienLap || '',
      ghiChu: invoice.ghiChu || '',
    });
    setIsEditModalOpen(true);
  };

  const handleViewClick = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setIsViewModalOpen(true);
  };

  const handleDeleteClick = async (invoice: Invoice) => {
    if (window.confirm(`Bạn có chắc muốn xóa hóa đơn ${invoice.soHoaDon}?`)) {
      try {
        await invoiceService.deleteInvoice(invoice.id);
        alert('Xóa hóa đơn thành công!');
        fetchInvoices();
      } catch (error: any) {
        alert(error.response?.data?.message || 'Lỗi khi xóa hóa đơn');
      }
    }
  };

  const handleSubmitAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      await invoiceService.createInvoice({
        ...formData,
        tongTien: Number(formData.tongTien) || 0,
        thue: Number(formData.thue) || 0,
        thanhTien: Number(formData.thanhTien) || 0,
        ngayThanhToan: formData.ngayThanhToan || null,
      });
      alert('Thêm hóa đơn thành công!');
      setIsAddModalOpen(false);
      resetFormData();
      fetchInvoices();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Lỗi khi thêm hóa đơn');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice) return;
    try {
      setLoading(true);
      await invoiceService.updateInvoice(selectedInvoice.id, {
        ...formData,
        tongTien: Number(formData.tongTien) || 0,
        thue: Number(formData.thue) || 0,
        thanhTien: Number(formData.thanhTien) || 0,
        ngayThanhToan: formData.ngayThanhToan || null,
      });
      alert('Cập nhật hóa đơn thành công!');
      setIsEditModalOpen(false);
      setSelectedInvoice(null);
      resetFormData();
      fetchInvoices();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Lỗi khi cập nhật hóa đơn');
    } finally {
      setLoading(false);
    }
  };

  const filteredInvoices = invoices.filter(invoice =>
    invoice.soHoaDon?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    invoice.khachHang?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      {/* Header & Search */}
      <div className="mb-4 flex flex-wrap gap-4 items-center justify-between">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <input
            type="text"
            placeholder="Tìm kiếm hóa đơn..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:border-blue-400 transition-colors w-64"
          />
        </div>
        <button
          onClick={handleAddClick}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 border-2 border-blue-600 hover:border-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Thêm hóa đơn
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b-2 border-gray-200">
              <th className="px-4 py-3 text-left text-sm font-semibold text-blue-600">STT</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-blue-600">Số hóa đơn</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-blue-600">Ngày lập</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-blue-600">Khách hàng</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-blue-600">Loại hóa đơn</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-blue-600">Thành tiền</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-blue-600">Trạng thái</th>
              <th className="px-4 py-3 text-center text-sm font-semibold text-blue-600">Hoạt động</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-500">Đang tải...</td>
              </tr>
            ) : filteredInvoices.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-500">Không có dữ liệu</td>
              </tr>
            ) : (
              filteredInvoices.map((invoice, index) => (
                <tr key={invoice.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-blue-600 font-medium">{index + 1}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-blue-600">{invoice.soHoaDon}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{formatDate(invoice.ngayLap)}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{invoice.khachHang}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{invoice.loaiHoaDon}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-gray-900">{formatCurrency(invoice.thanhTien)}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      invoice.trangThai === 'Đã thanh toán' ? 'bg-green-100 text-green-800' :
                      invoice.trangThai === 'Chưa thanh toán' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {invoice.trangThai}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <div className="flex items-center justify-center gap-3">
                      <button onClick={() => handleViewClick(invoice)} className="text-gray-500 hover:text-blue-600" title="Xem chi tiết">
                        <Eye className="w-5 h-5" />
                      </button>
                      <button onClick={() => handleEditClick(invoice)} className="text-gray-500 hover:text-green-600" title="Chỉnh sửa">
                        <Edit className="w-5 h-5" />
                      </button>
                      <button onClick={() => handleDeleteClick(invoice)} className="text-gray-500 hover:text-red-600" title="Xóa">
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

      {/* Add Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-800">Thêm hóa đơn mới</h2>
              <button onClick={() => setIsAddModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleSubmitAdd} className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Số hóa đơn <span className="text-red-500">*</span></label>
                  <input type="text" required readOnly value={formData.soHoaDon} className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600 cursor-not-allowed" />
                  <p className="text-xs text-gray-500 mt-1">Tự động tạo</p>
                </div>
                <div>
                  <DatePicker label="Ngày lập" value={formData.ngayLap} onChange={(date) => setFormData({ ...formData, ngayLap: date })} required placeholder="Chọn ngày lập" allowClear />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Khách hàng <span className="text-red-500">*</span></label>
                  <select
                    required
                    value={formData.khachHang}
                    onChange={(e) => {
                      const selectedCustomer = customers.find(c => c.tenCongTy === e.target.value);
                      setFormData({
                        ...formData,
                        khachHang: e.target.value,
                        maSoThue: selectedCustomer?.maSoThue || ''
                      });
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="">-- Chọn khách hàng --</option>
                    {customers.map((customer) => (
                      <option key={customer.id} value={customer.tenCongTy}>
                        {customer.tenCongTy} {customer.quocGia ? '(Quốc tế)' : customer.tinhThanh ? '(Nội địa)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mã số thuế</label>
                  <input type="text" readOnly value={formData.maSoThue} className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600" />
                  <p className="text-xs text-gray-500 mt-1">Tự động điền theo khách hàng</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Loại hóa đơn</label>
                  <select value={formData.loaiHoaDon} onChange={(e) => setFormData({ ...formData, loaiHoaDon: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500">
                    <option value="">-- Chọn loại --</option>
                    <option value="Bán hàng">Bán hàng</option>
                    <option value="Mua hàng">Mua hàng</option>
                    <option value="Dịch vụ">Dịch vụ</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tổng tiền</label>
                  <input type="number" value={formData.tongTien} onChange={(e) => setFormData({ ...formData, tongTien: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Thuế VAT (%)</label>
                  <input type="number" value={formData.thue} onChange={(e) => setFormData({ ...formData, thue: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Thành tiền</label>
                  <input type="number" value={formData.thanhTien} onChange={(e) => setFormData({ ...formData, thanhTien: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Trạng thái</label>
                  <select value={formData.trangThai} onChange={(e) => setFormData({ ...formData, trangThai: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500">
                    <option value="">-- Chọn trạng thái --</option>
                    <option value="Đã thanh toán">Đã thanh toán</option>
                    <option value="Chưa thanh toán">Chưa thanh toán</option>
                    <option value="Đang xử lý">Đang xử lý</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phương thức thanh toán</label>
                  <select value={formData.phuongThucThanhToan} onChange={(e) => setFormData({ ...formData, phuongThucThanhToan: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500">
                    <option value="">-- Chọn phương thức --</option>
                    <option value="Tiền mặt">Tiền mặt</option>
                    <option value="Chuyển khoản">Chuyển khoản</option>
                    <option value="Thẻ">Thẻ</option>
                  </select>
                </div>
                <div>
                  <DatePicker label="Ngày thanh toán" value={formData.ngayThanhToan} onChange={(date) => setFormData({ ...formData, ngayThanhToan: date })} placeholder="Chọn ngày thanh toán" allowClear />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nhân viên lập</label>
                  <input type="text" readOnly value={formData.nhanVienLap} className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600 cursor-not-allowed" />
                  <p className="text-xs text-gray-500 mt-1">Tự động điền</p>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú</label>
                  <textarea value={formData.ghiChu} onChange={(e) => setFormData({ ...formData, ghiChu: e.target.value })} rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500" />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">Hủy</button>
                <button type="submit" disabled={loading} className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50">{loading ? 'Đang xử lý...' : 'Thêm hóa đơn'}</button>
              </div>
            </form>
          </div>
        </div>
      )}


      {/* Edit Modal */}
      {isEditModalOpen && selectedInvoice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-800">Chỉnh sửa hóa đơn</h2>
              <button onClick={() => setIsEditModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleSubmitEdit} className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Số hóa đơn <span className="text-red-500">*</span></label>
                  <input type="text" required readOnly value={formData.soHoaDon} className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600 cursor-not-allowed" />
                </div>
                <div>
                  <DatePicker label="Ngày lập" value={formData.ngayLap} onChange={(date) => setFormData({ ...formData, ngayLap: date })} required placeholder="Chọn ngày lập" allowClear />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Khách hàng <span className="text-red-500">*</span></label>
                  <select
                    required
                    value={formData.khachHang}
                    onChange={(e) => {
                      const selectedCustomer = customers.find(c => c.tenCongTy === e.target.value);
                      setFormData({
                        ...formData,
                        khachHang: e.target.value,
                        maSoThue: selectedCustomer?.maSoThue || ''
                      });
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="">-- Chọn khách hàng --</option>
                    {customers.map((customer) => (
                      <option key={customer.id} value={customer.tenCongTy}>
                        {customer.tenCongTy} {customer.quocGia ? '(Quốc tế)' : customer.tinhThanh ? '(Nội địa)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mã số thuế</label>
                  <input type="text" readOnly value={formData.maSoThue} className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Loại hóa đơn</label>
                  <select value={formData.loaiHoaDon} onChange={(e) => setFormData({ ...formData, loaiHoaDon: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500">
                    <option value="">-- Chọn loại --</option>
                    <option value="Bán hàng">Bán hàng</option>
                    <option value="Mua hàng">Mua hàng</option>
                    <option value="Dịch vụ">Dịch vụ</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tổng tiền</label>
                  <input type="number" value={formData.tongTien} onChange={(e) => setFormData({ ...formData, tongTien: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Thuế VAT (%)</label>
                  <input type="number" value={formData.thue} onChange={(e) => setFormData({ ...formData, thue: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Thành tiền</label>
                  <input type="number" value={formData.thanhTien} onChange={(e) => setFormData({ ...formData, thanhTien: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Trạng thái</label>
                  <select value={formData.trangThai} onChange={(e) => setFormData({ ...formData, trangThai: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500">
                    <option value="">-- Chọn trạng thái --</option>
                    <option value="Đã thanh toán">Đã thanh toán</option>
                    <option value="Chưa thanh toán">Chưa thanh toán</option>
                    <option value="Đang xử lý">Đang xử lý</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phương thức thanh toán</label>
                  <select value={formData.phuongThucThanhToan} onChange={(e) => setFormData({ ...formData, phuongThucThanhToan: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500">
                    <option value="">-- Chọn phương thức --</option>
                    <option value="Tiền mặt">Tiền mặt</option>
                    <option value="Chuyển khoản">Chuyển khoản</option>
                    <option value="Thẻ">Thẻ</option>
                  </select>
                </div>
                <div>
                  <DatePicker label="Ngày thanh toán" value={formData.ngayThanhToan} onChange={(date) => setFormData({ ...formData, ngayThanhToan: date })} placeholder="Chọn ngày thanh toán" allowClear />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nhân viên lập</label>
                  <input type="text" value={formData.nhanVienLap} onChange={(e) => setFormData({ ...formData, nhanVienLap: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú</label>
                  <textarea value={formData.ghiChu} onChange={(e) => setFormData({ ...formData, ghiChu: e.target.value })} rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500" />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setIsEditModalOpen(false)} className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">Hủy</button>
                <button type="submit" disabled={loading} className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50">{loading ? 'Đang xử lý...' : 'Cập nhật'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Modal */}
      {isViewModalOpen && selectedInvoice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-800">Chi tiết hóa đơn</h2>
              <button onClick={() => setIsViewModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <label className="block text-sm font-medium text-gray-500 mb-1">Số hóa đơn</label>
                  <p className="text-gray-900 font-medium">{selectedInvoice.soHoaDon}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <label className="block text-sm font-medium text-gray-500 mb-1">Ngày lập</label>
                  <p className="text-gray-900">{formatDate(selectedInvoice.ngayLap)}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <label className="block text-sm font-medium text-gray-500 mb-1">Khách hàng</label>
                  <p className="text-gray-900">{selectedInvoice.khachHang}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <label className="block text-sm font-medium text-gray-500 mb-1">Mã số thuế</label>
                  <p className="text-gray-900">{selectedInvoice.maSoThue || '-'}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <label className="block text-sm font-medium text-gray-500 mb-1">Loại hóa đơn</label>
                  <p className="text-gray-900">{selectedInvoice.loaiHoaDon || '-'}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <label className="block text-sm font-medium text-gray-500 mb-1">Tổng tiền</label>
                  <p className="text-blue-600 font-bold">{formatCurrency(selectedInvoice.tongTien)}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <label className="block text-sm font-medium text-gray-500 mb-1">Thuế VAT (%)</label>
                  <p className="text-orange-600 font-medium">{selectedInvoice.thue}%</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <label className="block text-sm font-medium text-gray-500 mb-1">Thành tiền</label>
                  <p className="text-green-600 font-bold text-lg">{formatCurrency(selectedInvoice.thanhTien)}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <label className="block text-sm font-medium text-gray-500 mb-1">Trạng thái</label>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    selectedInvoice.trangThai === 'Đã thanh toán' ? 'bg-green-100 text-green-800' :
                    selectedInvoice.trangThai === 'Chưa thanh toán' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>{selectedInvoice.trangThai}</span>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <label className="block text-sm font-medium text-gray-500 mb-1">Phương thức thanh toán</label>
                  <p className="text-gray-900">{selectedInvoice.phuongThucThanhToan || '-'}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <label className="block text-sm font-medium text-gray-500 mb-1">Ngày thanh toán</label>
                  <p className="text-gray-900">{selectedInvoice.ngayThanhToan ? formatDate(selectedInvoice.ngayThanhToan) : '-'}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <label className="block text-sm font-medium text-gray-500 mb-1">Nhân viên lập</label>
                  <p className="text-gray-900">{selectedInvoice.nhanVienLap || '-'}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg md:col-span-2">
                  <label className="block text-sm font-medium text-gray-500 mb-1">Ghi chú</label>
                  <p className="text-gray-900">{selectedInvoice.ghiChu || '-'}</p>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button onClick={() => setIsViewModalOpen(false)} className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">Đóng</button>
                <button onClick={() => { setIsViewModalOpen(false); handleEditClick(selectedInvoice); }} className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700">Chỉnh sửa</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvoiceManagement;