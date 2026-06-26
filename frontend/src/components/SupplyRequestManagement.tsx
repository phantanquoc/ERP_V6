import React, { useState, useEffect } from 'react';
import { Trash2, Eye, Edit, Package, ShoppingCart, Download, X, ClipboardCheck, PackagePlus, Plus } from 'lucide-react';
import supplyRequestService, { SupplyRequest } from '../services/supplyRequestService';
import { useAuth } from '../contexts/AuthContext';
import CreateWarehouseIssueModal from './CreateWarehouseIssueModal';
import CreatePurchaseRequestModal from './CreatePurchaseRequestModal';
import CreateWarehouseReceiptModal from './CreateWarehouseReceiptModal';
import { parseNumberInput } from '../utils/numberInput';
import warehouseService from '../services/warehouseService';
import TableFilter, { FilterField } from './TableFilter';
import Modal from './Modal';
import UnitSelect from './common/UnitSelect';

interface SupplyRequestManagementProps {
  onClose?: () => void;
}

interface EditItemRow {
  phanLoai: string;
  tenGoi: string;
  soLuong: number;
  donViTinh: string;
}

const emptyEditRow = (): EditItemRow => ({
  phanLoai: '',
  tenGoi: '',
  soLuong: 0,
  donViTinh: 'Kg',
});

const getStatusColor = (status: string) => {
  switch (status) {
    case 'Đã cung cấp':
      return 'text-green-700 bg-green-100';
    case 'Đã mua hàng':
      return 'text-emerald-700 bg-emerald-100';
    case 'Đã duyệt mua':
      return 'text-blue-700 bg-blue-100';
    case 'Đang xử lý':
      return 'text-yellow-700 bg-yellow-100';
    case 'Chưa cung cấp':
    default:
      return 'text-gray-700 bg-gray-100';
  }
};

