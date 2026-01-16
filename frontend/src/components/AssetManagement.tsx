import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, Eye, ChevronDown, ChevronRight, X } from 'lucide-react';
import warehouseService, { Warehouse, LotProduct } from '../services/warehouseService';

interface AssetManagementProps {
  hideHeader?: boolean;
}

const AssetManagement: React.FC<AssetManagementProps> = ({ hideHeader = false }) => {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedWarehouses, setExpandedWarehouses] = useState<Set<string>>(new Set());
  const [expandedLots, setExpandedLots] = useState<Set<string>>(new Set());

  // Modal states
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<LotProduct | null>(null);
  const [editGiaThanh, setEditGiaThanh] = useState<number>(0);

  useEffect(() => {
    fetchWarehouses();
  }, []);

  const fetchWarehouses = async () => {
    setLoading(true);
    try {
      const response = await warehouseService.getAllWarehouses();
      console.log('Warehouses response:', response);

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
    } finally {
      setLoading(false);
    }
  };

  const toggleWarehouse = (warehouseId: string) => {
    const newExpanded = new Set(expandedWarehouses);
    if (newExpanded.has(warehouseId)) {
      newExpanded.delete(warehouseId);
    } else {
      newExpanded.add(warehouseId);
    }
    setExpandedWarehouses(newExpanded);
  };

  const toggleLot = (lotId: string) => {
    const newExpanded = new Set(expandedLots);
    if (newExpanded.has(lotId)) {
      newExpanded.delete(lotId);
    } else {
      newExpanded.add(lotId);
    }
    setExpandedLots(newExpanded);
  };

  const handleViewProduct = (product: LotProduct) => {
    setSelectedProduct(product);
    setViewModalOpen(true);
  };

  const handleEditProduct = (product: LotProduct) => {
    setSelectedProduct(product);
    setEditGiaThanh(product.giaThanh || 100000);
    setEditModalOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedProduct) return;

    try {
      await warehouseService.updateProductQuantity(selectedProduct.id, {
        giaThanh: editGiaThanh,
      });

      // Refresh data
      await fetchWarehouses();
      setEditModalOpen(false);
      setSelectedProduct(null);
    } catch (error) {
      console.error('Error updating product:', error);
      alert('Có lỗi khi cập nhật giá thành');
    }
  };

  // Filter warehouses based on search term
  const filteredWarehouses = warehouses.filter(warehouse =>
    warehouse.tenKho?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    warehouse.maKho?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    warehouse.lots?.some(lot =>
      lot.tenLo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lot.lotProducts?.some(product =>
        product.internationalProduct?.tenSanPham?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.internationalProduct?.maSanPham?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    )
  );

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(value);
  };

  // Calculate total values
  const calculateTotals = () => {
    let totalProducts = 0;
    let totalQuantity = 0;
    let totalValue = 0;

    warehouses.forEach(warehouse => {
      warehouse.lots?.forEach(lot => {
        lot.lotProducts?.forEach(product => {
          totalProducts++;
          totalQuantity += product.soLuong;
          const giaThanh = product.giaThanh || 100000;
          totalValue += product.soLuong * giaThanh;
        });
      });
    });

    return { totalProducts, totalQuantity, totalValue };
  };

  const totals = calculateTotals();

  return (
    <div className="space-y-6">
      {!hideHeader && (
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Quản lý tài sản</h2>
        </div>
      )}

      {/* Search Bar */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <input
            type="text"
            placeholder="Tìm kiếm theo kho, lô, sản phẩm..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
          />
        </div>
      </div>

      {/* Warehouses Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Đang tải dữ liệu...</div>
        ) : filteredWarehouses.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            {searchTerm ? 'Không tìm thấy kho nào' : 'Chưa có kho nào'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-8"></th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kho / Lô / Hàng hóa</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Số lượng</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Đơn vị</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Đơn giá</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Thành tiền</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hoạt động</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredWarehouses.map((warehouse) => (
                  <React.Fragment key={warehouse.id}>
                    {/* Warehouse Row */}
                    <tr className="bg-blue-50 hover:bg-blue-100">
                      <td className="px-4 py-3">
                        <button
                          onClick={() => toggleWarehouse(warehouse.id)}
                          className="text-gray-600 hover:text-gray-900"
                        >
                          {expandedWarehouses.has(warehouse.id) ? (
                            <ChevronDown className="w-5 h-5" />
                          ) : (
                            <ChevronRight className="w-5 h-5" />
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-bold text-blue-900">
                          🏢 {warehouse.tenKho} ({warehouse.maKho})
                        </div>
                      </td>
                      <td colSpan={5} className="px-4 py-3 text-sm text-gray-600">
                        {warehouse.lots?.length || 0} lô
                      </td>
                    </tr>

                    {/* Lots */}
                    {expandedWarehouses.has(warehouse.id) && warehouse.lots?.map((lot) => (
                      <React.Fragment key={lot.id}>
                        {/* Lot Row */}
                        <tr className="bg-green-50 hover:bg-green-100">
                          <td className="px-4 py-3"></td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => toggleLot(lot.id)}
                              className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
                            >
                              {expandedLots.has(lot.id) ? (
                                <ChevronDown className="w-4 h-4" />
                              ) : (
                                <ChevronRight className="w-4 h-4" />
                              )}
                              <span className="font-semibold text-green-900">
                                📦 Lô: {lot.tenLo}
                              </span>
                            </button>
                          </td>
                          <td colSpan={5} className="px-4 py-3 text-sm text-gray-600">
                            {lot.lotProducts?.length || 0} sản phẩm
                          </td>
                        </tr>

                        {/* Products */}
                        {expandedLots.has(lot.id) && lot.lotProducts?.map((product) => {
                          const giaThanh = product.giaThanh || 100000;
                          const thanhTien = product.soLuong * giaThanh;

                          return (
                            <tr key={product.id} className="hover:bg-gray-50">
                              <td className="px-4 py-3"></td>
                              <td className="px-4 py-3">
                                <div className="pl-8 flex items-center gap-2">
                                  <span className="text-orange-500">📦</span>
                                  <div>
                                    <div className="font-medium text-gray-900">
                                      {product.internationalProduct?.tenSanPham || 'N/A'}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      Mã: {product.internationalProduct?.maSanPham || 'N/A'}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                {product.soLuong.toLocaleString('vi-VN')}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                {product.donViTinh}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                {formatCurrency(giaThanh)}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-green-600">
                                {formatCurrency(thanhTien)}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => handleViewProduct(product)}
                                    className="text-blue-600 hover:text-blue-800"
                                    title="Xem chi tiết"
                                  >
                                    <Eye className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleEditProduct(product)}
                                    className="text-green-600 hover:text-green-800"
                                    title="Chỉnh sửa giá"
                                  >
                                    <Edit className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </React.Fragment>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Tổng quan tài sản</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">Tổng số loại sản phẩm</p>
            <p className="text-2xl font-bold text-blue-600">{totals.totalProducts}</p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">Tổng số lượng</p>
            <p className="text-2xl font-bold text-green-600">
              {totals.totalQuantity.toLocaleString('vi-VN')}
            </p>
          </div>
          <div className="bg-orange-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">Tổng giá trị</p>
            <p className="text-2xl font-bold text-orange-600">
              {formatCurrency(totals.totalValue)}
            </p>
          </div>
        </div>
      </div>

      {/* View Product Modal */}
      {viewModalOpen && selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">Chi tiết sản phẩm</h3>
              <button
                onClick={() => setViewModalOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Mã sản phẩm</label>
                  <p className="text-gray-900">{selectedProduct.internationalProduct?.maSanPham || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Tên sản phẩm</label>
                  <p className="text-gray-900">{selectedProduct.internationalProduct?.tenSanPham || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Lô</label>
                  <p className="text-gray-900">{selectedProduct.lot?.tenLo || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Kho</label>
                  <p className="text-gray-900">{selectedProduct.lot?.warehouse?.tenKho || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Số lượng</label>
                  <p className="text-gray-900">{selectedProduct.soLuong.toLocaleString('vi-VN')} {selectedProduct.donViTinh}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Đơn giá</label>
                  <p className="text-gray-900 font-semibold text-green-600">
                    {formatCurrency(selectedProduct.giaThanh || 100000)}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Thành tiền</label>
                  <p className="text-gray-900 font-bold text-orange-600">
                    {formatCurrency(selectedProduct.soLuong * (selectedProduct.giaThanh || 100000))}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Loại sản phẩm</label>
                  <p className="text-gray-900">{selectedProduct.internationalProduct?.loaiSanPham || 'N/A'}</p>
                </div>
              </div>

              {selectedProduct.internationalProduct?.moTaSanPham && (
                <div>
                  <label className="text-sm font-medium text-gray-600">Mô tả</label>
                  <p className="text-gray-900">{selectedProduct.internationalProduct.moTaSanPham}</p>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setViewModalOpen(false)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Product Modal */}
      {editModalOpen && selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">Chỉnh sửa giá thành</h3>
              <button
                onClick={() => setEditModalOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-600">Sản phẩm</label>
                <p className="text-gray-900 font-semibold">
                  {selectedProduct.internationalProduct?.tenSanPham || 'N/A'}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-600">Số lượng</label>
                <p className="text-gray-900">
                  {selectedProduct.soLuong.toLocaleString('vi-VN')} {selectedProduct.donViTinh}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Đơn giá (VND) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={editGiaThanh}
                  onChange={(e) => setEditGiaThanh(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  placeholder="Nhập đơn giá"
                  min="0"
                />
              </div>

              <div className="bg-blue-50 p-3 rounded-lg">
                <label className="text-sm font-medium text-gray-600">Thành tiền</label>
                <p className="text-xl font-bold text-orange-600">
                  {formatCurrency(selectedProduct.soLuong * editGiaThanh)}
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setEditModalOpen(false)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
              >
                Hủy
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
              >
                Lưu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssetManagement;

