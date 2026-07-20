import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Edit, Eye, Trash2, Plus, X, Download, AlertCircle, CheckCircle, Upload, FileText } from 'lucide-react';
import Modal from './Modal';
import invoiceService, { Invoice } from '../services/invoiceService';
import TableFilter, { FilterField } from './TableFilter';
import DatePicker from './DatePicker';
import { useAuth } from '../contexts/AuthContext';
import internationalCustomerService from '../services/internationalCustomerService';
import { parseNumberInputStr } from '../utils/numberInput';
import { SERVER_BASE_URL } from '../config/api';

interface Customer {
  id: string;
  tenCongTy: string;
  maSoThue?: string;
  quocGia?: string;  // Khách hàng quốc tế
  tinhThanh?: string; // Khách hàng nội địa
}

const getFileName = (url: string) => {
  const parts = url.split('/');
  const filename = parts[parts.length - 1];
  return decodeURIComponent(filename.replace(/-\d+-\d+(?=\.)/, ''));
};

const getFullFileUrl = (url: string) => {
  if (url.startsWith('http')) return url;
  return `${SERVER_BASE_URL}${url}`;
};

interface InvoiceManagementProps {
  month?: number;
  year?: number;
}

const InvoiceManagement: React.FC<InvoiceManagementProps> = ({ month, year }) => {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [invoiceFiles, setInvoiceFiles] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [filterValues, setFilterValues] = useState<Record<string, string>>({ _search: '', loaiHoaDon: '', trangThai: '' });
  const [currentPage, setCurrentPage] = useState(1);
  const [exportLoading, setExportLoading] = useState(false);
  const [exportError, setExportError] = useState<string>('');
  const [exportSuccess, setExportSuccess] = useState<string>('');
  const itemsPerPage = 10;

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  // Form data
  const [formData, setFormData] = useState({
    soHoaDon: '',
    ngayLap: '',
    customerId: '',
    maSoThue: '',
    tongTien: '',
    thueVAT: '',
    thanhTien: '',
    trangThai: '',
    loaiHoaDon: '',
    phuongThucThanhToan: '',
    ngayThanhToan: '',
    nhanVienLap: '',
    ghiChu: '',
    boPhanSuDung: '',
    mucDichSuDung: '',
  });

  const filterFields: FilterField[] = [
    {
      key: 'loaiHoaDon',
      label: 'Loại hóa đơn',
      type: 'select',
      options: [
        { value: 'Bán hàng', label: 'Bán hàng' },
        { value: 'Mua hàng', label: 'Mua hàng' },
        { value: 'Dịch vụ', label: 'Dịch vụ' },
      ],
    },
    {
      key: 'trangThai',
      label: 'Trạng thái',
      type: 'select',
      options: [
        { value: 'Đã thanh toán', label: 'Đã thanh toán' },
        { value: 'Chưa thanh toán', label: 'Chưa thanh toán' },
        { value: 'Đang xử lý', label: 'Đang xử lý' },
      ],
    },
  ];

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const response = await invoiceService.getAllInvoices(1, 100, filterValues._search, month, year);
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
  const generateInvoiceNumber = async (): Promise<string> => {
    try {
      return await invoiceService.generateInvoiceNumber();
    } catch {
      // Fallback: find max from loaded invoices
      const matchingInvoices = invoices.filter(inv => inv.soHoaDon?.startsWith('HD-'));
      let maxNumber = 0;
      matchingInvoices.forEach(inv => {
        const parts = inv.soHoaDon.split('-');
        const num = parseInt(parts[parts.length - 1], 10);
        if (!isNaN(num) && num > maxNumber) maxNumber = num;
      });
      const year = new Date().getFullYear();
      return `HD-${year}-${String(maxNumber + 1).padStart(3, '0')}`;
    }
  };

  useEffect(() => {
    fetchInvoices();
    fetchCustomers();
  }, [month, year]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('vi-VN');
  };

  // Auto-calculate thanhTien from tongTien and thue
  const calcThanhTien = (tongTien: string, thue: string): string => {
    const t = parseFloat(tongTien) || 0;
    const v = parseFloat(thue) || 0;
    return String(t + (t * v / 100));
  };

  const handleFilesUpload = async (files: File[]) => {
    if (files.length === 0) return;
    setUploadingFiles(true);
    try {
      const response = await invoiceService.uploadFiles(files);
      if (response.success) {
        setInvoiceFiles(prev => [...prev, ...response.data.map(f => f.fileUrl)]);
      }
    } catch (error) {
      console.error('Error uploading files:', error);
      alert('Lỗi khi tải files lên');
    } finally {
      setUploadingFiles(false);
    }
  };

  const handleRemoveFile = (index: number) => {
    setInvoiceFiles(prev => prev.filter((_, i) => i !== index));
  };

  const resetFormData = () => {
    setFormData({
      soHoaDon: '',
      ngayLap: '',
      customerId: '',
      maSoThue: '',
      tongTien: '',
      thueVAT: '',
      thanhTien: '',
      trangThai: '',
      loaiHoaDon: '',
      phuongThucThanhToan: '',
      ngayThanhToan: '',
      nhanVienLap: '',
      ghiChu: '',
      boPhanSuDung: '',
      mucDichSuDung: '',
    });
    setInvoiceFiles([]);
  };

  const handleAddClick = async () => {
    // Auto-fill số hóa đơn và nhân viên lập
    const autoInvoiceNumber = await generateInvoiceNumber();
    const employeeName = user ? `${user.lastName} ${user.firstName}` : '';

    setFormData({
      soHoaDon: autoInvoiceNumber,
      ngayLap: new Date().toISOString().split('T')[0],
      customerId: '',
      maSoThue: '',
      tongTien: '',
      thueVAT: '',
      thanhTien: '',
      trangThai: 'Chưa thanh toán',
      loaiHoaDon: '',
      phuongThucThanhToan: '',
      ngayThanhToan: '',
      nhanVienLap: employeeName,
      ghiChu: '',
      boPhanSuDung: '',
      mucDichSuDung: '',
    });
    setInvoiceFiles([]);
    setIsAddModalOpen(true);
  };

  const handleMuaNhanhClick = async () => {
    const autoInvoiceNumber = await generateInvoiceNumber();
    const employeeName = user ? `${user.lastName} ${user.firstName}` : '';

    setFormData({
      soHoaDon: autoInvoiceNumber,
      ngayLap: new Date().toISOString().split('T')[0],
      customerId: '',
      maSoThue: '',
      tongTien: '',
      thueVAT: '',
      thanhTien: '',
      trangThai: 'Chưa thanh toán',
      loaiHoaDon: 'Mua hàng',
      phuongThucThanhToan: '',
      ngayThanhToan: '',
      nhanVienLap: employeeName,
      ghiChu: '',
      boPhanSuDung: user?.department || '',
      mucDichSuDung: '',
    });
    setInvoiceFiles([]);
    setIsAddModalOpen(true);
  };

  const handleEditClick = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setFormData({
      soHoaDon: invoice.soHoaDon || '',
      ngayLap: invoice.ngayLap || '',
      customerId: invoice.customerId || '',
      maSoThue: invoice.maSoThue || '',
      tongTien: String(invoice.tongTien || ''),
      thueVAT: String(invoice.thueVAT || ''),
      thanhTien: String(invoice.thanhTien || ''),
      trangThai: invoice.trangThai || '',
      loaiHoaDon: invoice.loaiHoaDon || '',
      phuongThucThanhToan: invoice.phuongThucThanhToan || '',
      ngayThanhToan: invoice.ngayThanhToan || '',
      nhanVienLap: invoice.nhanVienLap || '',
      ghiChu: invoice.ghiChu || '',
      boPhanSuDung: invoice.boPhanSuDung || '',
      mucDichSuDung: invoice.mucDichSuDung || '',
    });
    setInvoiceFiles(invoice.files || []);
    setIsEditModalOpen(true);
  };

  const handleViewClick = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setIsViewModalOpen(true);
  };

  // Auto-open view modal when ?invoiceId= is in URL (deep-link from notifications)
  const [searchParams, setSearchParams] = useSearchParams();
  useEffect(() => {
    const invoiceId = searchParams.get('invoiceId');
    if (!invoiceId) return;
    let cancelled = false;
    invoiceService
      .getInvoiceById(invoiceId)
      .then((invoice) => {
        if (cancelled) return;
        if (invoice && (invoice as any).id) {
          handleViewClick(invoice);
        }
        const next = new URLSearchParams(searchParams);
        next.delete('invoiceId');
        setSearchParams(next, { replace: true });
      })
      .catch((err) => {
        console.error('Error loading invoice from URL:', err);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.get('invoiceId')]);

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
        thueVAT: Number(formData.thueVAT) || 0,
        thanhTien: Number(formData.thanhTien) || 0,
        ngayThanhToan: formData.ngayThanhToan || null,
        files: invoiceFiles,
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
        thueVAT: Number(formData.thueVAT) || 0,
        thanhTien: Number(formData.thanhTien) || 0,
        ngayThanhToan: formData.ngayThanhToan || null,
        files: invoiceFiles,
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

  const filteredInvoices = invoices.filter(invoice => {
    const search = filterValues._search.toLowerCase();
    if (search && !invoice.soHoaDon?.toLowerCase().includes(search) && !invoice.customer?.tenCongTy?.toLowerCase().includes(search)) return false;
    if (filterValues.loaiHoaDon && invoice.loaiHoaDon !== filterValues.loaiHoaDon) return false;
    if (filterValues.trangThai && invoice.trangThai !== filterValues.trangThai) return false;
    return true;
  });

  const handleExportExcel = async () => {
    try {
      setExportError('');
      setExportLoading(true);
      await invoiceService.exportToExcel({ search: filterValues._search || undefined });
      setExportSuccess('Đã xuất file Excel thành công');
      setTimeout(() => setExportSuccess(''), 3000);
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      setExportError('Không thể xuất file Excel');
    } finally {
      setExportLoading(false);
    }
  };

  const totalItems = filteredInvoices.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const paginatedInvoices = filteredInvoices.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Quản lý hóa đơn</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportExcel}
            disabled={exportLoading}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            <Download size={18} />
            {exportLoading ? 'Đang xuất...' : 'Xuất Excel'}
          </button>
          <button
            onClick={handleMuaNhanhClick}
            className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Hóa đơn mua nhanh
          </button>
          <button
            onClick={handleAddClick}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Thêm hóa đơn
          </button>
        </div>
      </div>

      {/* Search & Filter */}
      <TableFilter
        filters={filterFields}
        values={filterValues}
        onChange={(vals) => { setFilterValues(vals); setCurrentPage(1); }}
        searchPlaceholder="Tìm kiếm số hóa đơn, khách hàng..."
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
        <table className="w-full">
          <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-300">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-r border-gray-200">STT</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-r border-gray-200">Số hóa đơn</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-r border-gray-200">Ngày lập</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-r border-gray-200">Khách hàng</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-r border-gray-200">Loại hóa đơn</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-r border-gray-200">Thành tiền</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-r border-gray-200">Trạng thái</th>
              <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Hoạt động</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={8} className="px-6 py-8 text-center text-gray-500">Đang tải...</td>
              </tr>
            ) : filteredInvoices.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-8 text-center text-gray-500">Không có dữ liệu</td>
              </tr>
            ) : (
              paginatedInvoices.map((invoice, index) => (
                <tr
                  key={invoice.id}
                  onClick={() => handleViewClick(invoice)}
                  className={`border-b border-gray-200 hover:bg-blue-100 border-l-2 border-l-transparent hover:border-l-blue-500 cursor-pointer transition-all ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                >
                  <td className="px-6 py-4 text-sm text-blue-600 font-medium border-r border-gray-200">{(currentPage - 1) * itemsPerPage + index + 1}</td>
                  <td className="px-6 py-4 text-sm font-semibold text-blue-600 border-r border-gray-200">{invoice.soHoaDon}</td>
                  <td className="px-6 py-4 text-sm text-gray-700 border-r border-gray-200">{formatDate(invoice.ngayLap)}</td>
                  <td className="px-6 py-4 text-sm text-gray-700 border-r border-gray-200">{invoice.customer?.tenCongTy || '-'}</td>
                  <td className="px-6 py-4 text-sm text-gray-700 border-r border-gray-200">{invoice.loaiHoaDon}</td>
                  <td className="px-6 py-4 text-sm font-semibold text-gray-900 border-r border-gray-200">{formatCurrency(invoice.thanhTien)}</td>
                  <td className="px-6 py-4 text-sm border-r border-gray-200">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      invoice.trangThai === 'Đã thanh toán' ? 'bg-green-100 text-green-800' :
                      invoice.trangThai === 'Chưa thanh toán' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {invoice.trangThai}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={(e) => { e.stopPropagation(); handleDeleteClick(invoice); }} className="p-1.5 rounded-md text-red-500 hover:bg-red-50 hover:text-red-700 transition-colors" title="Xóa">
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
              <h2 className="text-xl font-semibold text-gray-800">Thêm hóa đơn mới</h2>
              <button onClick={() => setIsAddModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleSubmitAdd} className="overflow-y-auto flex-1 p-6">
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Khách hàng</label>
                  <select
                    value={formData.customerId}
                    onChange={(e) => {
                      const selectedCustomer = customers.find(c => c.id === e.target.value);
                      setFormData({
                        ...formData,
                        customerId: e.target.value,
                        maSoThue: selectedCustomer?.maSoThue || ''
                      });
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="">-- Chọn khách hàng --</option>
                    {customers.map((customer) => (
                      <option key={customer.id} value={customer.id}>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bộ phận sử dụng</label>
                  <input type="text" value={formData.boPhanSuDung} onChange={(e) => setFormData({ ...formData, boPhanSuDung: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500" placeholder="VD: Phòng sản xuất, Phòng kinh doanh..." />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mục đích sử dụng</label>
                  <input type="text" value={formData.mucDichSuDung} onChange={(e) => setFormData({ ...formData, mucDichSuDung: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500" placeholder="VD: Mua nguyên liệu sản xuất tháng 6..." />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tổng tiền</label>
                  <input type="number" value={formData.tongTien} onChange={(e) => {
                    const tongTien = parseNumberInputStr(e.target.value);
                    setFormData(prev => ({ ...prev, tongTien, thanhTien: calcThanhTien(tongTien, prev.thueVAT) }));
                  }} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Thuế VAT (%)</label>
                  <input type="number" value={formData.thueVAT} onChange={(e) => {
                    const thue = parseNumberInputStr(e.target.value);
                    setFormData(prev => ({ ...prev, thueVAT: thue, thanhTien: calcThanhTien(prev.tongTien, thue) }));
                  }} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Thành tiền</label>
                  <input type="number" value={formData.thanhTien} onChange={(e) => setFormData({ ...formData, thanhTien: parseNumberInputStr(e.target.value) })} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500" />
                  <p className="text-xs text-gray-500 mt-1">Tự động tính từ tổng tiền + thuế, có thể sửa thủ công</p>
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
                  <textarea value={formData.ghiChu} onChange={(e) => setFormData({ ...formData, ghiChu: e.target.value })} rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500" placeholder="VD: tên từng loại sản phẩm - giá tiền từng món - thuế (tùy sản phẩm có hay không) - các chi phí liên quan (vận chuyển,...)" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tài liệu đính kèm</label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files && e.target.files.length > 0) {
                          handleFilesUpload(Array.from(e.target.files));
                          e.target.value = '';
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingFiles}
                      className="flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm disabled:opacity-50"
                    >
                      <Upload className="w-4 h-4" />
                      {uploadingFiles ? 'Đang tải...' : 'Chọn file'}
                    </button>
                    {invoiceFiles.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {invoiceFiles.map((fileUrl, idx) => (
                          <div key={idx} className="flex items-center gap-2 bg-gray-50 rounded px-3 py-2">
                            <FileText className="w-4 h-4 text-blue-500 flex-shrink-0" />
                            <a href={getFullFileUrl(fileUrl)} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline truncate flex-1">{getFileName(fileUrl)}</a>
                            <button type="button" onClick={() => handleRemoveFile(idx)} className="text-red-400 hover:text-red-600 flex-shrink-0">
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6 shrink-0">
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">Hủy</button>
                <button type="submit" disabled={loading} className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50">{loading ? 'Đang xử lý...' : 'Thêm hóa đơn'}</button>
              </div>
            </form>
          </div>
        </Modal>


      {/* Edit Modal */}
      <Modal isOpen={isEditModalOpen && !!selectedInvoice} onClose={() => setIsEditModalOpen(false)} showBackdrop>
        <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full flex flex-col max-h-[calc(100vh-2rem)]" onClick={(e) => e.stopPropagation()}>
          <div className="border-b px-6 py-4 flex items-center justify-between shrink-0">
              <h2 className="text-xl font-semibold text-gray-800">Chỉnh sửa hóa đơn</h2>
              <button onClick={() => setIsEditModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleSubmitEdit} className="overflow-y-auto flex-1 p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Số hóa đơn <span className="text-red-500">*</span></label>
                  <input type="text" required readOnly value={formData.soHoaDon} className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600 cursor-not-allowed" />
                </div>
                <div>
                  <DatePicker label="Ngày lập" value={formData.ngayLap} onChange={(date) => setFormData({ ...formData, ngayLap: date })} required placeholder="Chọn ngày lập" allowClear />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Khách hàng</label>
                  <select
                    value={formData.customerId}
                    onChange={(e) => {
                      const selectedCustomer = customers.find(c => c.id === e.target.value);
                      setFormData({
                        ...formData,
                        customerId: e.target.value,
                        maSoThue: selectedCustomer?.maSoThue || ''
                      });
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="">-- Chọn khách hàng --</option>
                    {customers.map((customer) => (
                      <option key={customer.id} value={customer.id}>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bộ phận sử dụng</label>
                  <input type="text" value={formData.boPhanSuDung} onChange={(e) => setFormData({ ...formData, boPhanSuDung: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500" placeholder="VD: Phòng sản xuất, Phòng kinh doanh..." />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mục đích sử dụng</label>
                  <input type="text" value={formData.mucDichSuDung} onChange={(e) => setFormData({ ...formData, mucDichSuDung: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500" placeholder="VD: Mua nguyên liệu sản xuất tháng 6..." />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tổng tiền</label>
                  <input type="number" value={formData.tongTien} onChange={(e) => {
                    const tongTien = parseNumberInputStr(e.target.value);
                    setFormData(prev => ({ ...prev, tongTien, thanhTien: calcThanhTien(tongTien, prev.thueVAT) }));
                  }} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Thuế VAT (%)</label>
                  <input type="number" value={formData.thueVAT} onChange={(e) => {
                    const thue = parseNumberInputStr(e.target.value);
                    setFormData(prev => ({ ...prev, thueVAT: thue, thanhTien: calcThanhTien(prev.tongTien, thue) }));
                  }} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Thành tiền</label>
                  <input type="number" value={formData.thanhTien} onChange={(e) => setFormData({ ...formData, thanhTien: parseNumberInputStr(e.target.value) })} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500" />
                  <p className="text-xs text-gray-500 mt-1">Tự động tính từ tổng tiền + thuế, có thể sửa thủ công</p>
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
                  <textarea value={formData.ghiChu} onChange={(e) => setFormData({ ...formData, ghiChu: e.target.value })} rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500" placeholder="VD: tên từng loại sản phẩm - giá tiền từng món - thuế (tùy sản phẩm có hay không) - các chi phí liên quan (vận chuyển,...)" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tài liệu đính kèm</label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files && e.target.files.length > 0) {
                          handleFilesUpload(Array.from(e.target.files));
                          e.target.value = '';
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingFiles}
                      className="flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm disabled:opacity-50"
                    >
                      <Upload className="w-4 h-4" />
                      {uploadingFiles ? 'Đang tải...' : 'Chọn file'}
                    </button>
                    {invoiceFiles.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {invoiceFiles.map((fileUrl, idx) => (
                          <div key={idx} className="flex items-center gap-2 bg-gray-50 rounded px-3 py-2">
                            <FileText className="w-4 h-4 text-blue-500 flex-shrink-0" />
                            <a href={getFullFileUrl(fileUrl)} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline truncate flex-1">{getFileName(fileUrl)}</a>
                            <button type="button" onClick={() => handleRemoveFile(idx)} className="text-red-400 hover:text-red-600 flex-shrink-0">
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6 shrink-0">
                <button type="button" onClick={() => setIsEditModalOpen(false)} className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">Hủy</button>
                <button type="submit" disabled={loading} className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50">{loading ? 'Đang xử lý...' : 'Cập nhật'}</button>
              </div>
            </form>
          </div>
        </Modal>

      {/* View Modal */}
      <Modal isOpen={isViewModalOpen && !!selectedInvoice} onClose={() => setIsViewModalOpen(false)} showBackdrop closeOnBackdrop={true}>
        <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full flex flex-col max-h-[calc(100vh-2rem)]" onClick={(e) => e.stopPropagation()}>
          <div className="border-b px-6 py-4 flex items-center justify-between shrink-0">
              <h2 className="text-xl font-semibold text-gray-800">Chi tiết hóa đơn</h2>
              <button onClick={() => setIsViewModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 p-6">
              {selectedInvoice && (<>
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
                  <p className="text-gray-900">{selectedInvoice.customer?.tenCongTy || '-'}</p>
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
                  <p className="text-orange-600 font-medium">{selectedInvoice.thueVAT}%</p>
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
                {selectedInvoice.boPhanSuDung && (
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <label className="block text-sm font-medium text-gray-500 mb-1">Bộ phận sử dụng</label>
                    <p className="text-gray-900">{selectedInvoice.boPhanSuDung}</p>
                  </div>
                )}
                {selectedInvoice.mucDichSuDung && (
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <label className="block text-sm font-medium text-gray-500 mb-1">Mục đích sử dụng</label>
                    <p className="text-gray-900">{selectedInvoice.mucDichSuDung}</p>
                  </div>
                )}
                {selectedInvoice.customer?.tenCongTy && selectedInvoice.loaiHoaDon === 'Mua hàng' && (
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <label className="block text-sm font-medium text-gray-500 mb-1">Nhà cung cấp</label>
                    <p className="text-gray-900">{selectedInvoice.customer?.tenCongTy}</p>
                  </div>
                )}
                {selectedInvoice.files && selectedInvoice.files.length > 0 && (
                  <div className="bg-gray-50 p-3 rounded-lg md:col-span-2">
                    <label className="block text-sm font-medium text-gray-500 mb-2">Tài liệu đính kèm</label>
                    <div className="space-y-2">
                      {selectedInvoice.files.map((fileUrl, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-blue-500 flex-shrink-0" />
                          <a href={getFullFileUrl(fileUrl)} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline truncate">{getFileName(fileUrl)}</a>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-3 mt-6 shrink-0">
                <button onClick={() => setIsViewModalOpen(false)} className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">Đóng</button>
                <button onClick={() => { setIsViewModalOpen(false); if (selectedInvoice) handleEditClick(selectedInvoice); }} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Chỉnh sửa</button>
              </div>
              </>)}
            </div>
          </div>
        </Modal>
    </div>
  );
};

export default InvoiceManagement;