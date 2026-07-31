import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Download, Trash2 } from 'lucide-react';
import debtService, { Debt, DebtSummary } from '../services/debtService';
import { useSupplierOptions } from '../hooks/useSuppliers';
import DatePicker from './DatePicker';
import Modal from './Modal';
import { parseNumberInputStr } from '../utils/numberInput';
import TableFilter, { FilterField } from './TableFilter';

interface DebtManagementProps {
  month?: number;
  year?: number;
}

const DebtManagement: React.FC<DebtManagementProps> = ({ month, year }) => {
  const [debtData, setDebtData] = useState<Debt[]>([]);
  const [filterValues, setFilterValues] = useState<Record<string, string>>({ _search: '', loaiChiPhi: '', trangThaiThanhToan: '' });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { data: suppliers = [] } = useSupplierOptions();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  useEffect(() => {
    fetchDebts();
    fetchSummary();
  }, [month, year]);

  const fetchDebts = async () => {
    try {
      setLoading(true);
      const response = await debtService.getAllDebts(month, year);
      setDebtData(response.data || []);
    } catch (error) {
      console.error('Error fetching debts:', error);
      alert('Lỗi khi tải danh sách công nợ');
    } finally {
      setLoading(false);
    }
  };

  const fetchSummary = async () => {
    try {
      const response = await debtService.getDebtSummary(month, year);
      setSummary(response.data || summary);
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

  // Auto-open view modal when ?debtId= is in URL (deep-link from notifications)
  const [searchParams, setSearchParams] = useSearchParams();
  useEffect(() => {
    const debtId = searchParams.get('debtId');
    if (!debtId) return;
    let cancelled = false;
    debtService
      .getDebtById(debtId)
      .then((res: any) => {
        if (cancelled) return;
        const debt = res?.data ?? res;
        if (debt && debt.id) {
          handleView(debt as Debt);
        }
        const next = new URLSearchParams(searchParams);
        next.delete('debtId');
        setSearchParams(next, { replace: true });
      })
      .catch((err) => {
        console.error('Error loading debt from URL:', err);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.get('debtId')]);

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



  const handleExportExcel = async () => {
    try {
      await debtService.exportToExcel();
      alert('Xuất file Excel thành công!');
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      alert('Lỗi khi xuất file Excel');
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

  const filterFields: FilterField[] = [
    {
      key: 'loaiChiPhi',
      label: 'Loại chi phí',
      type: 'select',
      options: [
        { value: 'Đơn hàng', label: 'Đơn hàng' },
        { value: 'Sửa chữa', label: 'Sửa chữa' },
        { value: 'Đầu tư', label: 'Đầu tư' },
        { value: 'Văn phòng phẩm', label: 'Văn phòng phẩm' },
        { value: 'Khác', label: 'Khác' },
      ],
    },
    {
      key: 'trangThaiThanhToan',
      label: 'Trạng thái thanh toán',
      type: 'select',
      options: [
        { value: 'chua', label: 'Chưa thanh toán' },
        { value: 'da', label: 'Đã thanh toán' },
      ],
    },
  ];

  const filteredDebtData = debtData.filter(item => {
    const search = filterValues._search.toLowerCase();
    if (search && !item.tenNhaCungCap.toLowerCase().includes(search) && !item.maNhaCungCap.toLowerCase().includes(search) && !(item.loaiChiPhi || '').toLowerCase().includes(search)) return false;
    if (filterValues.loaiChiPhi && item.loaiChiPhi !== filterValues.loaiChiPhi) return false;
    if (filterValues.trangThaiThanhToan === 'chua' && item.soTienDaThanhToan >= item.soTienPhaiTra) return false;
    if (filterValues.trangThaiThanhToan === 'da' && item.soTienDaThanhToan < item.soTienPhaiTra) return false;
    return true;
  });

  const totalItems = filteredDebtData.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const paginatedDebtData = filteredDebtData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Danh sách công nợ</h2>
        <div className="flex gap-2">
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Download className="h-4 w-4" />
            Xuất Excel
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Thêm mới
          </button>
        </div>
      </div>

      {/* Search & Filter */}
      <TableFilter
        filters={filterFields}
        values={filterValues}
        onChange={(vals) => { setFilterValues(vals); setCurrentPage(1); }}
        searchPlaceholder="Tìm kiếm mã, tên nhà cung cấp, loại chi phí..."
      />

      {/* Table */}
      <div className="overflow-x-auto">
        {loading ? (
          <div className="text-center py-8">
            <p className="text-gray-500">Đang tải...</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-300">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-r border-gray-200">STT</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-r border-gray-200">Ngày phát sinh</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-r border-gray-200">Loại chi phí</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-r border-gray-200">Số tiền phải trả</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-r border-gray-200">Số tiền đã thanh toán</th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Hoạt động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {paginatedDebtData.map((item, index) => (
                <tr
                  key={item.id}
                  onClick={() => handleView(item)}
                  className={`border-b border-gray-200 hover:bg-blue-100 border-l-2 border-l-transparent hover:border-l-blue-500 cursor-pointer transition-all ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                >
                  <td className="px-6 py-4 text-sm text-blue-600 font-medium border-r border-gray-200">{(currentPage - 1) * itemsPerPage + index + 1}</td>
                  <td className="px-6 py-4 text-sm text-gray-700 border-r border-gray-200">{formatDate(item.ngayPhatSinh)}</td>
                  <td className="px-6 py-4 text-sm text-gray-700 border-r border-gray-200">{item.loaiChiPhi || '-'}</td>
                  <td className="px-6 py-4 text-sm font-semibold text-red-600 border-r border-gray-200">{formatCurrency(item.soTienPhaiTra)}</td>
                  <td className="px-6 py-4 text-sm font-semibold text-green-600 border-r border-gray-200">{formatCurrency(item.soTienDaThanhToan)}</td>
                  <td className="px-6 py-4 text-sm">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}
                        className="p-1.5 rounded-md text-red-500 hover:bg-red-50 hover:text-red-700 transition-colors"
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
      {totalPages > 1 && (
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
                    className={`px-3 py-1.5 text-sm rounded-md ${
                      page === currentPage ? 'bg-blue-600 text-white' : 'border border-gray-300 hover:bg-gray-50'
                    }`}
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
      )}

      {/* Add Modal */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} showBackdrop>
        <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full flex flex-col max-h-[calc(100vh-2rem)]" onClick={(e) => e.stopPropagation()}>
            <div className="border-b px-6 py-4 flex items-center justify-between shrink-0">
              <h2 className="text-xl font-semibold text-gray-800">Thêm công nợ mới</h2>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Ngày phát sinh */}
                <div>
                  <DatePicker
                    label="Ngày phát sinh"
                    value={formData.ngayPhatSinh}
                    onChange={(date) => setFormData({ ...formData, ngayPhatSinh: date })}
                    required
                    placeholder="Chọn ngày phát sinh"
                    allowClear
                  />
                </div>

                {/* Loại chi phí */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Loại chi phí
                  </label>
                  <select
                    value={formData.loaiChiPhi}
                    onChange={(e) => setFormData({ ...formData, loaiChiPhi: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="">-- Chọn loại chi phí --</option>
                    <option value="Đơn hàng">Đơn hàng</option>
                    <option value="Sửa chữa">Sửa chữa</option>
                    <option value="Đầu tư">Đầu tư</option>
                    <option value="Văn phòng phẩm">Văn phòng phẩm</option>
                    <option value="Khác">Khác</option>
                  </select>
                </div>

                {/* Tên nhà cung cấp */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tên nhà cung cấp <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={formData.tenNhaCungCap}
                    onChange={(e) => {
                      const selected = suppliers.find(s => s.tenNhaCungCap === e.target.value);
                      setFormData({
                        ...formData,
                        tenNhaCungCap: e.target.value,
                        maNhaCungCap: selected ? selected.maNhaCungCap : '',
                      });
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="">-- Chọn nhà cung cấp --</option>
                    {suppliers.map(s => (
                      <option key={s.id} value={s.tenNhaCungCap}>{s.tenNhaCungCap}</option>
                    ))}
                  </select>
                </div>

                {/* Mã nhà cung cấp */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mã nhà cung cấp <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={formData.maNhaCungCap}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 cursor-not-allowed"
                    placeholder="Tự động điền"
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
                    <option value="Tổ chức">Tổ chức</option>
                    <option value="Hộ gia đình">Hộ gia đình</option>
                    <option value="Cá nhân">Cá nhân</option>
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
                    onChange={(e) => setFormData({ ...formData, soTienPhaiTra: parseNumberInputStr(e.target.value) })}
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
                    onChange={(e) => setFormData({ ...formData, soTienDaThanhToan: parseNumberInputStr(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="0"
                  />
                </div>

                {/* Ngày hoạch toán */}
                <div>
                  <DatePicker
                    label="Ngày hoạch toán"
                    value={formData.ngayHoachToan}
                    onChange={(date) => setFormData({ ...formData, ngayHoachToan: date })}
                    placeholder="Chọn ngày hoạch toán"
                    allowClear
                  />
                </div>

                {/* Ngày đến hạn */}
                <div>
                  <DatePicker
                    label="Ngày đến hạn"
                    value={formData.ngayDenHan}
                    onChange={(date) => setFormData({ ...formData, ngayDenHan: date })}
                    placeholder="Chọn ngày đến hạn"
                    allowClear
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

                {/* File đính kèm */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    File đính kèm
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="file"
                      onChange={handleFileChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 file:mr-4 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100"
                    />
                    {selectedFile && (
                      <span className="text-sm text-gray-600">{selectedFile.name}</span>
                    )}
                  </div>
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
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={isEditModalOpen && !!selectedDebt} onClose={() => { setIsEditModalOpen(false); setSelectedDebt(null); }} showBackdrop>
        <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full flex flex-col max-h-[calc(100vh-2rem)]" onClick={(e) => e.stopPropagation()}>
            <div className="border-b px-6 py-4 flex items-center justify-between shrink-0">
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

            <form onSubmit={handleUpdate} className="p-6 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Same form fields as Add Modal */}
                <div>
                  <DatePicker
                    label="Ngày phát sinh"
                    value={formData.ngayPhatSinh}
                    onChange={(date) => setFormData({ ...formData, ngayPhatSinh: date })}
                    required
                    placeholder="Chọn ngày phát sinh"
                    allowClear
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Loại chi phí
                  </label>
                  <select
                    value={formData.loaiChiPhi}
                    onChange={(e) => setFormData({ ...formData, loaiChiPhi: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="">-- Chọn loại chi phí --</option>
                    <option value="Đơn hàng">Đơn hàng</option>
                    <option value="Sửa chữa">Sửa chữa</option>
                    <option value="Đầu tư">Đầu tư</option>
                    <option value="Văn phòng phẩm">Văn phòng phẩm</option>
                    <option value="Khác">Khác</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tên nhà cung cấp <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={formData.tenNhaCungCap}
                    onChange={(e) => {
                      const selected = suppliers.find(s => s.tenNhaCungCap === e.target.value);
                      setFormData({
                        ...formData,
                        tenNhaCungCap: e.target.value,
                        maNhaCungCap: selected ? selected.maNhaCungCap : '',
                      });
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="">-- Chọn nhà cung cấp --</option>
                    {suppliers.map(s => (
                      <option key={s.id} value={s.tenNhaCungCap}>{s.tenNhaCungCap}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mã nhà cung cấp <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={formData.maNhaCungCap}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 cursor-not-allowed"
                    placeholder="Tự động điền"
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
                    <option value="Tổ chức">Tổ chức</option>
                    <option value="Hộ gia đình">Hộ gia đình</option>
                    <option value="Cá nhân">Cá nhân</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Số tiền phải trả
                  </label>
                  <input
                    type="number"
                    value={formData.soTienPhaiTra}
                    onChange={(e) => setFormData({ ...formData, soTienPhaiTra: parseNumberInputStr(e.target.value) })}
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
                    onChange={(e) => setFormData({ ...formData, soTienDaThanhToan: parseNumberInputStr(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <DatePicker
                    label="Ngày hoạch toán"
                    value={formData.ngayHoachToan}
                    onChange={(date) => setFormData({ ...formData, ngayHoachToan: date })}
                    placeholder="Chọn ngày hoạch toán"
                    allowClear
                  />
                </div>

                <div>
                  <DatePicker
                    label="Ngày đến hạn"
                    value={formData.ngayDenHan}
                    onChange={(date) => setFormData({ ...formData, ngayDenHan: date })}
                    placeholder="Chọn ngày đến hạn"
                    allowClear
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

                {/* File đính kèm */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    File đính kèm
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="file"
                      onChange={handleFileChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 file:mr-4 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100"
                    />
                    {selectedFile && (
                      <span className="text-sm text-gray-600">{selectedFile.name}</span>
                    )}
                  </div>
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
      </Modal>

      {/* View Modal */}
      <Modal isOpen={isViewModalOpen && !!selectedDebt} onClose={() => { setIsViewModalOpen(false); setSelectedDebt(null); }} showBackdrop closeOnBackdrop={true}>
        <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full flex flex-col max-h-[calc(100vh-2rem)]" onClick={(e) => e.stopPropagation()}>
            <div className="border-b px-6 py-4 flex items-center justify-between shrink-0">
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

            <div className="p-6 overflow-y-auto flex-1">
              {selectedDebt && (<>
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
                      selectedDebt.loaiHinh === 'Tổ chức' ? 'bg-blue-100 text-blue-800' :
                      selectedDebt.loaiHinh === 'Hộ gia đình' ? 'bg-green-100 text-green-800' :
                      selectedDebt.loaiHinh === 'Cá nhân' ? 'bg-purple-100 text-purple-800' :
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
              </>)}
            </div>
          </div>
      </Modal>
    </div>
  );
};

export default DebtManagement;

