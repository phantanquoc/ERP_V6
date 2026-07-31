import React, { useState, useEffect } from 'react';
import { Plus, FileText, Eye, Pencil, Trash2 } from 'lucide-react';
import Modal from './Modal';
import { useQueryClient } from '@tanstack/react-query';
import warehouseReceiptService, { WarehouseReceipt } from '../services/warehouseReceiptService';
import warehouseService, { Warehouse, Lot, LotProduct } from '../services/warehouseService';
import { useAuth } from '../contexts/AuthContext';
import { parseNumberInput } from '../utils/numberInput';
import TableFilter, { FilterField } from './TableFilter';
import { warehouseKeys, useProducts } from '../hooks';
import ProductCombobox from './common/ProductCombobox';
import UnitSelect from './common/UnitSelect';
import { DON_VI_TINH_OPTIONS } from '../constants/units';

/** Purpose presets — cover the common cases; the field stays free text for the rest. */
const MUC_DICH_PRESETS = [
  'Nhập từ thu mua',
  'Nhập thành phẩm sản xuất',
  'Nhập trả lại từ bộ phận',
  'Nhập điều chuyển kho',
  'Kiểm kê điều chỉnh',
];

interface WarehouseReceiptTabProps {
  month?: number;
  year?: number;
}

const WarehouseReceiptTab: React.FC<WarehouseReceiptTabProps> = ({ month, year }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [receipts, setReceipts] = useState<WarehouseReceipt[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [lots, setLots] = useState<Lot[]>([]);
  const [lotProducts, setLotProducts] = useState<LotProduct[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<WarehouseReceipt | null>(null);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [filterValues, setFilterValues] = useState<Record<string, string>>({ _search: '', maPhieuNhap: '', tenNhanVien: '', tenKho: '', tenSanPham: '' });
  const receiptFilterFields: FilterField[] = [
    { key: 'maPhieuNhap', label: 'Mã phiếu', type: 'text' },
    { key: 'tenNhanVien', label: 'Mã nhân viên', type: 'text' },
    { key: 'tenKho', label: 'Kho', type: 'text' },
    { key: 'tenSanPham', label: 'Sản phẩm', type: 'text' },
  ];

  const handleViewDetail = (receipt: WarehouseReceipt) => {
    setSelectedReceipt(receipt);
    setShowDetailModal(true);
  };

  // Product catalogue for the searchable picker (supports adding a product new to the lot)
  const { data: productsData } = useProducts({ page: 1, limit: 1000 });
  const allProducts = productsData?.data || [];

  const [formData, setFormData] = useState({
    maPhieuNhap: '',
    warehouseId: '',
    lotId: '',
    lotProductId: '',
    // Product identity — set when adding a product not yet in the lot.
    // lotProductId stays empty in that case; the backend resolves/creates it.
    internationalProductId: '',
    tenSanPham: '',
    loaiSanPham: '',
    donViTinh: '',
    soLuongNhap: 0,
    ghiChu: '',
    mucDich: '',
  });

  useEffect(() => {
    fetchReceipts();
    fetchWarehouses();
  }, []);

  const fetchReceipts = async () => {
    try {
      const response = await warehouseReceiptService.getAllWarehouseReceipts();
      console.log('Receipts response:', response);
      // Kiểm tra nếu response.data là object có property data
      if (response.data && Array.isArray(response.data.data)) {
        setReceipts(response.data.data);
      } else if (Array.isArray(response.data)) {
        setReceipts(response.data);
      } else {
        console.error('Unexpected receipts response format:', response.data);
        setReceipts([]);
      }
    } catch (error: any) {
      console.error('Error fetching receipts:', error);
      setReceipts([]);
    }
  };

  const fetchWarehouses = async () => {
    try {
      const response = await warehouseService.getAllWarehouses();
      console.log('Warehouses response:', response);
      // Kiểm tra nếu response.data là object có property data
      if (response.data && Array.isArray(response.data.data)) {
        setWarehouses(response.data.data);
      } else if (Array.isArray(response.data)) {
        setWarehouses(response.data);
      } else {
        console.error('Unexpected warehouses response format:', response.data);
        setWarehouses([]);
      }
    } catch (error: any) {
      console.error('Error fetching warehouses:', error);
      setWarehouses([]);
    }
  };

  const handleWarehouseChange = (warehouseId: string) => {
    setFormData({ ...formData, warehouseId, lotId: '', lotProductId: '' });
    const warehouse = warehouses.find(w => w.id === warehouseId);
    setLots(warehouse?.lots || []);
    setLotProducts([]);
  };

  const handleLotChange = (lotId: string) => {
    setFormData({ ...formData, lotId, lotProductId: '' });
    const lot = lots.find(l => l.id === lotId);
    setLotProducts(lot?.lotProducts || []);
  };

  const handleOpenModal = async () => {
    try {
      const response = await warehouseReceiptService.generateReceiptCode();
      setEditingId(null);
      setFormData({
        maPhieuNhap: response.data.code,
        warehouseId: '',
        lotId: '',
        lotProductId: '',
        internationalProductId: '',
        tenSanPham: '',
        loaiSanPham: '',
        donViTinh: '',
        soLuongNhap: 0,
        ghiChu: '',
        mucDich: '',
      });
      setShowModal(true);
    } catch (error: any) {
      alert('Lỗi khi tạo mã phiếu nhập');
    }
  };

  const handleEdit = (receipt: WarehouseReceipt) => {
    setEditingId(receipt.id);
    setFormData({
      maPhieuNhap: receipt.maPhieuNhap,
      warehouseId: receipt.warehouseId,
      lotId: receipt.lotId,
      lotProductId: receipt.lotProductId,
      internationalProductId: '',
      tenSanPham: receipt.tenSanPham || '',
      loaiSanPham: '',
      donViTinh: receipt.donViTinh || '',
      soLuongNhap: receipt.soLuongNhap,
      ghiChu: receipt.ghiChu || '',
      mucDich: receipt.mucDich || '',
    });
    // Set lots and lotProducts based on current receipt's warehouse/lot
    const warehouse = warehouses.find(w => w.id === receipt.warehouseId);
    setLots(warehouse?.lots || []);
    const lot = warehouse?.lots?.find(l => l.id === receipt.lotId);
    setLotProducts(lot?.lotProducts || []);
    setShowModal(true);
  };

  const handleDelete = async (receipt: WarehouseReceipt) => {
    if (!confirm('Bạn có chắc chắn muốn xóa phiếu nhập kho này?')) return;
    try {
      await warehouseReceiptService.deleteWarehouseReceipt(receipt.id);
      alert('Xóa phiếu nhập kho thành công!');
      fetchReceipts();
      fetchWarehouses();
      queryClient.invalidateQueries({ queryKey: warehouseKeys.lists() });
      queryClient.invalidateQueries({ queryKey: warehouseKeys.receiptHistories() });
    } catch (error: any) {
      alert(error.response?.data?.message || 'Lỗi khi xóa phiếu nhập kho');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.warehouseId || !formData.lotId) {
      alert('Vui lòng chọn kho và lô');
      return;
    }
    // Either an existing kiện in the lot, or a product name for a new one
    if (!formData.lotProductId && !formData.tenSanPham) {
      alert('Vui lòng chọn hàng hóa hoặc nhập tên hàng hóa mới');
      return;
    }

    setLoading(true);
    try {
      const warehouse = warehouses.find(w => w.id === formData.warehouseId);
      const lot = lots.find(l => l.id === formData.lotId);
      const lotProduct = lotProducts.find(lp => lp.id === formData.lotProductId);

      if (editingId) {
        await warehouseReceiptService.updateWarehouseReceipt(editingId, {
          warehouseId: formData.warehouseId,
          tenKho: warehouse?.tenKho || '',
          lotId: formData.lotId,
          tenLo: lot?.tenLo || '',
          lotProductId: formData.lotProductId,
          tenSanPham: lotProduct?.internationalProduct?.tenSanPham || formData.tenSanPham,
          soLuongNhap: formData.soLuongNhap,
          donViTinh: lotProduct?.donViTinh || formData.donViTinh,
          ghiChu: formData.ghiChu,
          mucDich: formData.mucDich || undefined,
        });
        alert('Cập nhật phiếu nhập kho thành công!');
      } else {
        await warehouseReceiptService.createWarehouseReceipt({
          maPhieuNhap: formData.maPhieuNhap,
          employeeId: user?.employeeId || '',
          maNhanVien: user?.employeeCode || '',
          tenNhanVien: `${user?.lastName} ${user?.firstName}`,
          warehouseId: formData.warehouseId,
          tenKho: warehouse?.tenKho || '',
          lotId: formData.lotId,
          tenLo: lot?.tenLo || '',
          // Omit when adding a product not yet in the lot — backend resolves/creates it
          lotProductId: formData.lotProductId || undefined,
          tenSanPham: lotProduct?.internationalProduct?.tenSanPham || formData.tenSanPham,
          soLuongNhap: formData.soLuongNhap,
          donViTinh: lotProduct?.donViTinh || formData.donViTinh,
          ghiChu: formData.ghiChu,
          mucDich: formData.mucDich || undefined,
          loaiSanPham: formData.loaiSanPham || undefined,
        });
        alert('Tạo phiếu nhập kho thành công!');
      }

      setShowModal(false);
      setEditingId(null);
      fetchReceipts();
      fetchWarehouses(); // Refresh to get updated quantities
      queryClient.invalidateQueries({ queryKey: warehouseKeys.lists() });
      queryClient.invalidateQueries({ queryKey: warehouseKeys.receiptHistories() });
    } catch (error: any) {
      alert(error.response?.data?.message || 'Lỗi khi xử lý phiếu nhập kho');
    } finally {
      setLoading(false);
    }
  };

  const filteredReceipts = receipts.filter((r) => {
    // Period filter
    if (month || year) {
      const date = new Date(r.ngayNhap);
      if (month && (date.getMonth() + 1) !== month) return false;
      if (year && date.getFullYear() !== year) return false;
    }
    const search = (filterValues._search || '').toLowerCase().trim();
    if (search) {
      const matchSearch =
        (r.maPhieuNhap || '').toLowerCase().includes(search) ||
        (r.tenNhanVien || '').toLowerCase().includes(search) ||
        (r.maNhanVien || '').toLowerCase().includes(search) ||
        (r.tenKho || '').toLowerCase().includes(search) ||
        (r.tenLo || '').toLowerCase().includes(search) ||
        (r.tenSanPham || '').toLowerCase().includes(search);
      if (!matchSearch) return false;
    }
    if (filterValues.maPhieuNhap && !(r.maPhieuNhap || '').toLowerCase().includes(filterValues.maPhieuNhap.toLowerCase())) return false;
    if (filterValues.tenNhanVien && !(r.tenNhanVien || '').toLowerCase().includes(filterValues.tenNhanVien.toLowerCase())) return false;
    if (filterValues.tenKho && !(r.tenKho || '').toLowerCase().includes(filterValues.tenKho.toLowerCase())) return false;
    if (filterValues.tenSanPham && !(r.tenSanPham || '').toLowerCase().includes(filterValues.tenSanPham.toLowerCase())) return false;
    return true;
  });

  const totalPages = Math.ceil(filteredReceipts.length / itemsPerPage);
  const paginatedReceipts = filteredReceipts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Phiếu nhập kho</h2>
        <button
          onClick={handleOpenModal}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2 w-full sm:w-auto"
        >
          <Plus className="h-5 w-5" />
          Tạo phiếu nhập
        </button>
      </div>

      {/* Receipts Table */}
      <TableFilter
        filters={receiptFilterFields}
        values={filterValues}
        onChange={(vals) => { setFilterValues(vals); setCurrentPage(1); }}
        searchPlaceholder="Tìm kiếm phiếu nhập..."
      />
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] border-collapse">
          <thead>
            <tr className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-300">
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Mã phiếu</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Ngày nhập</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Mã nhân viên</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Kho</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Lô</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Sản phẩm</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Số lượng nhập</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {filteredReceipts.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-4 text-center text-gray-500">
                  Chưa có phiếu nhập kho nào
                </td>
              </tr>
            ) : (
              paginatedReceipts.map((receipt, index) => (
                <tr key={receipt.id} className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition-colors border-b border-gray-200`}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 border-r border-gray-200">
                    {receipt.maPhieuNhap}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 border-r border-gray-200">
                    {new Date(receipt.ngayNhap).toLocaleDateString('vi-VN')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 border-r border-gray-200">
                    {receipt.tenNhanVien}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 border-r border-gray-200">
                    {receipt.tenKho}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 border-r border-gray-200">
                    {receipt.tenLo}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 border-r border-gray-200">
                    {receipt.tenSanPham}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 border-r border-gray-200">
                    {receipt.soLuongNhap} {receipt.donViTinh}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleViewDetail(receipt)}
                        className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-md transition-colors"
                        title="Xem chi tiết"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                      {!receipt.isLocked && (
                        <>
                          <button
                            onClick={() => handleEdit(receipt)}
                            className="p-1.5 text-amber-600 hover:bg-amber-100 rounded-md transition-colors"
                            title="Chỉnh sửa"
                          >
                            <Pencil className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleDelete(receipt)}
                            className="p-1.5 text-red-600 hover:bg-red-100 rounded-md transition-colors"
                            title="Xóa"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </>
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

      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-4 px-2">
          <span className="text-sm text-gray-600">
            Hiển thị {(currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, filteredReceipts.length)} / {filteredReceipts.length} mục
          </span>
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

      {/* Detail Modal */}
      <Modal isOpen={showDetailModal && !!selectedReceipt} onClose={() => setShowDetailModal(false)} showBackdrop closeOnBackdrop={true}>
        <div className="bg-white rounded-lg shadow-xl w-[calc(100vw-2rem)] sm:w-[600px] flex flex-col max-h-[calc(100vh-2rem)]" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between border-b px-6 py-4 shrink-0">
              <h2 className="text-xl font-bold text-gray-900">Chi tiết phiếu nhập kho</h2>
              <button
                onClick={() => setShowDetailModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          <div className="overflow-y-auto flex-1 p-6">
            {selectedReceipt && (<>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-2 text-blue-800 font-semibold text-lg">
                <FileText className="h-5 w-5" />
                {selectedReceipt.maPhieuNhap}
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <label className="text-xs text-gray-500 uppercase font-medium">Ngày nhập</label>
                  <p className="text-sm font-semibold text-gray-900 mt-1">
                    {new Date(selectedReceipt.ngayNhap).toLocaleDateString('vi-VN', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <label className="text-xs text-gray-500 uppercase font-medium">Nhân viên thực hiện</label>
                  <p className="text-sm font-semibold text-gray-900 mt-1">{selectedReceipt.tenNhanVien}</p>
                  <p className="text-xs text-gray-500">{selectedReceipt.maNhanVien}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <label className="text-xs text-gray-500 uppercase font-medium">Kho</label>
                  <p className="text-sm font-semibold text-gray-900 mt-1">{selectedReceipt.tenKho}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <label className="text-xs text-gray-500 uppercase font-medium">Lô hàng</label>
                  <p className="text-sm font-semibold text-gray-900 mt-1">{selectedReceipt.tenLo}</p>
                </div>
              </div>

              <div className="bg-gray-50 p-3 rounded-lg">
                <label className="text-xs text-gray-500 uppercase font-medium">Sản phẩm</label>
                <p className="text-sm font-semibold text-gray-900 mt-1">{selectedReceipt.tenSanPham}</p>
              </div>

              {/* Lịch sử biến động số lượng */}
              <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  <span className="text-sm font-semibold text-blue-800">Lịch sử biến động số lượng</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  {/* Số lượng trước */}
                  <div className="text-center flex-1">
                    <p className="text-xs text-gray-500 uppercase mb-1">Trước khi nhập</p>
                    <p className="text-xl font-bold text-gray-700">
                      {selectedReceipt.soLuongTruoc || 0} <span className="text-sm">{selectedReceipt.donViTinh}</span>
                    </p>
                  </div>

                  {/* Mũi tên + Số lượng nhập */}
                  <div className="flex flex-col items-center px-4">
                    <div className="flex items-center gap-2 bg-green-100 px-3 py-1 rounded-full">
                      <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m0 0l-4-4m4 4l4-4" />
                      </svg>
                      <span className="text-green-700 font-bold">+{selectedReceipt.soLuongNhap}</span>
                    </div>
                    <svg className="w-6 h-6 text-green-500 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </div>

                  {/* Số lượng sau */}
                  <div className="text-center flex-1">
                    <p className="text-xs text-gray-500 uppercase mb-1">Sau khi nhập</p>
                    <p className="text-xl font-bold text-green-600">
                      {selectedReceipt.soLuongSau || 0} <span className="text-sm">{selectedReceipt.donViTinh}</span>
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                <label className="text-xs text-green-600 uppercase font-medium">Số lượng nhập</label>
                <p className="text-2xl font-bold text-green-700 mt-1">
                  {selectedReceipt.soLuongNhap} <span className="text-lg">{selectedReceipt.donViTinh}</span>
                </p>
              </div>

              {selectedReceipt.ghiChu && (
                <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg">
                  <label className="text-xs text-yellow-600 uppercase font-medium">Ghi chú</label>
                  <p className="text-sm text-gray-700 mt-1">{selectedReceipt.ghiChu}</p>
                </div>
              )}

              <div className="text-xs text-gray-400 text-right">
                Tạo lúc: {new Date(selectedReceipt.createdAt).toLocaleString('vi-VN')}
              </div>
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={() => setShowDetailModal(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Đóng
              </button>
            </div>
            </>)}
          </div>
        </div>
      </Modal>

      {/* Create/Edit Receipt Modal */}
      <Modal isOpen={showModal} onClose={() => { setShowModal(false); setEditingId(null); }} showBackdrop>
        <div className="bg-white rounded-lg shadow-xl w-[calc(100vw-2rem)] sm:w-[500px] flex flex-col max-h-[calc(100vh-2rem)]" onClick={(e) => e.stopPropagation()}>
          <div className="border-b px-6 py-4 shrink-0">
            <h2 className="text-xl font-bold">{editingId ? 'Cập nhật phiếu nhập kho' : 'Phiếu nhập kho'}</h2>
          </div>
          <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 p-6 space-y-4">
              {/* Tên nhân viên */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tên nhân viên
                </label>
                <input
                  type="text"
                  value={`${user?.lastName} ${user?.firstName}`}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
                />
              </div>

              {/* Mã nhân viên */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mã nhân viên
                </label>
                <input
                  type="text"
                  value={user?.employeeCode || ''}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
                />
              </div>

              {/* Chọn kho */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Chọn kho <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.warehouseId}
                  onChange={(e) => handleWarehouseChange(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Chọn kho --</option>
                  {Array.isArray(warehouses) && warehouses.map((warehouse) => (
                    <option key={warehouse.id} value={warehouse.id}>
                      {warehouse.tenKho}
                    </option>
                  ))}
                </select>
              </div>

              {/* Chọn số lô */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Chọn số lô <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.lotId}
                  onChange={(e) => handleLotChange(e.target.value)}
                  required
                  disabled={!formData.warehouseId}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                >
                  <option value="">-- Chọn lô --</option>
                  {Array.isArray(lots) && lots.map((lot) => (
                    <option key={lot.id} value={lot.id}>
                      {lot.tenLo}
                    </option>
                  ))}
                </select>
              </div>

              {/* Chọn hàng hóa nhập kho — tìm kiếm được, cho phép hàng mới chưa có trong lô */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Hàng hóa nhập kho <span className="text-red-500">*</span>
                </label>
                <ProductCombobox
                  products={allProducts}
                  value={formData.internationalProductId || null}
                  disabled={!formData.lotId}
                  lotProducts={lotProducts}
                  allowCreate
                  onChange={(productId, product) => {
                    // Link to the kiện already in this lot when there is one, so the
                    // receipt tops up existing stock instead of creating a second kiện.
                    const existing = lotProducts.find(
                      (lp) => lp.internationalProductId === productId
                    );
                    setFormData((prev) => ({
                      ...prev,
                      internationalProductId: productId ?? '',
                      lotProductId: existing?.id ?? '',
                      tenSanPham: product?.tenSanPham ?? '',
                      loaiSanPham: product?.loaiSanPham ?? '',
                      donViTinh:
                        existing?.donViTinh ??
                        (product?.donViTinh && DON_VI_TINH_OPTIONS.includes(product.donViTinh)
                          ? product.donViTinh
                          : prev.donViTinh),
                    }));
                  }}
                  onCreateNew={(tenSanPham) => {
                    setFormData((prev) => ({
                      ...prev,
                      internationalProductId: '',
                      lotProductId: '',
                      tenSanPham,
                      loaiSanPham: '',
                    }));
                  }}
                />
                {/* Tell the user which of the three cases they're in */}
                {formData.lotProductId ? (
                  (() => {
                    const lp = lotProducts.find((p) => p.id === formData.lotProductId);
                    return lp ? (
                      <p className="mt-1 text-xs text-blue-600">
                        Đã có trong lô — kiện {lp.maKien ?? lp.id.slice(-4)}, tồn {lp.soLuong} {lp.donViTinh}. Số lượng sẽ được cộng dồn.
                      </p>
                    ) : null;
                  })()
                ) : formData.tenSanPham ? (
                  <p className="mt-1 text-xs text-green-600">
                    {formData.internationalProductId
                      ? `Hàng hóa chưa có trong lô này — kiện mới sẽ được tạo khi lưu phiếu`
                      : `Hàng hóa mới "${formData.tenSanPham}" sẽ được tạo khi lưu phiếu`}
                  </p>
                ) : null}
              </div>

              {/* Đơn vị tính — chỉ cần khi tạo kiện mới (kiện có sẵn đã có ĐVT) */}
              {!formData.lotProductId && formData.tenSanPham && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Đơn vị tính <span className="text-red-500">*</span>
                  </label>
                  <UnitSelect
                    value={formData.donViTinh}
                    onChange={(val) => setFormData({ ...formData, donViTinh: val })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              {/* Số lượng nhập kho */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Số lượng nhập kho <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={formData.soLuongNhap}
                  onChange={(e) => setFormData({ ...formData, soLuongNhap: parseNumberInput(e.target.value) })}
                  required
                  min="0"
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Nhập số lượng"
                />
                {/* Chú thích lịch sử thay đổi số lượng — kiện đã có trong lô */}
                {formData.lotProductId && (
                  <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center gap-2 text-sm text-blue-800">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="font-medium">Thông tin thay đổi số lượng:</span>
                    </div>
                    <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                      <div className="flex justify-between items-center bg-white px-2 py-1 rounded">
                        <span className="text-gray-600">Số lượng hiện tại:</span>
                        <span className="font-semibold text-gray-900">
                          {lotProducts.find(lp => lp.id === formData.lotProductId)?.soLuong || 0} {lotProducts.find(lp => lp.id === formData.lotProductId)?.donViTinh || ''}
                        </span>
                      </div>
                      <div className="flex justify-between items-center bg-white px-2 py-1 rounded">
                        <span className="text-gray-600">Sau khi nhập:</span>
                        <span className="font-semibold text-green-600">
                          {((lotProducts.find(lp => lp.id === formData.lotProductId)?.soLuong || 0) + (formData.soLuongNhap || 0)).toFixed(2)} {lotProducts.find(lp => lp.id === formData.lotProductId)?.donViTinh || ''}
                        </span>
                      </div>
                    </div>
                    {formData.soLuongNhap > 0 && (
                      <div className="mt-2 text-xs text-blue-600 flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
                        </svg>
                        Tăng thêm: +{formData.soLuongNhap} {lotProducts.find(lp => lp.id === formData.lotProductId)?.donViTinh || ''}
                      </div>
                    )}
                  </div>
                )}
                {/* Kiện mới — chưa có tồn, nêu rõ số lượng sẽ là tồn ban đầu */}
                {!formData.lotProductId && formData.tenSanPham && formData.soLuongNhap > 0 && (
                  <p className="mt-2 text-xs text-green-700 bg-green-50 border border-green-200 rounded px-2 py-1.5">
                    Kiện mới — tồn sau nhập: {formData.soLuongNhap} {formData.donViTinh}
                  </p>
                )}
              </div>

              {/* Mục đích nhập */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mục đích nhập
                </label>
                <input
                  type="text"
                  list="muc-dich-presets-tab"
                  value={formData.mucDich}
                  onChange={(e) => setFormData({ ...formData, mucDich: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="VD: Nhập từ thu mua, Nhập thành phẩm sản xuất..."
                />
                <datalist id="muc-dich-presets-tab">
                  {MUC_DICH_PRESETS.map((p) => (
                    <option key={p} value={p} />
                  ))}
                </datalist>
              </div>

              {/* Ghi chú */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ghi chú
                </label>
                <textarea
                  value={formData.ghiChu}
                  onChange={(e) => setFormData({ ...formData, ghiChu: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="VD: sản xuất nhập kho / mua nhập kho - nhà cung cấp - ..."
                />
              </div>

              <div className="flex flex-col sm:flex-row sm:justify-end gap-2 mt-6 shrink-0">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); setEditingId(null); }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Đang xử lý...' : editingId ? 'Cập nhật' : 'Tạo phiếu nhập'}
                </button>
              </div>
            </form>
          </div>
        </Modal>
    </div>
  );
};

export default WarehouseReceiptTab;

