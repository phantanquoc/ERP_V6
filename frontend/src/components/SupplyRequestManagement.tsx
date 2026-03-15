import React, { useState, useEffect } from 'react';
import { Search, Trash2, Eye, FileText, Edit, Package, ShoppingCart, Download, X, ClipboardCheck, PackagePlus } from 'lucide-react';
import supplyRequestService, { SupplyRequest } from '../services/supplyRequestService';
import CreateWarehouseIssueModal from './CreateWarehouseIssueModal';
import CreatePurchaseRequestModal from './CreatePurchaseRequestModal';
import CreateWarehouseReceiptModal from './CreateWarehouseReceiptModal';
import { parseNumberInput } from '../utils/numberInput';
import warehouseService from '../services/warehouseService';

interface SupplyRequestManagementProps {
  onClose?: () => void;
}

const SupplyRequestManagement: React.FC<SupplyRequestManagementProps> = () => {
  const [requests, setRequests] = useState<SupplyRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
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
  }>({ show: false, loading: false, productName: '', items: [] });

  // Form state
  const [formData, setFormData] = useState({
    phanLoai: 'Nguyên liệu',
    tenGoi: '',
    soLuong: 0,
    donViTinh: 'Kg',
    mucDichYeuCau: '',
    mucDoUuTien: 'Trung bình',
    ghiChu: '',
    trangThai: 'Chưa cung cấp',
    fileKemTheo: '',
  });

  useEffect(() => {
    fetchRequests();
  }, [searchTerm]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const response = await supplyRequestService.getAllSupplyRequests(1, 1000, searchTerm);
      setRequests(response.data);
    } catch (error: any) {
      alert(error.response?.data?.message || 'Lỗi khi tải danh sách yêu cầu cung cấp');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (item: SupplyRequest) => {
    setModalMode('edit');
    setSelectedRequest(item);
    setFormData({
      phanLoai: item.phanLoai,
      tenGoi: item.tenGoi,
      soLuong: item.soLuong,
      donViTinh: item.donViTinh,
      mucDichYeuCau: item.mucDichYeuCau,
      mucDoUuTien: item.mucDoUuTien,
      ghiChu: item.ghiChu || '',
      trangThai: item.trangThai,
      fileKemTheo: item.fileKemTheo || '',
    });
    setShowModal(true);
  };

  const handleView = (item: SupplyRequest) => {
    setModalMode('view');
    setSelectedRequest(item);
    setFormData({
      phanLoai: item.phanLoai,
      tenGoi: item.tenGoi,
      soLuong: item.soLuong,
      donViTinh: item.donViTinh,
      mucDichYeuCau: item.mucDichYeuCau,
      mucDoUuTien: item.mucDoUuTien,
      ghiChu: item.ghiChu || '',
      trangThai: item.trangThai,
      fileKemTheo: item.fileKemTheo || '',
    });
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

    setLoading(true);
    try {
      await supplyRequestService.updateSupplyRequest(selectedRequest.id, formData);
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Đã cung cấp':
        return 'text-green-600 bg-green-100';
      case 'Chưa cung cấp':
        return 'text-orange-600 bg-orange-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const handleCheckInventory = async (productName: string) => {
    if (!productName) {
      alert('Không có tên sản phẩm để kiểm tra tồn kho');
      return;
    }

    setInventoryCheckResult({ show: true, loading: true, productName, items: [] });

    try {
      const response = await warehouseService.getAllLotProducts();
      const lotProducts = response.data?.data || response.data || [];

      const matched = lotProducts.filter(
        (lp: any) => lp.internationalProduct?.tenSanPham === productName
      );

      const items = matched.map((lp: any) => ({
        tenKho: lp.lot?.warehouse?.tenKho || 'N/A',
        tenLo: lp.lot?.tenLo || 'N/A',
        soLuong: lp.soLuong || 0,
        giaThanh: lp.giaThanh || 0,
        donViTinh: lp.donViTinh || 'KG',
      }));

      setInventoryCheckResult({ show: true, loading: false, productName, items });
    } catch (error) {
      console.error('Lỗi kiểm tra tồn kho:', error);
      setInventoryCheckResult({ show: true, loading: false, productName, items: [] });
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex justify-between items-center">
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Tìm kiếm theo mã, tên nhân viên, tên gọi..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </div>
        <button
          onClick={async () => {
            try {
              await supplyRequestService.exportToExcel({ search: searchTerm || undefined });
            } catch (error) {
              console.error('Error exporting to Excel:', error);
              alert('Lỗi khi xuất Excel');
            }
          }}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
        >
          <Download className="h-4 w-4" />
          Xuất Excel
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">STT</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ngày yêu cầu</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mã yêu cầu</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tên nhân viên</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bộ phận</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phân loại</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tên gọi</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Số lượng</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mức độ ưu tiên</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trạng thái</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hoạt động</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={11} className="px-4 py-8 text-center text-gray-500">
                    Đang tải...
                  </td>
                </tr>
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-4 py-8 text-center text-gray-500">
                    Không có dữ liệu
                  </td>
                </tr>
              ) : (
                requests.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((request, index) => (
                  <tr key={request.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm">{(currentPage - 1) * itemsPerPage + index + 1}</td>
                    <td className="px-4 py-3 text-sm">{new Date(request.ngayYeuCau).toLocaleDateString('vi-VN')}</td>
                    <td className="px-4 py-3 text-sm font-medium text-indigo-600">{request.maYeuCau}</td>
                    <td className="px-4 py-3 text-sm">{request.tenNhanVien}</td>
                    <td className="px-4 py-3 text-sm">{request.boPhan}</td>
                    <td className="px-4 py-3 text-sm">{request.phanLoai}</td>
                    <td className="px-4 py-3 text-sm">{request.tenGoi}</td>
                    <td className="px-4 py-3 text-sm">{request.soLuong} {request.donViTinh}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(request.mucDoUuTien)}`}>
                        {request.mucDoUuTien}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(request.trangThai)}`}>
                        {request.trangThai}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleView(request)}
                          className="text-blue-600 hover:text-blue-800"
                          title="Xem chi tiết"
                        >
                          <Eye className="h-4 w-4" />
                        </button>

                        <button
                          onClick={() => handleEdit(request)}
                          className="text-indigo-600 hover:text-indigo-800"
                          title="Chỉnh sửa"
                        >
                          <Edit className="h-4 w-4" />
                        </button>

                        <button
                          onClick={() => handleDelete(request.id)}
                          className="text-red-600 hover:text-red-800"
                          title="Xóa"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>

                        {request.purchaseRequests?.some(pr => pr.trangThai === 'Hoàn thành') && (() => {
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
                                ? "text-gray-400 cursor-not-allowed"
                                : "text-green-600 hover:text-green-800"
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
          const totalItems = requests.length;
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
      </div>

      {/* Modal Edit/View */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-4">
                {modalMode === 'edit' ? 'Chỉnh sửa yêu cầu' : 'Chi tiết yêu cầu'}
              </h2>

              <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-2 gap-4">
                  {/* Phân loại */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phân loại <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.phanLoai}
                      onChange={(e) => setFormData({ ...formData, phanLoai: e.target.value })}
                      disabled={modalMode === 'view'}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100"
                    >
                      <option value="Nguyên liệu">Nguyên liệu</option>
                      <option value="Phụ liệu">Phụ liệu</option>
                      <option value="Hệ thống">Hệ thống</option>
                      <option value="Thiết bị">Thiết bị</option>
                      <option value="Vật tư">Vật tư</option>
                    </select>
                  </div>

                  {/* Tên gọi */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tên gọi <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.tenGoi}
                      onChange={(e) => setFormData({ ...formData, tenGoi: e.target.value })}
                      disabled={modalMode === 'view'}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100"
                    />
                  </div>

                  {/* Số lượng */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Số lượng <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      value={formData.soLuong}
                      onChange={(e) => setFormData({ ...formData, soLuong: parseNumberInput(e.target.value) })}
                      disabled={modalMode === 'view'}
                      required
                      min="0"
                      step="0.01"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100"
                    />
                  </div>

                  {/* Đơn vị tính */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Đơn vị tính <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.donViTinh}
                      onChange={(e) => setFormData({ ...formData, donViTinh: e.target.value })}
                      disabled={modalMode === 'view'}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100"
                    >
                      <option value="Kg">Kg</option>
                      <option value="Cái">Cái</option>
                      <option value="Hệ">Hệ</option>
                    </select>
                  </div>

                  {/* Mức độ ưu tiên */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Mức độ ưu tiên <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.mucDoUuTien}
                      onChange={(e) => setFormData({ ...formData, mucDoUuTien: e.target.value })}
                      disabled={modalMode === 'view'}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100"
                    >
                      <option value="Cao">Cao</option>
                      <option value="Trung bình">Trung bình</option>
                      <option value="Thấp">Thấp</option>
                    </select>
                  </div>

                  {/* Trạng thái */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Trạng thái <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.trangThai}
                      onChange={(e) => setFormData({ ...formData, trangThai: e.target.value })}
                      disabled={modalMode === 'view'}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100"
                    >
                      <option value="Chưa cung cấp">Chưa cung cấp</option>
                      <option value="Đã cung cấp">Đã cung cấp</option>
                    </select>
                  </div>

                  {/* Mục đích yêu cầu */}
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Mục đích yêu cầu <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={formData.mucDichYeuCau}
                      onChange={(e) => setFormData({ ...formData, mucDichYeuCau: e.target.value })}
                      disabled={modalMode === 'view'}
                      required
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100"
                    />
                  </div>

                  {/* Ghi chú */}
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Ghi chú
                    </label>
                    <textarea
                      value={formData.ghiChu}
                      onChange={(e) => setFormData({ ...formData, ghiChu: e.target.value })}
                      disabled={modalMode === 'view'}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100"
                    />
                  </div>
                </div>

                <div className="mt-6 flex justify-between items-center">
                  {/* Left side - Action buttons (only in view mode) */}
                  {modalMode === 'view' && (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (selectedRequest) {
                            handleCheckInventory(selectedRequest.tenGoi);
                          }
                        }}
                        className="px-3 py-1.5 text-xs bg-teal-600 text-white rounded-md hover:bg-teal-700 flex items-center gap-1.5"
                      >
                        <ClipboardCheck className="h-3.5 w-3.5" />
                        Kiểm tra tồn kho
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowModal(false);
                          setShowWarehouseIssueModal(true);
                        }}
                        className="px-3 py-1.5 text-xs bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center gap-1.5"
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
                        className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-1.5"
                      >
                        <ShoppingCart className="h-3.5 w-3.5" />
                        Tạo yêu cầu mua hàng
                      </button>
                    </div>
                  )}

                  {/* Right side - Close/Cancel and Update buttons */}
                  <div className="flex gap-3 ml-auto">
                    <button
                      type="button"
                      onClick={() => setShowModal(false)}
                      className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                    >
                      {modalMode === 'view' ? 'Đóng' : 'Hủy'}
                    </button>
                    {modalMode !== 'view' && (
                      <button
                        type="submit"
                        disabled={loading}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
                      >
                        {loading ? 'Đang xử lý...' : 'Cập nhật'}
                      </button>
                    )}
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

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
      {inventoryCheckResult.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-lg shadow-xl p-6 w-[700px] max-w-[90vw] max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between mb-4">
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

            {inventoryCheckResult.loading ? (
              <div className="text-center py-6 text-gray-500">Đang tải...</div>
            ) : (
              <div className="overflow-auto flex-1">
                <div className="bg-gray-50 rounded-lg p-3 mb-3">
                  <span className="text-xs text-gray-500">Sản phẩm</span>
                  <p className="text-sm font-medium text-gray-800">{inventoryCheckResult.productName}</p>
                </div>
                {inventoryCheckResult.items.length === 0 ? (
                  <p className="text-sm text-orange-600 text-center py-4">Không tìm thấy tồn kho cho sản phẩm này</p>
                ) : (
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="bg-teal-100">
                        <th className="px-3 py-2 text-left border border-gray-200 font-medium text-gray-700">Kho</th>
                        <th className="px-3 py-2 text-left border border-gray-200 font-medium text-gray-700">Lô</th>
                        <th className="px-3 py-2 text-right border border-gray-200 font-medium text-gray-700">Số lượng</th>
                        <th className="px-3 py-2 text-right border border-gray-200 font-medium text-gray-700">Giá thành</th>
                      </tr>
                    </thead>
                    <tbody>
                      {inventoryCheckResult.items.map((item, idx) => (
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
                        <td colSpan={2} className="px-3 py-2 border border-gray-200 text-right">Tổng cộng</td>
                        <td className="px-3 py-2 border border-gray-200 text-right text-blue-800">
                          {inventoryCheckResult.items.reduce((s, i) => s + i.soLuong, 0).toLocaleString('vi-VN', { maximumFractionDigits: 2 })} {inventoryCheckResult.items[0]?.donViTinh || ''}
                        </td>
                        <td className="px-3 py-2 border border-gray-200 text-right text-green-800">
                          {(() => {
                            const withPrice = inventoryCheckResult.items.filter(i => i.giaThanh > 0);
                            if (withPrice.length === 0) return '-';
                            const avg = withPrice.reduce((s, i) => s + i.giaThanh, 0) / withPrice.length;
                            return `${avg.toLocaleString('vi-VN', { maximumFractionDigits: 0 })} VNĐ (TB)`;
                          })()}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                )}
              </div>
            )}

            <div className="mt-4 text-right">
              <button
                onClick={() => setInventoryCheckResult(prev => ({ ...prev, show: false }))}
                className="px-4 py-2 bg-teal-600 text-white text-sm rounded-md hover:bg-teal-700"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupplyRequestManagement;