const SupplyRequestManagement: React.FC<SupplyRequestManagementProps> = () => {
  const { user } = useAuth();
  const canEdit = user?.role === 'admin' || user?.role === 'department_head' || user?.role === 'team_lead';
  const canDelete = user?.role === 'admin';
  const [requests, setRequests] = useState<SupplyRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterValues, setFilterValues] = useState<Record<string, string>>({ _search: '', maYeuCau: '', tenNhanVien: '', boPhan: '', trangThai: '', mucDoUuTien: '' });
  const supplyFilterFields: FilterField[] = [
    { key: 'maYeuCau', label: 'Mã yêu cầu', type: 'text' },
    { key: 'tenNhanVien', label: 'Tên nhân viên', type: 'text' },
    { key: 'boPhan', label: 'Bộ phận', type: 'text' },
    { key: 'trangThai', label: 'Trạng thái', type: 'select', options: [
      { value: 'Chưa cung cấp', label: 'Chưa cung cấp' },
      { value: 'Đang xử lý', label: 'Đang xử lý' },
      { value: 'Đã duyệt mua', label: 'Đã duyệt mua' },
      { value: 'Đã mua hàng', label: 'Đã mua hàng — chờ nhập kho' },
      { value: 'Đã cung cấp', label: 'Đã cung cấp' },
    ]},
    { key: 'mucDoUuTien', label: 'Mức độ ưu tiên', type: 'select', options: [
      { value: 'Cao', label: 'Cao' },
      { value: 'Trung bình', label: 'Trung bình' },
      { value: 'Thấp', label: 'Thấp' },
    ]},
  ];
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const itemsPerPage = 10;
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'edit' | 'view'>('view');
  const [selectedRequest, setSelectedRequest] = useState<SupplyRequest | null>(null);
  const [showWarehouseIssueModal, setShowWarehouseIssueModal] = useState(false);
  const [showPurchaseRequestModal, setShowPurchaseRequestModal] = useState(false);
  const [showWarehouseReceiptModal, setShowWarehouseReceiptModal] = useState(false);
  const [inventoryCheckResult, setInventoryCheckResult] = useState<{
    show: boolean;
    loading: boolean;
    productName: string;
    items: { tenKho: string; tenLo: string; soLuong: number; giaThanh: number; donViTinh: string }[];
    allResults?: { productName: string; items: { tenKho: string; tenLo: string; soLuong: number; giaThanh: number; donViTinh: string }[] }[];
  }>({ show: false, loading: false, productName: '', items: [] });

  // Edit form state
  const [editItems, setEditItems] = useState<EditItemRow[]>([emptyEditRow()]);
  const [editMucDich, setEditMucDich] = useState('');
  const [editMucDoUuTien, setEditMucDoUuTien] = useState('Trung bình');
  const [editGhiChu, setEditGhiChu] = useState('');

  useEffect(() => {
    fetchRequests();
  }, [searchTerm, currentPage]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const response = await supplyRequestService.getAllSupplyRequests(currentPage, itemsPerPage, searchTerm);
      setRequests(response.data);
      setTotalItems(response.pagination?.totalItems || response.data.length);
    } catch (error: any) {
      alert(error.response?.data?.message || 'Lỗi khi tải danh sách yêu cầu cung cấp');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (item: SupplyRequest) => {
    setModalMode('edit');
    setSelectedRequest(item);
    const rows: EditItemRow[] = (item.items && item.items.length > 0)
      ? item.items.map(i => ({ phanLoai: i.phanLoai, tenGoi: i.tenGoi, soLuong: i.soLuong, donViTinh: i.donViTinh }))
      : [emptyEditRow()];
    setEditItems(rows);
    setEditMucDich(item.mucDichYeuCau);
    setEditMucDoUuTien(item.mucDoUuTien);
    setEditGhiChu(item.ghiChu || '');
    setShowModal(true);
  };

  const handleView = (item: SupplyRequest) => {
    setModalMode('view');
    setSelectedRequest(item);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa yêu cầu này?')) {
      return;
    }

    setLoading(true);
    try {
      await supplyRequestService.deleteSupplyRequest(id);
      alert('Xóa yêu cầu cung cấp thành công!');
      fetchRequests();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Lỗi khi xóa yêu cầu cung cấp');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedRequest) {
      alert('Không tìm thấy thông tin yêu cầu');
      return;
    }

    // Validate rows
    for (let i = 0; i < editItems.length; i++) {
      if (!editItems[i].tenGoi || !editItems[i].tenGoi.trim()) {
        alert(`Dòng ${i + 1}: Vui lòng nhập tên gọi`);
        return;
      }
      if (editItems[i].soLuong <= 0) {
        alert(`Dòng ${i + 1}: Số lượng phải lớn hơn 0`);
        return;
      }
    }

    setLoading(true);
    try {
      await supplyRequestService.updateSupplyRequest(selectedRequest.id, {
        items: editItems,
        mucDichYeuCau: editMucDich,
        mucDoUuTien: editMucDoUuTien,
        ghiChu: editGhiChu,
      });
      alert('Cập nhật yêu cầu cung cấp thành công!');
      setShowModal(false);
      fetchRequests();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Lỗi khi cập nhật yêu cầu cung cấp');
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Cao':
        return 'text-red-600 bg-red-100';
      case 'Trung bình':
        return 'text-yellow-600 bg-yellow-100';
      case 'Thấp':
        return 'text-green-600 bg-green-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const handleCheckInventory = async (productNames: string[]) => {
    if (!productNames || productNames.length === 0) {
      alert('Không có tên sản phẩm để kiểm tra tồn kho');
      return;
    }

    setInventoryCheckResult({ show: true, loading: true, productName: productNames.join(', '), items: [], allResults: [] });

    try {
      const response = await warehouseService.getAllLotProducts();
      const lotProducts = response.data?.data || response.data || [];

      const allResults = productNames.map(name => {
        const nameLower = name.toLowerCase().trim();
        const matched = lotProducts.filter(
          (lp: any) => lp.internationalProduct?.tenSanPham?.toLowerCase().includes(nameLower) ||
            nameLower.includes(lp.internationalProduct?.tenSanPham?.toLowerCase() || '')
        );

        return {
          productName: name,
          items: matched.map((lp: any) => ({
            tenKho: lp.lot?.warehouse?.tenKho || 'N/A',
            tenLo: lp.lot?.tenLo || 'N/A',
            soLuong: lp.soLuong || 0,
            giaThanh: lp.giaThanh || 0,
            donViTinh: lp.donViTinh || 'KG',
          })),
        };
      });

      setInventoryCheckResult({ show: true, loading: false, productName: productNames.join(', '), items: [], allResults });
    } catch (error) {
      console.error('Lỗi kiểm tra tồn kho:', error);
      setInventoryCheckResult({ show: true, loading: false, productName: productNames.join(', '), items: [], allResults: [] });
    }
  };

  const filteredRequests = requests.filter(r => {
    const search = (filterValues._search || '').toLowerCase().trim();
    if (search) {
      const matchSearch =
        (r.maYeuCau || '').toLowerCase().includes(search) ||
        (r.tenNhanVien || '').toLowerCase().includes(search) ||
        (r.boPhan || '').toLowerCase().includes(search) ||
        (r.mucDichYeuCau || '').toLowerCase().includes(search) ||
        (r.trangThai || '').toLowerCase().includes(search) ||
        (r.items || []).some(i => (i.tenGoi || '').toLowerCase().includes(search));
      if (!matchSearch) return false;
    }
    if (filterValues.maYeuCau && !(r.maYeuCau || '').toLowerCase().includes(filterValues.maYeuCau.toLowerCase())) return false;
    if (filterValues.tenNhanVien && !(r.tenNhanVien || '').toLowerCase().includes(filterValues.tenNhanVien.toLowerCase())) return false;
    if (filterValues.boPhan && !(r.boPhan || '').toLowerCase().includes(filterValues.boPhan.toLowerCase())) return false;
    if (filterValues.trangThai && r.trangThai !== filterValues.trangThai) return false;
    if (filterValues.mucDoUuTien && r.mucDoUuTien !== filterValues.mucDoUuTien) return false;
    return true;
  });

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Yêu cầu cung cấp</h2>
          <button
            onClick={async () => {
              try {
                await supplyRequestService.exportToExcel({ search: searchTerm || undefined });
              } catch (error) {
                console.error('Error exporting to Excel:', error);
                alert('Lỗi khi xuất Excel');
              }
            }}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 w-full sm:w-auto"
          >
            <Download className="h-4 w-4" />
            Xuất Excel
          </button>
        </div>
        <TableFilter
          filters={supplyFilterFields}
          values={filterValues}
          onChange={setFilterValues}
          searchPlaceholder="Tìm kiếm theo mã, tên nhân viên, bộ phận, sản phẩm..."
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px]">
            <thead>
              <tr className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-300">
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">STT</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Ngày yêu cầu</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Mã yêu cầu</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Tên nhân viên</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Bộ phận</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Sản phẩm</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Mức độ ưu tiên</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Trạng thái</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Hoạt động</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-6 py-8 text-center text-gray-500">
                    Đang tải...
                  </td>
                </tr>
              ) : filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-8 text-center text-gray-500">
                    Không có dữ liệu
                  </td>
                </tr>
              ) : (
                filteredRequests.map((request, index) => (
                  <tr
                    key={request.id}
                    className={`${
                      request.trangThai === 'Đã mua hàng'
                        ? 'bg-amber-50 border-l-4 border-l-amber-400'
                        : index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                    } hover:bg-blue-50 transition-colors border-b border-gray-200`}
                  >
                    <td className="px-6 py-4 text-sm border-r border-gray-200">{(currentPage - 1) * itemsPerPage + index + 1}</td>
                    <td className="px-6 py-4 text-sm border-r border-gray-200">{new Date(request.ngayYeuCau).toLocaleDateString('vi-VN')}</td>
                    <td className="px-6 py-4 text-sm font-medium text-indigo-600 border-r border-gray-200">{request.maYeuCau}</td>
                    <td className="px-6 py-4 text-sm border-r border-gray-200">{request.tenNhanVien}</td>
                    <td className="px-6 py-4 text-sm border-r border-gray-200">{request.boPhan}</td>
                    <td className="px-6 py-4 text-sm border-r border-gray-200">
                      {request.items && request.items.length > 0 ? (
                        <span className="text-gray-700">{request.items.map(i => i.tenGoi).join(', ')}</span>
                      ) : (
                        <span className="text-gray-400 italic">Không có sản phẩm</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm border-r border-gray-200">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(request.mucDoUuTien)}`}>
                        {request.mucDoUuTien}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm border-r border-gray-200">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(request.trangThai)}`}>
                        {request.trangThai}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleView(request)}
                          className="p-1.5 rounded-md text-blue-600 hover:bg-blue-100 hover:text-blue-800 transition-colors"
                          title="Xem chi tiết"
                        >
                          <Eye className="h-4 w-4" />
                        </button>

                        {canEdit && (
                          <button
                            onClick={() => handleEdit(request)}
                            className="p-1.5 rounded-md text-indigo-600 hover:bg-indigo-100 hover:text-indigo-800 transition-colors"
                            title="Chỉnh sửa"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                        )}

                        {canDelete && (
                          <button
                            onClick={() => handleDelete(request.id)}
                            className="p-1.5 rounded-md text-red-600 hover:bg-red-100 hover:text-red-800 transition-colors"
                            title="Xóa"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}

                        {request.purchaseRequests?.some(pr => pr.trangThai === 'Đã duyệt' || pr.trangThai === 'Hoàn thành') && (() => {
                          const daNhapKho = request.warehouseReceipts && request.warehouseReceipts.length > 0;
                          return (
                            <button
                              onClick={() => {
                                if (!daNhapKho) {
                                  setSelectedRequest(request);
                                  setShowWarehouseReceiptModal(true);
                                }
                              }}
                              disabled={daNhapKho}
                              className={daNhapKho
                                ? "p-1.5 rounded-md text-gray-400 cursor-not-allowed"
                                : "p-1.5 rounded-md text-green-600 hover:bg-green-100 hover:text-green-800 transition-colors"
                              }
                              title={daNhapKho ? "Đã nhập kho" : "Nhập kho"}
                            >
                              <PackagePlus className="h-4 w-4" />
                            </button>
                          );
                        })()}
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
          const totalPages = Math.ceil(totalItems / itemsPerPage);
          return totalPages > 1 ? (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-4 px-2">
              <span className="text-sm text-gray-600">
                Hiển thị {(currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, totalItems)} / {totalItems} mục
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
      </div>

      {/* Modal Edit/View */}
      <Modal isOpen={showModal && !!selectedRequest} onClose={() => setShowModal(false)} showBackdrop>
        <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full flex flex-col max-h-[calc(100vh-2rem)]" onClick={(e) => e.stopPropagation()}>
          <div className="p-6 overflow-y-auto flex-1">
            {selectedRequest && (<>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">
                {modalMode === 'edit' ? 'Chỉnh sửa yêu cầu' : 'Chi tiết yêu cầu'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>

              {/* Request header info (always shown) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4 text-sm bg-gray-50 p-3 rounded-md">
                <div><span className="font-medium text-gray-600">Mã yêu cầu:</span> <span className="text-indigo-600 font-medium">{selectedRequest.maYeuCau}</span></div>
                <div><span className="font-medium text-gray-600">Ngày yêu cầu:</span> {new Date(selectedRequest.ngayYeuCau).toLocaleDateString('vi-VN')}</div>
                <div><span className="font-medium text-gray-600">Nhân viên:</span> {selectedRequest.tenNhanVien}</div>
                <div><span className="font-medium text-gray-600">Bộ phận:</span> {selectedRequest.boPhan}</div>
                <div className="sm:col-span-2 flex items-center gap-2">
                  <span className="font-medium text-gray-600">Trạng thái:</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedRequest.trangThai)}`}>
                    {selectedRequest.trangThai}
                  </span>
                </div>
              </div>

              {modalMode === 'view' ? (
                <div className="space-y-4">
                  {/* Items sub-table */}
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Danh sách sản phẩm</h3>
                    <div className="border border-gray-200 rounded-md overflow-x-auto">
                      <table className="w-full min-w-[560px] text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Phân loại</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Tên gọi</th>
                            <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Số lượng</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Đơn vị</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {selectedRequest.items && selectedRequest.items.length > 0 ? (
                            selectedRequest.items.map((item, idx) => (
                              <tr key={item.id} className="hover:bg-gray-50">
                                <td className="px-3 py-2 text-gray-500">{idx + 1}</td>
                                <td className="px-3 py-2">{item.phanLoai}</td>
                                <td className="px-3 py-2 font-medium">{item.tenGoi}</td>
                                <td className="px-3 py-2 text-right">{item.soLuong.toLocaleString('vi-VN')}</td>
                                <td className="px-3 py-2">{item.donViTinh}</td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={5} className="px-3 py-4 text-center text-gray-400 italic">Không có sản phẩm</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Other fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <div><span className="font-medium text-gray-600">Mức độ ưu tiên:</span> <span className={`ml-1 px-2 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(selectedRequest.mucDoUuTien)}`}>{selectedRequest.mucDoUuTien}</span></div>
                    <div><span className="font-medium text-gray-600">Mục đích:</span> <span className="text-gray-700">{selectedRequest.mucDichYeuCau}</span></div>
                    {selectedRequest.ghiChu && (
                      <div className="sm:col-span-2"><span className="font-medium text-gray-600">Ghi chú:</span> <span className="text-gray-700">{selectedRequest.ghiChu}</span></div>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 pt-2 border-t border-gray-100">
                    <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                      {selectedRequest.items && selectedRequest.items.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            const names = selectedRequest.items.map(i => i.tenGoi).filter(Boolean);
                            handleCheckInventory(names);
                          }}
                          className="px-3 py-1.5 text-xs bg-teal-600 text-white rounded-md hover:bg-teal-700 flex items-center justify-center gap-1.5"
                        >
                          <ClipboardCheck className="h-3.5 w-3.5" />
                          Kiểm tra tồn kho
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setShowModal(false);
                          setShowWarehouseIssueModal(true);
                        }}
                        className="px-3 py-1.5 text-xs bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center justify-center gap-1.5"
                      >
                        <Package className="h-3.5 w-3.5" />
                        Tạo xuất kho
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowModal(false);
                          setShowPurchaseRequestModal(true);
                        }}
                        className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center justify-center gap-1.5"
                      >
                        <ShoppingCart className="h-3.5 w-3.5" />
                        Tạo yêu cầu mua hàng
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowModal(false)}
                      className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                    >
                      Đóng
                    </button>
                  </div>
                </div>
              ) : (
                /* Edit mode */
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Items edit table */}
                  <div>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-2">
                      <label className="text-sm font-medium text-gray-700">Danh sách sản phẩm <span className="text-red-500">*</span></label>
                      <button
                        type="button"
                        onClick={() => setEditItems(prev => [...prev, emptyEditRow()])}
                        className="flex items-center justify-center gap-1 px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        <Plus className="h-3 w-3" />
                        Thêm dòng
                      </button>
                    </div>
                    <div className="border border-gray-200 rounded-md overflow-x-auto">
                      <table className="w-full min-w-[720px] text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase w-6">#</th>
                            <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">Phân loại</th>
                            <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">Tên gọi</th>
                            <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase w-24">Số lượng</th>
                            <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase w-24">Đơn vị</th>
                            <th className="px-2 py-2 w-8"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {editItems.map((row, idx) => (
                            <tr key={idx}>
                              <td className="px-2 py-2 text-gray-500 text-center">{idx + 1}</td>
                              <td className="px-2 py-2">
                                <input
                                  type="text"
                                  value={row.phanLoai}
                                  onChange={(e) => setEditItems(prev => prev.map((r, i) => i === idx ? { ...r, phanLoai: e.target.value } : r))}
                                  className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                  placeholder="Phân loại"
                                />
                              </td>
                              <td className="px-2 py-2">
                                <input
                                  type="text"
                                  value={row.tenGoi}
                                  onChange={(e) => setEditItems(prev => prev.map((r, i) => i === idx ? { ...r, tenGoi: e.target.value } : r))}
                                  required
                                  className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                  placeholder="Tên gọi"
                                />
                              </td>
                              <td className="px-2 py-2">
                                <input
                                  type="number"
                                  value={row.soLuong}
                                  onChange={(e) => setEditItems(prev => prev.map((r, i) => i === idx ? { ...r, soLuong: parseNumberInput(e.target.value) } : r))}
                                  required
                                  min="0.01"
                                  step="0.01"
                                  className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                />
                              </td>
                              <td className="px-2 py-2">
                                <UnitSelect
                                  value={row.donViTinh}
                                  onChange={(val) => setEditItems(prev => prev.map((r, i) => i === idx ? { ...r, donViTinh: val } : r))}
                                  className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                />
                              </td>
                              <td className="px-2 py-2 text-center">
                                <button
                                  type="button"
                                  onClick={() => setEditItems(prev => prev.filter((_, i) => i !== idx))}
                                  disabled={editItems.length === 1}
                                  className="text-red-500 hover:text-red-700 disabled:text-gray-300"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Other edit fields */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Mục đích yêu cầu <span className="text-red-500">*</span></label>
                    <textarea
                      value={editMucDich}
                      onChange={(e) => setEditMucDich(e.target.value)}
                      required
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Mức độ ưu tiên <span className="text-red-500">*</span></label>
                    <select
                      value={editMucDoUuTien}
                      onChange={(e) => setEditMucDoUuTien(e.target.value)}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                    >
                      <option value="Cao">Cao</option>
                      <option value="Trung bình">Trung bình</option>
                      <option value="Thấp">Thấp</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú</label>
                    <textarea
                      value={editGhiChu}
                      onChange={(e) => setEditGhiChu(e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row sm:justify-end gap-3 pt-2">
                    <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">
                      Hủy
                    </button>
                    <button type="submit" disabled={loading} className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50">
                      {loading ? 'Đang xử lý...' : 'Cập nhật'}
                    </button>
                  </div>
                </form>
              )}
            </>)}
          </div>
        </div>
      </Modal>

      {/* Warehouse Issue Modal */}
      <CreateWarehouseIssueModal
        isOpen={showWarehouseIssueModal}
        onClose={() => setShowWarehouseIssueModal(false)}
        supplyRequest={selectedRequest}
        onSuccess={() => {
          fetchRequests();
        }}
      />

      {/* Purchase Request Modal */}
      <CreatePurchaseRequestModal
        isOpen={showPurchaseRequestModal}
        onClose={() => setShowPurchaseRequestModal(false)}
        supplyRequest={selectedRequest}
        onSuccess={() => {
          fetchRequests();
        }}
      />

      {/* Warehouse Receipt Modal */}
      <CreateWarehouseReceiptModal
        isOpen={showWarehouseReceiptModal}
        onClose={() => setShowWarehouseReceiptModal(false)}
        supplyRequest={selectedRequest}
        onSuccess={() => {
          fetchRequests();
        }}
      />

      {/* Popup kiểm tra tồn kho */}
      <Modal isOpen={inventoryCheckResult.show} onClose={() => setInventoryCheckResult(prev => ({ ...prev, show: false }))} showBackdrop closeOnBackdrop={true}>
        <div className="bg-white rounded-lg shadow-xl w-[700px] max-w-[90vw] flex flex-col max-h-[calc(100vh-2rem)]" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between p-6 border-b shrink-0">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <Package className="w-5 h-5 text-teal-600" />
              Kiểm tra tồn kho
            </h3>
            <button
              onClick={() => setInventoryCheckResult(prev => ({ ...prev, show: false }))}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="overflow-y-auto flex-1 p-6">
            {inventoryCheckResult.loading ? (
              <div className="text-center py-6 text-gray-500">Đang tải...</div>
            ) : inventoryCheckResult.allResults && inventoryCheckResult.allResults.length > 0 ? (
              inventoryCheckResult.allResults.map((result, rIdx) => (
                    <div key={rIdx} className="mb-4">
                      <div className="bg-gray-50 rounded-lg p-3 mb-2">
                        <span className="text-xs text-gray-500">Sản phẩm {rIdx + 1}</span>
                        <p className="text-sm font-medium text-gray-800">{result.productName}</p>
                      </div>
                      {result.items.length === 0 ? (
                        <p className="text-sm text-orange-600 text-center py-2">Không tìm thấy tồn kho cho sản phẩm này</p>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full min-w-[560px] border-collapse text-sm mb-2">
                          <thead>
                            <tr className="bg-teal-100">
                              <th className="px-3 py-2 text-left border border-gray-200 font-medium text-gray-700">Kho</th>
                              <th className="px-3 py-2 text-left border border-gray-200 font-medium text-gray-700">Lô</th>
                              <th className="px-3 py-2 text-right border border-gray-200 font-medium text-gray-700">Số lượng</th>
                              <th className="px-3 py-2 text-right border border-gray-200 font-medium text-gray-700">Giá thành</th>
                            </tr>
                          </thead>
                          <tbody>
                            {result.items.map((item, idx) => (
                              <tr key={idx} className="hover:bg-gray-50">
                                <td className="px-3 py-2 border border-gray-200">{item.tenKho}</td>
                                <td className="px-3 py-2 border border-gray-200">{item.tenLo}</td>
                                <td className="px-3 py-2 border border-gray-200 text-right font-medium text-blue-700">
                                  {item.soLuong.toLocaleString('vi-VN', { maximumFractionDigits: 2 })} {item.donViTinh}
                                </td>
                                <td className="px-3 py-2 border border-gray-200 text-right font-medium text-green-700">
                                  {item.giaThanh > 0
                                    ? `${item.giaThanh.toLocaleString('vi-VN', { maximumFractionDigits: 0 })} VNĐ`
                                    : '-'}
                                </td>
                              </tr>
                            ))}
                            <tr className="bg-teal-50 font-semibold">
                              <td colSpan={2} className="px-3 py-2 border border-gray-200 text-right">Tổng</td>
                              <td className="px-3 py-2 border border-gray-200 text-right text-blue-800">
                                {result.items.reduce((s, i) => s + i.soLuong, 0).toLocaleString('vi-VN', { maximumFractionDigits: 2 })} {result.items[0]?.donViTinh || ''}
                              </td>
                              <td className="px-3 py-2 border border-gray-200 text-right text-green-800">-</td>
                            </tr>
                          </tbody>
                        </table>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-orange-600 text-center py-4">Không tìm thấy tồn kho</p>
            )}
          </div>
          <div className="p-4 border-t shrink-0 text-right">
            <button
              onClick={() => setInventoryCheckResult(prev => ({ ...prev, show: false }))}
              className="px-4 py-2 bg-teal-600 text-white text-sm rounded-md hover:bg-teal-700"
            >
              Đóng
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default SupplyRequestManagement;
