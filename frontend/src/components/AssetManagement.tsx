import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import warehouseService, { Warehouse, LotProduct } from '../services/warehouseService';
import Modal from './Modal';
import { parseNumberInput } from '../utils/numberInput';
import TableFilter, { FilterField } from './TableFilter';

interface AssetManagementProps {
  hideHeader?: boolean;
}

const AssetManagement: React.FC<AssetManagementProps> = ({ hideHeader = false }) => {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedWarehouse, setSelectedWarehouse] = useState<Warehouse | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Modal states
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<LotProduct | null>(null);
  const [editGiaThanh, setEditGiaThanh] = useState<number>(0);

  const [filterValues, setFilterValues] = useState<Record<string, string>>({ _search: '', loSanPham: '' });

  const filterFields: FilterField[] = [
    { key: 'loSanPham', label: 'Tên lô', type: 'text', placeholder: 'Lọc theo tên lô...' },
  ];
  const sortWarehouses = (warehousesList: Warehouse[]) => {
    return [...warehousesList].sort((a, b) => {
      const numA = parseInt(a.tenKho.replace(/\D/g, '')) || 0;
      const numB = parseInt(b.tenKho.replace(/\D/g, '')) || 0;
      if (numA !== numB) return numA - numB;
      return a.tenKho.localeCompare(b.tenKho);
    });
  };

  useEffect(() => {
    fetchWarehouses();
  }, []);

  const fetchWarehouses = async () => {
    setLoading(true);
    try {
      const response = await warehouseService.getAllWarehouses();
      console.log('Warehouses response:', response);

      let warehouseData: Warehouse[] = [];
      if (response.data && Array.isArray(response.data.data)) {
        warehouseData = response.data.data;
      } else if (Array.isArray(response.data)) {
        warehouseData = response.data;
      } else {
        console.error('Unexpected warehouses response format:', response.data);
        warehouseData = [];
      }

      const sortedWarehouses = sortWarehouses(warehouseData);
      setWarehouses(sortedWarehouses);

      // Auto-select first warehouse
      if (sortedWarehouses.length > 0 && !selectedWarehouse) {
        setSelectedWarehouse(sortedWarehouses[0]);
      }
    } catch (error: any) {
      console.error('Error fetching warehouses:', error);
      setWarehouses([]);
    } finally {
      setLoading(false);
    }
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

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(value);
  };

  return (
    <div className="space-y-4">
      {!hideHeader && (
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-800">Quản lý tài sản</h2>
        </div>
      )}

      {/* Search & Filter */}
      <TableFilter
        filters={filterFields}
        values={filterValues}
        onChange={(vals) => { setFilterValues(vals); setCurrentPage(1); }}
        searchPlaceholder="Tìm kiếm tên, mã sản phẩm..."
      />

      {/* Warehouse Tabs - Machine style */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6 overflow-x-auto" aria-label="Warehouse Tabs">
            {warehouses.map((warehouse) => (
              <button
                key={warehouse.id}
                onClick={() => { setSelectedWarehouse(warehouse); setCurrentPage(1); }}
                className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  selectedWarehouse?.id === warehouse.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {warehouse.tenKho}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Warehouse Content */}
      {loading ? (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">Đang tải dữ liệu...</div>
      ) : warehouses.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">Chưa có kho nào</div>
      ) : selectedWarehouse && (
        <div className="bg-white rounded-lg shadow p-6">
          {/* Warehouse Summary */}
          <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">Tổng số lô:</span>
              <span className="text-lg font-bold text-blue-600">{selectedWarehouse.lots?.length || 0}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">Tổng thành tiền:</span>
              <span className="text-lg font-bold text-green-600">
                {formatCurrency(
                  selectedWarehouse.lots?.reduce((warehouseSum, lot) => {
                    const lotTotal = lot.lotProducts?.reduce((lotSum, product) => {
                      const giaThanh = product.giaThanh || 100000;
                      return lotSum + (product.soLuong * giaThanh);
                    }, 0) || 0;
                    return warehouseSum + lotTotal;
                  }, 0) || 0
                )}
              </span>
            </div>
          </div>

          {/* Lots Table */}
          {selectedWarehouse?.lots && selectedWarehouse.lots.length > 0 ? (() => {
            const search = filterValues._search.toLowerCase();
            const loFilter = filterValues.loSanPham.toLowerCase();
            const filteredLots = selectedWarehouse.lots
              .map(lot => {
                const filteredProducts = (lot.lotProducts || []).filter(p => {
                  if (search && !p.internationalProduct?.tenSanPham?.toLowerCase().includes(search) && !p.internationalProduct?.maSanPham?.toLowerCase().includes(search)) return false;
                  return true;
                });
                return { ...lot, lotProducts: filteredProducts };
              })
              .filter(lot => {
                if (loFilter && !lot.tenLo.toLowerCase().includes(loFilter)) return false;
                return true;
              });
            const pagedLots = filteredLots.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
            const totalFilteredItems = filteredLots.length;
            const totalFilteredPages = Math.ceil(totalFilteredItems / itemsPerPage);
            return (
              <div className="space-y-4">
                {pagedLots.map((lot) => (
                <div key={lot.id} className="border border-gray-200 rounded-lg overflow-hidden">
                  {/* Lot Header */}
                  <div className="flex justify-between items-center px-4 py-3 bg-gray-50 border-b border-gray-200">
                    <h3 className="text-base font-semibold text-blue-600">{lot.tenLo}</h3>
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-gray-500">{lot.lotProducts?.length || 0} sản phẩm</span>
                      <span className="text-sm font-semibold text-green-600">
                        Tổng thành tiền: {formatCurrency(
                          lot.lotProducts?.reduce((sum, product) => {
                            const giaThanh = product.giaThanh || 100000;
                            return sum + (product.soLuong * giaThanh);
                          }, 0) || 0
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Products in Lot */}
                  {lot?.lotProducts && lot.lotProducts.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-300">
                          <tr>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-r border-gray-200">
                              Tên hàng hóa
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-r border-gray-200">
                              Số lượng
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-r border-gray-200">
                              Đơn vị
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-r border-gray-200">
                              Đơn giá
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-r border-gray-200">
                              Thành tiền
                            </th>
                            <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                              Hành động
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {lot.lotProducts.map((product, prodIndex) => {
                            const giaThanh = product.giaThanh || 100000;
                            const thanhTien = product.soLuong * giaThanh;
                            return (
                              <tr
                                key={product.id}
                                onClick={() => handleViewProduct(product)}
                                className={`border-b border-gray-200 hover:bg-blue-100 border-l-2 border-l-transparent hover:border-l-blue-500 cursor-pointer transition-all ${prodIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                              >
                                <td className="px-6 py-4 text-sm text-gray-700 border-r border-gray-200">
                                  <div>
                                    <div className="font-medium">{product.internationalProduct?.tenSanPham || '-'}</div>
                                    <div className="text-xs text-gray-500">Mã: {product.internationalProduct?.maSanPham || '-'}</div>
                                  </div>
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-700 font-medium border-r border-gray-200">
                                  {product.soLuong.toLocaleString('vi-VN')}
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-700 border-r border-gray-200">
                                  {product.donViTinh}
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-700 border-r border-gray-200">
                                  {formatCurrency(giaThanh)}
                                </td>
                                <td className="px-6 py-4 text-sm font-semibold text-green-600 border-r border-gray-200">
                                  {formatCurrency(thanhTien)}
                                </td>
                                <td className="px-6 py-4 text-sm">
                                  <div className="flex justify-center gap-1">
                                    {/* Actions removed - use row click to view, then edit from modal */}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="px-4 py-6 text-center text-gray-500 text-sm bg-white">
                      Chưa có sản phẩm trong lô này
                    </div>
                  )}
                </div>
              ))}
              {totalFilteredPages > 1 && (
                <div className="flex items-center justify-between mt-4 px-2">
                  <span className="text-sm text-gray-600">
                    Hiển thị {(currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, totalFilteredItems)} / {totalFilteredItems} mục
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Trước
                    </button>
                    {Array.from({ length: totalFilteredPages }, (_, i) => i + 1)
                      .filter(page => page === 1 || page === totalFilteredPages || Math.abs(page - currentPage) <= 2)
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
                      onClick={() => setCurrentPage(p => Math.min(totalFilteredPages, p + 1))}
                      disabled={currentPage === totalFilteredPages}
                      className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Sau
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
          })() : (
            <p className="text-center text-gray-500">Chưa có lô nào trong kho này</p>
          )}
        </div>
      )}

      {/* View Product Modal */}
      <Modal isOpen={viewModalOpen && !!selectedProduct} onClose={() => setViewModalOpen(false)} showBackdrop closeOnBackdrop={true}>
        <div className="bg-white rounded-lg max-w-2xl w-full mx-4 flex flex-col max-h-[calc(100vh-2rem)]" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 overflow-y-auto flex-1">
            {selectedProduct && (<>
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

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setViewModalOpen(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Đóng
              </button>
              <button
                onClick={() => {
                  setViewModalOpen(false);
                  if (selectedProduct) handleEditProduct(selectedProduct);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Chỉnh sửa
              </button>
            </div>
            </>)}
          </div>
        </div>
      </Modal>

      {/* Edit Product Modal */}
      <Modal isOpen={editModalOpen && !!selectedProduct} onClose={() => setEditModalOpen(false)} showBackdrop>
        <div className="bg-white rounded-lg max-w-md w-full mx-4 flex flex-col max-h-[calc(100vh-2rem)]" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 overflow-y-auto flex-1">
            {selectedProduct && (<>
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
                  onChange={(e) => setEditGiaThanh(parseNumberInput(e.target.value))}
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
            </>)}
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default AssetManagement;

