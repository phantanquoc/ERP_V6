import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Download, Trash2 } from 'lucide-react';
import debtService, { Debt, DebtSummary } from '../services/debtService';
import { useSupplierOptions } from '../hooks/useSuppliers';
import DatePicker from './DatePicker';
import Modal from './Modal';
import { parseNumberInputStr } from '../utils/numberInput';
import TableFilter, { FilterField } from './TableFilter';
import StatusBadge, { BadgeTone } from './shared/StatusBadge';
import DataTable from '../design-system/DataTable';

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
      setDebtData(response.data as Debt[] || []);
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
      setSummary(response.data as DebtSummary || summary);
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
      await debtService.createDebt(formData as any);
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
      await debtService.updateDebt(selectedDebt.id, formData as any);
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

  const getDebtStatus = (item: Debt): string => {
    const fullyPaid = item.soTienDaThanhToan >= item.soTienPhaiTra && item.soTienPhaiTra > 0;
    if (fullyPaid) return 'Đã thanh toán';
    const overdue = item.ngayDenHan ? new Date(item.ngayDenHan).getTime() < Date.now() : false;
    if (overdue) return 'Quá hạn';
    return 'Chưa thanh toán';
  };

  const DEBT_STATUS_TONE: Record<string, BadgeTone> = {
    'Chưa thanh toán': 'yellow',
    'Đã thanh toán': 'green',
    'Quá hạn': 'red',
  };

  const LOAI_HINH_TONE: Record<string, BadgeTone> = {
    'Tổ chức': 'blue',
    'Hộ gia đình': 'green',
    'Cá nhân': 'yellow',
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

  const [sortKey, setSortKey] = useState<string | undefined>(undefined);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const handleSort = (key: string) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const filteredDebtData = debtData.filter(item => {
    const search = filterValues._search.toLowerCase();
    if (search && !item.tenNhaCungCap.toLowerCase().includes(search) && !item.maNhaCungCap.toLowerCase().includes(search) && !(item.loaiChiPhi || '').toLowerCase().includes(search)) return false;
    if (filterValues.loaiChiPhi && item.loaiChiPhi !== filterValues.loaiChiPhi) return false;
    if (filterValues.trangThaiThanhToan === 'chua' && item.soTienDaThanhToan >= item.soTienPhaiTra) return false;
    if (filterValues.trangThaiThanhToan === 'da' && item.soTienDaThanhToan < item.soTienPhaiTra) return false;
    return true;
  });

  const sortedDebtData = React.useMemo(() => {
    if (!sortKey) return filteredDebtData;
    const dir = sortDir === 'asc' ? 1 : -1;
    return [...filteredDebtData].sort((a: any, b: any) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
      return String(av).localeCompare(String(bv), 'vi') * dir;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredDebtData, sortKey, sortDir]);

  const totalItems = sortedDebtData.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const paginatedDebtData = sortedDebtData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // DataTable column definitions — maps the 7 original <th> headers to Column[]
  const columns: import('../design-system/DataTable').Column<Debt & Record<string, unknown>>[] = [
    {
      key: '_stt',
      header: 'STT',
      width: '60px',
      align: 'left' as const,
      render: (_: unknown, row: Record<string, unknown>) => (
        <span className="text-blue-600 font-medium">{String(row._stt ?? '—')}</span>
      ),
    },
    {
      key: 'ngayPhatSinh',
      header: 'Ngày phát sinh',
      sortable: true,
      render: (v: unknown) => <span className="whitespace-nowrap">{formatDate(v as string | undefined)}</span>,
    },
    {
      key: 'loaiChiPhi',
      header: 'Loại chi phí',
      sortable: true,
      render: (v: unknown) => (v as string) || '-',
    },
    {
      key: 'soTienPhaiTra',
      header: 'Số tiền phải trả',
      sortable: true,
      align: 'right' as const,
      render: (v: unknown) => <span className="font-semibold text-red-600">{formatCurrency((v as number) ?? 0)}</span>,
    },
    {
      key: 'soTienDaThanhToan',
      header: 'Số tiền đã thanh toán',
      sortable: true,
      align: 'right' as const,
      render: (v: unknown) => <span className="font-semibold text-green-600">{formatCurrency((v as number) ?? 0)}</span>,
    },
    {
      key: '_trangThai',
      header: 'Trạng thái',
      render: (_: unknown, row: Record<string, unknown>) => {
        const s = getDebtStatus(row as unknown as Debt);
        return <StatusBadge label={s} tone={DEBT_STATUS_TONE[s] ?? 'gray'} />;
      },
    },
    {
      key: '_actions',
      header: 'Hoạt động',
      align: 'center' as const,
      width: '90px',
      render: (_: unknown, row: Record<string, unknown>) => (
        <div className="flex items-center justify-center gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); handleDelete((row as unknown as Debt).id); }}
            className="p-1.5 rounded-md text-red-500 hover:bg-red-50 hover:text-red-700 transition-colors"
            title="Xóa"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  const paginatedWithStt = paginatedDebtData.map((row, idx) => ({
    ...row as unknown as Record<string, unknown>,
    _stt: (currentPage - 1) * itemsPerPage + idx + 1,
  })) as unknown as (Debt & Record<string, unknown>)[];

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

      <DataTable
        columns={columns}
        data={paginatedWithStt}
        loading={loading}
        sortKey={sortKey}
        sortDir={sortDir}
        onSort={handleSort}
        onRowClick={(row) => handleView(row as unknown as Debt)}
        emptyMessage="Chưa có dữ liệu công nợ"
        pagination={{ page: currentPage, totalPages, total: totalItems, onPageChange: setCurrentPage }}
      />

      {/* Add Modal */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} showBackdrop>
        <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full flex flex-col modal-viewport-h" onClick={(e) => e.stopPropagation()}>
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
                      const selected = suppliers.find((s: any) => s.tenNhaCungCap === e.target.value);
                      setFormData({
                        ...formData,
                        tenNhaCungCap: e.target.value,
                        maNhaCungCap: selected ? selected.maNhaCungCap : '',
                      });
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="">-- Chọn nhà cung cấp --</option>
                    {suppliers.map((s: any) => (
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
        <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full flex flex-col modal-viewport-h" onClick={(e) => e.stopPropagation()}>
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
                      const selected = suppliers.find((s: any) => s.tenNhaCungCap === e.target.value);
                      setFormData({
                        ...formData,
                        tenNhaCungCap: e.target.value,
                        maNhaCungCap: selected ? selected.maNhaCungCap : '',
                      });
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="">-- Chọn nhà cung cấp --</option>
                    {suppliers.map((s: any) => (
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
        <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full flex flex-col modal-viewport-h" onClick={(e) => e.stopPropagation()}>
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
                    <StatusBadge label={selectedDebt.loaiHinh || '-'} tone={selectedDebt.loaiHinh ? (LOAI_HINH_TONE[selectedDebt.loaiHinh] ?? 'gray') : 'gray'} />
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

