import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, Eye, AlertTriangle, CheckCircle } from 'lucide-react';
import warehouseInventoryService, { WarehouseInventory } from '../services/warehouseInventoryService';
import internationalProductService, { InternationalProduct } from '../services/internationalProductService';

interface WarehouseInventoryManagementProps {
  onClose?: () => void;
}

const WarehouseInventoryManagement: React.FC<WarehouseInventoryManagementProps> = () => {
  const [inventory, setInventory] = useState<WarehouseInventory[]>([]);
  const [products, setProducts] = useState<InternationalProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'view'>('create');
  const [selectedInventory, setSelectedInventory] = useState<WarehouseInventory | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    productId: '',
    soLuongTon: 0,
    donVi: 'kg',
    giaTriTon: 0,
    viTriKho: '',
    ngayNhapGanNhat: '',
    hanSuDung: '',
    trangThai: 'Bình thường',
    mucCanhBao: 0,
    nhaCungCap: '',
    ghiChu: '',
  });

  useEffect(() => {
    fetchInventory();
    fetchProducts();
  }, [currentPage, searchTerm]);

  const fetchInventory = async () => {
    setLoading(true);
    try {
      const response = await warehouseInventoryService.getAllInventory(currentPage, 10, searchTerm);
      setInventory(response.data);
      setTotalPages(response.pagination.totalPages);
    } catch (error: any) {
      alert(error.response?.data?.message || 'Lỗi khi tải danh sách tồn kho');
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await internationalProductService.getAllProducts(1, 1000);
      setProducts(response.data);
    } catch (error: any) {
      console.error('Lỗi khi tải danh sách sản phẩm:', error);
    }
  };

  const handleCreate = () => {
    setModalMode('create');
    setSelectedInventory(null);
    setFormData({
      productId: '',
      soLuongTon: 0,
      donVi: 'kg',
      giaTriTon: 0,
      viTriKho: '',
      ngayNhapGanNhat: '',
      hanSuDung: '',
      trangThai: 'Bình thường',
      mucCanhBao: 0,
      nhaCungCap: '',
      ghiChu: '',
    });
    setShowModal(true);
  };

  const handleEdit = (item: WarehouseInventory) => {
    setModalMode('edit');
    setSelectedInventory(item);
    setFormData({
      productId: item.productId,
      soLuongTon: item.soLuongTon,
      donVi: item.donVi,
      giaTriTon: item.giaTriTon,
      viTriKho: item.viTriKho || '',
      ngayNhapGanNhat: item.ngayNhapGanNhat ? item.ngayNhapGanNhat.split('T')[0] : '',
      hanSuDung: item.hanSuDung ? item.hanSuDung.split('T')[0] : '',
      trangThai: item.trangThai,
      mucCanhBao: item.mucCanhBao,
      nhaCungCap: item.nhaCungCap || '',
      ghiChu: item.ghiChu || '',
    });
    setShowModal(true);
  };

  const handleView = (item: WarehouseInventory) => {
    setModalMode('view');
    setSelectedInventory(item);
    setFormData({
      productId: item.productId,
      soLuongTon: item.soLuongTon,
      donVi: item.donVi,
      giaTriTon: item.giaTriTon,
      viTriKho: item.viTriKho || '',
      ngayNhapGanNhat: item.ngayNhapGanNhat ? item.ngayNhapGanNhat.split('T')[0] : '',
      hanSuDung: item.hanSuDung ? item.hanSuDung.split('T')[0] : '',
      trangThai: item.trangThai,
      mucCanhBao: item.mucCanhBao,
      nhaCungCap: item.nhaCungCap || '',
      ghiChu: item.ghiChu || '',
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa thông tin tồn kho này?')) {
      return;
    }

    try {
      await warehouseInventoryService.deleteInventory(id);
      alert('Xóa thông tin tồn kho thành công!');
      fetchInventory();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Lỗi khi xóa thông tin tồn kho');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.productId) {
      alert('Vui lòng chọn sản phẩm');
      return;
    }

    setLoading(true);
    try {
      // Clean up empty strings for optional fields
      const cleanedData = {
        ...formData,
        viTriKho: formData.viTriKho || undefined,
        ngayNhapGanNhat: formData.ngayNhapGanNhat || undefined,
        hanSuDung: formData.hanSuDung || undefined,
        nhaCungCap: formData.nhaCungCap || undefined,
        ghiChu: formData.ghiChu || undefined,
      };

      if (modalMode === 'create') {
        await warehouseInventoryService.createInventory(cleanedData);
        alert('Tạo thông tin tồn kho thành công!');
      } else if (modalMode === 'edit' && selectedInventory) {
        await warehouseInventoryService.updateInventory(selectedInventory.id, cleanedData);
        alert('Cập nhật thông tin tồn kho thành công!');
      }
      setShowModal(false);
      fetchInventory();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Lỗi khi lưu thông tin tồn kho');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('vi-VN');
  };

  const getStatusBadge = (trangThai: string) => {
    const statusConfig: Record<string, { color: string; icon: React.ReactNode }> = {
      'Bình thường': { color: 'bg-green-100 text-green-800', icon: <CheckCircle className="w-4 h-4" /> },
      'Cảnh báo': { color: 'bg-yellow-100 text-yellow-800', icon: <AlertTriangle className="w-4 h-4" /> },
      'Hết hàng': { color: 'bg-red-100 text-red-800', icon: <AlertTriangle className="w-4 h-4" /> },
    };

    const config = statusConfig[trangThai] || statusConfig['Bình thường'];

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        {config.icon}
        {trangThai}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Quản lý Tồn kho</h2>
          <p className="text-gray-600 mt-1">Danh sách tồn kho sản phẩm</p>
        </div>
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Thêm tồn kho
        </button>
      </div>

      {/* Search */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Tìm kiếm theo mã sản phẩm, tên sản phẩm, vị trí kho..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Mã sản phẩm
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tên sản phẩm
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Số lượng tồn
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Giá trị tồn
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Vị trí kho
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Trạng thái
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Hạn sử dụng
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Hoạt động
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-4 text-center text-gray-500">
                    Đang tải...
                  </td>
                </tr>
              ) : inventory.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-4 text-center text-gray-500">
                    Không có dữ liệu
                  </td>
                </tr>
              ) : (
                inventory.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {item.product.maSanPham}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.product.tenSanPham}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.soLuongTon.toLocaleString()} {item.donVi}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(item.giaTriTon)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.viTriKho || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {getStatusBadge(item.trangThai)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(item.hanSuDung)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleView(item)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Xem chi tiết"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleEdit(item)}
                          className="text-yellow-600 hover:text-yellow-900"
                          title="Chỉnh sửa"
                        >
                          <Edit className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="text-red-600 hover:text-red-900"
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
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Trang {currentPage} / {totalPages}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Trước
              </button>
              <button
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Sau
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <h3 className="text-xl font-semibold text-gray-900">
                {modalMode === 'create' && 'Thêm tồn kho mới'}
                {modalMode === 'edit' && 'Chỉnh sửa tồn kho'}
                {modalMode === 'view' && 'Chi tiết tồn kho'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Sản phẩm */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sản phẩm <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.productId}
                  onChange={(e) => setFormData({ ...formData, productId: e.target.value })}
                  disabled={modalMode === 'view' || modalMode === 'edit'}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                  required
                >
                  <option value="">-- Chọn sản phẩm --</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.maSanPham} - {product.tenSanPham}
                    </option>
                  ))}
                </select>
              </div>

              {/* Row 1: Số lượng tồn, Đơn vị */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Số lượng tồn <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={formData.soLuongTon}
                    onChange={(e) => setFormData({ ...formData, soLuongTon: parseFloat(e.target.value) || 0 })}
                    disabled={modalMode === 'view'}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                    required
                    min="0"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Đơn vị
                  </label>
                  <input
                    type="text"
                    value={formData.donVi}
                    onChange={(e) => setFormData({ ...formData, donVi: e.target.value })}
                    disabled={modalMode === 'view'}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                  />
                </div>
              </div>

              {/* Row 2: Giá trị tồn, Mức cảnh báo */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Giá trị tồn (VNĐ)
                  </label>
                  <input
                    type="number"
                    value={formData.giaTriTon}
                    onChange={(e) => setFormData({ ...formData, giaTriTon: parseFloat(e.target.value) || 0 })}
                    disabled={modalMode === 'view'}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                    min="0"
                    step="1000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mức cảnh báo
                  </label>
                  <input
                    type="number"
                    value={formData.mucCanhBao}
                    onChange={(e) => setFormData({ ...formData, mucCanhBao: parseFloat(e.target.value) || 0 })}
                    disabled={modalMode === 'view'}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>

              {/* Row 3: Vị trí kho, Trạng thái */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Vị trí kho
                  </label>
                  <input
                    type="text"
                    value={formData.viTriKho}
                    onChange={(e) => setFormData({ ...formData, viTriKho: e.target.value })}
                    disabled={modalMode === 'view'}
                    placeholder="VD: Kho lạnh A1-01"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Trạng thái
                  </label>
                  <select
                    value={formData.trangThai}
                    onChange={(e) => setFormData({ ...formData, trangThai: e.target.value })}
                    disabled={modalMode === 'view'}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                  >
                    <option value="Bình thường">Bình thường</option>
                    <option value="Cảnh báo">Cảnh báo</option>
                    <option value="Hết hàng">Hết hàng</option>
                  </select>
                </div>
              </div>

              {/* Row 4: Ngày nhập gần nhất, Hạn sử dụng */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ngày nhập gần nhất
                  </label>
                  <input
                    type="date"
                    value={formData.ngayNhapGanNhat}
                    onChange={(e) => setFormData({ ...formData, ngayNhapGanNhat: e.target.value })}
                    disabled={modalMode === 'view'}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Hạn sử dụng
                  </label>
                  <input
                    type="date"
                    value={formData.hanSuDung}
                    onChange={(e) => setFormData({ ...formData, hanSuDung: e.target.value })}
                    disabled={modalMode === 'view'}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                  />
                </div>
              </div>

              {/* Nhà cung cấp */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nhà cung cấp
                </label>
                <input
                  type="text"
                  value={formData.nhaCungCap}
                  onChange={(e) => setFormData({ ...formData, nhaCungCap: e.target.value })}
                  disabled={modalMode === 'view'}
                  placeholder="Tên nhà cung cấp"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                />
              </div>

              {/* Ghi chú */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ghi chú
                </label>
                <textarea
                  value={formData.ghiChu}
                  onChange={(e) => setFormData({ ...formData, ghiChu: e.target.value })}
                  disabled={modalMode === 'view'}
                  rows={3}
                  placeholder="Ghi chú thêm..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                />
              </div>

              {/* Buttons */}
              {modalMode !== 'view' && (
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Đang lưu...' : modalMode === 'create' ? 'Tạo mới' : 'Cập nhật'}
                  </button>
                </div>
              )}

              {modalMode === 'view' && (
                <div className="flex justify-end pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Đóng
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default WarehouseInventoryManagement;

