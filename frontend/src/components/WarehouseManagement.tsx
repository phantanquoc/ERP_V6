import React, { useState, useEffect } from 'react';
import { Plus, Trash2, MoveRight } from 'lucide-react';
import warehouseService, { Warehouse, Lot, LotProduct } from '../services/warehouseService';
import internationalProductService, { InternationalProduct } from '../services/internationalProductService';

const WarehouseManagement: React.FC = () => {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState<Warehouse | null>(null);
  const [products, setProducts] = useState<InternationalProduct[]>([]);
  const [loading, setLoading] = useState(false);

  // Modal states
  const [showWarehouseModal, setShowWarehouseModal] = useState(false);
  const [showLotModal, setShowLotModal] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [showMoveModal, setShowMoveModal] = useState(false);

  // Form states
  const [newWarehouseName, setNewWarehouseName] = useState('');
  const [newLotName, setNewLotName] = useState('');
  const [selectedLotId, setSelectedLotId] = useState('');
  const [selectedProductType, setSelectedProductType] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [productQuantity, setProductQuantity] = useState('');
  const [productUnit, setProductUnit] = useState('');
  const [movingProduct, setMovingProduct] = useState<LotProduct | null>(null);
  const [targetWarehouseId, setTargetWarehouseId] = useState('');
  const [targetLotId, setTargetLotId] = useState('');

  useEffect(() => {
    fetchWarehouses();
    fetchProducts();
  }, []);

  // Sort warehouses by name (extract number and sort)
  const sortWarehouses = (warehousesList: Warehouse[]) => {
    return [...warehousesList].sort((a, b) => {
      // Extract numbers from warehouse names
      const numA = parseInt(a.tenKho.replace(/\D/g, '')) || 0;
      const numB = parseInt(b.tenKho.replace(/\D/g, '')) || 0;
      if (numA !== numB) return numA - numB;
      // If no numbers or same numbers, sort alphabetically
      return a.tenKho.localeCompare(b.tenKho);
    });
  };

  const fetchWarehouses = async () => {
    try {
      setLoading(true);
      const response = await warehouseService.getAllWarehouses();
      const warehousesData = response.data.data;
      const sortedWarehouses = sortWarehouses(warehousesData);
      setWarehouses(sortedWarehouses);

      // Update selected warehouse if it exists
      if (selectedWarehouse) {
        const updatedWarehouse = sortedWarehouses.find((w: Warehouse) => w.id === selectedWarehouse.id);
        if (updatedWarehouse) {
          setSelectedWarehouse(updatedWarehouse);
        }
      } else if (sortedWarehouses.length > 0) {
        setSelectedWarehouse(sortedWarehouses[0]);
      }
    } catch (error) {
      console.error('Error fetching warehouses:', error);
      alert('Lỗi khi tải danh sách kho');
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await internationalProductService.getAllProducts(1, 1000); // Get all products
      console.log('Products response:', response);
      setProducts(response.data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
      setProducts([]);
    }
  };

  const handleCreateWarehouse = async () => {
    if (!newWarehouseName.trim()) {
      alert('Vui lòng nhập tên kho');
      return;
    }

    try {
      await warehouseService.createWarehouse({ tenKho: newWarehouseName });
      alert('Tạo kho thành công!');
      setShowWarehouseModal(false);
      setNewWarehouseName('');
      fetchWarehouses();
    } catch (error: any) {
      console.error('Error creating warehouse:', error);
      alert(error.response?.data?.message || 'Lỗi khi tạo kho');
    }
  };

  const handleDeleteWarehouse = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa kho này?')) return;

    try {
      await warehouseService.deleteWarehouse(id);
      alert('Xóa kho thành công!');
      fetchWarehouses();
      if (selectedWarehouse?.id === id) {
        setSelectedWarehouse(null);
      }
    } catch (error: any) {
      console.error('Error deleting warehouse:', error);
      alert(error.response?.data?.message || 'Lỗi khi xóa kho');
    }
  };

  const handleCreateLot = async () => {
    if (!newLotName.trim() || !selectedWarehouse) {
      alert('Vui lòng nhập tên lô');
      return;
    }

    try {
      await warehouseService.createLot({
        tenLo: newLotName,
        warehouseId: selectedWarehouse.id,
      });
      alert('Tạo lô thành công!');
      setShowLotModal(false);
      setNewLotName('');
      fetchWarehouses();
    } catch (error: any) {
      console.error('Error creating lot:', error);
      alert(error.response?.data?.message || 'Lỗi khi tạo lô');
    }
  };

  const handleDeleteLot = async (lotId: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa lô này?')) return;

    try {
      await warehouseService.deleteLot(lotId);
      alert('Xóa lô thành công!');
      fetchWarehouses();
    } catch (error: any) {
      console.error('Error deleting lot:', error);
      alert(error.response?.data?.message || 'Lỗi khi xóa lô');
    }
  };

  const handleAddProductToLot = async () => {
    if (!selectedLotId || !selectedProductId || productQuantity === '' || !productUnit) {
      alert('Vui lòng điền đầy đủ thông tin');
      return;
    }

    try {
      console.log('Adding product to lot:', {
        lotId: selectedLotId,
        internationalProductId: selectedProductId,
        soLuong: parseFloat(productQuantity),
        donViTinh: productUnit,
      });

      const response = await warehouseService.addProductToLot({
        lotId: selectedLotId,
        internationalProductId: selectedProductId,
        soLuong: parseFloat(productQuantity),
        donViTinh: productUnit,
      });

      console.log('Product added successfully:', response.data);
      alert('Thêm sản phẩm vào lô thành công!');
      setShowProductModal(false);
      resetProductForm();
      await fetchWarehouses();
    } catch (error: any) {
      console.error('Error adding product to lot:', error);
      console.error('Error response:', error.response?.data);
      alert(error.response?.data?.message || 'Lỗi khi thêm sản phẩm');
    }
  };

  const resetProductForm = () => {
    setSelectedLotId('');
    setSelectedProductType('');
    setSelectedProductId('');
    setProductQuantity('');
    setProductUnit('');
  };

  // Filter products by type
  const filteredProducts = selectedProductType
    ? products.filter((p) => p.loaiSanPham === selectedProductType)
    : products;

  // Get unique product types
  const productTypes = Array.from(new Set(products.map((p) => p.loaiSanPham).filter(Boolean)));

  const handleRemoveProduct = async (productId: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa sản phẩm này khỏi lô?')) return;

    try {
      await warehouseService.removeProductFromLot(productId);
      alert('Xóa sản phẩm thành công!');
      fetchWarehouses();
    } catch (error: any) {
      console.error('Error removing product:', error);
      alert(error.response?.data?.message || 'Lỗi khi xóa sản phẩm');
    }
  };

  const handleMoveProduct = async () => {
    if (!movingProduct || !targetLotId) {
      alert('Vui lòng chọn lô đích');
      return;
    }

    try {
      await warehouseService.moveProductBetweenLots({
        lotProductId: movingProduct.id,
        targetLotId,
      });
      alert('Di chuyển sản phẩm thành công!');
      setShowMoveModal(false);
      setMovingProduct(null);
      setTargetWarehouseId('');
      setTargetLotId('');
      fetchWarehouses();
    } catch (error: any) {
      console.error('Error moving product:', error);
      alert(error.response?.data?.message || 'Lỗi khi di chuyển sản phẩm');
    }
  };

  const openMoveModal = (product: LotProduct) => {
    setMovingProduct(product);
    setTargetWarehouseId('');
    setTargetLotId('');
    setShowMoveModal(true);
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Quản lý kho</h1>

      {/* Warehouse Tabs - Machine style */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6 overflow-x-auto" aria-label="Warehouse Tabs">
            {warehouses.map((warehouse) => (
              <button
                key={warehouse.id}
                onClick={() => setSelectedWarehouse(warehouse)}
                className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  selectedWarehouse?.id === warehouse.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {warehouse.tenKho}
              </button>
            ))}
            <button
              onClick={() => setShowWarehouseModal(true)}
              className="whitespace-nowrap py-4 px-1 border-b-2 border-transparent font-medium text-sm text-green-600 hover:text-green-700 hover:border-green-300 transition-colors"
            >
              + Thêm kho
            </button>
          </nav>
        </div>
      </div>

      {/* Warehouse Content */}
      {selectedWarehouse && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-end items-center mb-4">
            <div className="flex gap-2">
              <button
                onClick={() => setShowLotModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Thêm lô
              </button>
              <button
                onClick={() => handleDeleteWarehouse(selectedWarehouse.id)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Xóa kho
              </button>
            </div>
          </div>

          {/* Lots Table */}
          {loading ? (
            <p className="text-center text-gray-500">Đang tải...</p>
          ) : selectedWarehouse?.lots && selectedWarehouse.lots.length > 0 ? (
            <div className="space-y-4">
              {selectedWarehouse.lots.map((lot) => (
                <div key={lot.id} className="border border-gray-200 rounded-lg overflow-hidden">
                  {/* Lot Header */}
                  <div className="flex justify-between items-center px-4 py-3 bg-gray-50 border-b border-gray-200">
                    <h3 className="text-base font-semibold text-gray-800">{lot.tenLo}</h3>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setSelectedLotId(lot.id);
                          setShowProductModal(true);
                        }}
                        className="px-3 py-1.5 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm font-medium flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Thêm sản phẩm
                      </button>
                      <button
                        onClick={() => handleDeleteLot(lot.id)}
                        className="px-3 py-1.5 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm font-medium flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Xóa lô
                      </button>
                    </div>
                  </div>

                  {/* Products in Lot */}
                  {lot?.lotProducts && lot.lotProducts.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full table-fixed">
                        <thead className="bg-gray-100">
                          <tr>
                            <th className="w-[50%] px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                              Tên hàng hóa
                            </th>
                            <th className="w-[30%] px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                              Số lượng
                            </th>
                            <th className="w-[20%] px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                              Hành động
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 bg-white">
                          {lot.lotProducts.map((product) => (
                            <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                              <td className="px-4 py-3 text-sm text-gray-900">
                                {product.internationalProduct?.tenSanPham || '-'}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                                {product.soLuong} {product.donViTinh}
                              </td>
                              <td className="px-4 py-3 text-sm">
                                <div className="flex justify-center gap-3">
                                  <button
                                    onClick={() => openMoveModal(product)}
                                    className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                                    title="Di chuyển"
                                  >
                                    <MoveRight className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleRemoveProduct(product.id)}
                                    className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
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
                    </div>
                  ) : (
                    <div className="px-4 py-6 text-center text-gray-500 text-sm bg-white">
                      Chưa có sản phẩm trong lô này
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500">Chưa có lô nào</p>
          )}
        </div>
      )}

      {/* Create Warehouse Modal */}
      {showWarehouseModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h2 className="text-xl font-bold mb-4">Tạo kho mới</h2>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tên kho <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={newWarehouseName}
                onChange={(e) => setNewWarehouseName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Nhập tên kho"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowWarehouseModal(false);
                  setNewWarehouseName('');
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Hủy
              </button>
              <button
                onClick={handleCreateWarehouse}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Tạo mới
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Lot Modal */}
      {showLotModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h2 className="text-xl font-bold mb-4">Tạo lô mới</h2>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tên lô <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={newLotName}
                onChange={(e) => setNewLotName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Nhập tên lô"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowLotModal(false);
                  setNewLotName('');
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Hủy
              </button>
              <button
                onClick={handleCreateLot}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Tạo mới
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Product to Lot Modal */}
      {showProductModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h2 className="text-xl font-bold mb-4">Thêm sản phẩm vào lô</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Loại sản phẩm
                </label>
                <select
                  value={selectedProductType}
                  onChange={(e) => {
                    setSelectedProductType(e.target.value);
                    setSelectedProductId(''); // Reset product selection when type changes
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Tất cả loại sản phẩm --</option>
                  {productTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sản phẩm <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Chọn sản phẩm --</option>
                  {(filteredProducts || []).map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.tenSanPham}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Số lượng <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={productQuantity}
                  onChange={(e) => setProductQuantity(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Nhập số lượng"
                  min="0"
                  step="0.01"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Đơn vị tính <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={productUnit}
                  onChange={(e) => setProductUnit(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="VD: kg, thùng, cái"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => {
                  setShowProductModal(false);
                  resetProductForm();
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Hủy
              </button>
              <button
                onClick={handleAddProductToLot}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Thêm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Move Product Modal */}
      {showMoveModal && movingProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h2 className="text-xl font-bold mb-4">Di chuyển sản phẩm</h2>
            <p className="text-sm text-gray-600 mb-4">
              Sản phẩm: <strong>{movingProduct.internationalProduct?.tenSanPham}</strong>
            </p>

            {/* Select Warehouse */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Chọn kho đích <span className="text-red-500">*</span>
              </label>
              <select
                value={targetWarehouseId}
                onChange={(e) => {
                  setTargetWarehouseId(e.target.value);
                  setTargetLotId(''); // Reset lot when warehouse changes
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Chọn kho --</option>
                {warehouses.map((warehouse) => (
                  <option key={warehouse.id} value={warehouse.id}>
                    {warehouse.tenKho}
                  </option>
                ))}
              </select>
            </div>

            {/* Select Lot */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Chọn lô đích <span className="text-red-500">*</span>
              </label>
              <select
                value={targetLotId}
                onChange={(e) => setTargetLotId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                disabled={!targetWarehouseId}
              >
                <option value="">-- Chọn lô --</option>
                {targetWarehouseId && warehouses
                  .find(w => w.id === targetWarehouseId)
                  ?.lots?.map((lot) => (
                    <option key={lot.id} value={lot.id}>
                      {lot.tenLo}
                    </option>
                  ))
                }
              </select>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowMoveModal(false);
                  setMovingProduct(null);
                  setTargetWarehouseId('');
                  setTargetLotId('');
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Hủy
              </button>
              <button
                onClick={handleMoveProduct}
                disabled={!targetLotId}
                className={`px-4 py-2 rounded-lg ${
                  targetLotId
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                Di chuyển
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WarehouseManagement;

