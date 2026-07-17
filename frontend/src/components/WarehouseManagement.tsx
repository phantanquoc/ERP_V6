import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Plus, Trash2, MoveRight, Package, Warehouse as WarehouseIcon, PackagePlus } from 'lucide-react';
import { Warehouse, Lot, LotProduct } from '../services/warehouseService';
import {
  useWarehouses,
  useCreateWarehouse, useDeleteWarehouse,
  useCreateLot, useDeleteLot,
  useAddProductToLot, useRemoveProductFromLot, useMoveProductBetweenLots,
} from '../hooks';
import { useProducts } from '../hooks';
import { parseNumberInputStr } from '../utils/numberInput';
import Modal from './Modal';
import ProductCombobox from './common/ProductCombobox';
import UnitSelect from './common/UnitSelect';
import { DEFAULT_DON_VI_TINH, DON_VI_TINH_OPTIONS } from '../constants/units';

interface WarehouseManagementProps {
  initialWarehouseId?: string;
}

const WarehouseManagement: React.FC<WarehouseManagementProps> = ({ initialWarehouseId }) => {
  const [selectedWarehouse, setSelectedWarehouse] = useState<Warehouse | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // React Query hooks for warehouses
  const { data: warehousesData, isLoading: loading } = useWarehouses();
  const createWarehouse = useCreateWarehouse();
  const deleteWarehouse = useDeleteWarehouse();
  const createLot = useCreateLot();
  const deleteLot = useDeleteLot();
  const addProductToLot = useAddProductToLot();
  const removeProductFromLot = useRemoveProductFromLot();
  const moveProductBetweenLots = useMoveProductBetweenLots();

  // Fetch all international products via TanStack Query
  const { data: productsData } = useProducts({ page: 1, limit: 1000 });
  const products = productsData?.data || [];

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

  const warehouses = React.useMemo(() => {
    if (!warehousesData) return [];
    return sortWarehouses(warehousesData);
  }, [warehousesData]);

  // Modal states
  const [showWarehouseModal, setShowWarehouseModal] = useState(false);
  const [showLotModal, setShowLotModal] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [showMoveModal, setShowMoveModal] = useState(false);

  // Form states
  const [newWarehouseName, setNewWarehouseName] = useState('');
  const [newLotName, setNewLotName] = useState('');
  const [selectedLotId, setSelectedLotId] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [productQuantity, setProductQuantity] = useState('');
  const [productUnit, setProductUnit] = useState(DEFAULT_DON_VI_TINH);
  const [quantityTouched, setQuantityTouched] = useState(false);
  const [movingProduct, setMovingProduct] = useState<LotProduct | null>(null);
  const [targetWarehouseId, setTargetWarehouseId] = useState('');
  const [targetLotId, setTargetLotId] = useState('');

  // Update selectedWarehouse when warehouses change
  useEffect(() => {
    if (warehouses.length > 0 && selectedWarehouse) {
      const updatedWarehouse = warehouses.find((w: Warehouse) => w.id === selectedWarehouse.id);
      if (updatedWarehouse) {
        setSelectedWarehouse(updatedWarehouse);
      }
    }
  }, [warehouses]);

  // Preselect warehouse when initialWarehouseId is provided
  useEffect(() => {
    if (!initialWarehouseId || warehouses.length === 0) return;
    if (selectedWarehouse?.id === initialWarehouseId) return;
    const target = warehouses.find((w: Warehouse) => w.id === initialWarehouseId);
    if (target) {
      setSelectedWarehouse(target);
      setCurrentPage(1);
    }
  }, [warehouses, initialWarehouseId]);

  const handleCreateWarehouse = async () => {
    if (!newWarehouseName.trim()) {
      toast.error('Vui lòng nhập tên kho');
      return;
    }

    try {
      await createWarehouse.mutateAsync({ tenKho: newWarehouseName });
      toast.success('Tạo kho thành công');
      setShowWarehouseModal(false);
      setNewWarehouseName('');
    } catch (error: any) {
      toast.error(error instanceof Error ? error.message : 'Lỗi khi tạo kho');
    }
  };

  const handleDeleteWarehouse = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa kho này?')) return;

    try {
      await deleteWarehouse.mutateAsync(id);
      toast.success('Xóa kho thành công');
      if (selectedWarehouse?.id === id) {
        setSelectedWarehouse(null);
      }
    } catch (error: any) {
      toast.error(error instanceof Error ? error.message : 'Lỗi khi xóa kho');
    }
  };

  const handleCreateLot = async () => {
    if (!newLotName.trim() || !selectedWarehouse) {
      toast.error('Vui lòng nhập tên lô');
      return;
    }

    try {
      await createLot.mutateAsync({
        tenLo: newLotName,
        warehouseId: selectedWarehouse.id,
      });
      toast.success('Tạo lô thành công');
      setShowLotModal(false);
      setNewLotName('');
    } catch (error: any) {
      toast.error(error instanceof Error ? error.message : 'Lỗi khi tạo lô');
    }
  };

  const handleDeleteLot = async (lotId: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa lô này?')) return;

    try {
      await deleteLot.mutateAsync(lotId);
      toast.success('Xóa lô thành công');
    } catch (error: any) {
      toast.error(error instanceof Error ? error.message : 'Lỗi khi xóa lô');
    }
  };

  const handleAddProductToLot = async () => {
    if (!selectedLotId || !selectedProductId || productQuantity === '' || !productUnit) {
      toast.error('Vui lòng điền đầy đủ thông tin');
      return;
    }

    try {
      console.log('Adding product to lot:', {
        lotId: selectedLotId,
        internationalProductId: selectedProductId,
        soLuong: parseFloat(productQuantity),
        donViTinh: productUnit,
      });

      const response = await addProductToLot.mutateAsync({
        lotId: selectedLotId,
        internationalProductId: selectedProductId,
        soLuong: parseFloat(productQuantity),
        donViTinh: productUnit,
      });

      console.log('Product added successfully:', response.data);
      toast.success('Thêm sản phẩm vào lô thành công');
      setShowProductModal(false);
      resetProductForm();
    } catch (error: any) {
      toast.error(error instanceof Error ? error.message : 'Lỗi khi thêm sản phẩm');
    }
  };

  const resetProductForm = () => {
    setSelectedLotId('');
    setSelectedProductId('');
    setProductQuantity('');
    setProductUnit(DEFAULT_DON_VI_TINH);
    setQuantityTouched(false);
  };

  const handleRemoveProduct = async (productId: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa sản phẩm này khỏi lô?')) return;

    try {
      await removeProductFromLot.mutateAsync(productId);
      toast.success('Xóa sản phẩm thành công');
    } catch (error: any) {
      toast.error(error instanceof Error ? error.message : 'Lỗi khi xóa sản phẩm');
    }
  };

  const handleMoveProduct = async () => {
    if (!movingProduct || !targetLotId) {
      toast.error('Vui lòng chọn lô đích');
      return;
    }

    try {
      await moveProductBetweenLots.mutateAsync({
        lotProductId: movingProduct.id,
        targetLotId,
      });
      toast.success('Di chuyển sản phẩm thành công');
      setShowMoveModal(false);
      setMovingProduct(null);
      setTargetWarehouseId('');
      setTargetLotId('');
    } catch (error: any) {
      toast.error(error instanceof Error ? error.message : 'Lỗi khi di chuyển sản phẩm');
    }
  };

  const openMoveModal = (product: LotProduct) => {
    setMovingProduct(product);
    setTargetWarehouseId('');
    setTargetLotId('');
    setShowMoveModal(true);
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Quản lý kho</h2>
      </div>

      {/* Warehouse Tabs */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-1 px-4 overflow-x-auto" aria-label="Warehouse Tabs">
            {warehouses.map((warehouse) => (
              <button
                key={warehouse.id}
                onClick={() => { setSelectedWarehouse(warehouse); setCurrentPage(1); }}
                className={`whitespace-nowrap py-3 px-4 border-b-2 font-medium text-sm transition-colors flex items-center gap-2 ${
                  selectedWarehouse?.id === warehouse.id
                    ? 'border-blue-500 text-blue-600 bg-blue-50/50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <WarehouseIcon className="w-3.5 h-3.5" />
                {warehouse.tenKho}
                {warehouse.lots && warehouse.lots.length > 0 && (
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                    selectedWarehouse?.id === warehouse.id
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-500'
                  }`}>
                    {warehouse.lots.length}
                  </span>
                )}
              </button>
            ))}
            <button
              onClick={() => setShowWarehouseModal(true)}
              className="whitespace-nowrap py-3 px-4 border-b-2 border-transparent font-medium text-sm text-green-600 hover:text-green-700 hover:border-green-400 hover:bg-green-50/50 transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Thêm kho
            </button>
          </nav>
        </div>
      </div>

      {/* Warehouse Content */}
      {selectedWarehouse && (
        <div className="bg-white rounded-lg shadow">
          {/* Warehouse Header */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 px-4 sm:px-6 py-4 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <WarehouseIcon className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-gray-900">{selectedWarehouse.tenKho}</h2>
                <p className="text-xs text-gray-500">{selectedWarehouse.lots?.length || 0} lô</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
              <button
                onClick={() => setShowLotModal(true)}
                className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium flex items-center justify-center gap-1.5 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Thêm lô
              </button>
              <button
                onClick={() => handleDeleteWarehouse(selectedWarehouse.id)}
                className="px-3 py-2 bg-white text-red-600 border border-red-200 rounded-lg hover:bg-red-50 text-sm font-medium flex items-center justify-center gap-1.5 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Xóa kho
              </button>
            </div>
          </div>

          {/* Lots */}
          <div className="p-4 sm:p-6">
          {loading ? (
            <p className="text-center text-gray-500 py-8">Đang tải...</p>
          ) : selectedWarehouse?.lots && selectedWarehouse.lots.length > 0 ? (
            <div className="space-y-3">
              {(() => {
                const allLots = selectedWarehouse.lots;
                const lotsTotalPages = Math.ceil(allLots.length / itemsPerPage);
                const paginatedLots = allLots.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
                return (
                  <>
                    {paginatedLots.map((lot, lotIndex) => (
                <div key={lot.id} className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                  {/* Lot Header */}
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 px-4 py-3 bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-700">
                        {(currentPage - 1) * itemsPerPage + lotIndex + 1}
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-gray-800">{lot.tenLo}</h3>
                        <p className="text-xs text-gray-400">{lot.lotProducts?.length || 0} sản phẩm</p>
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                      <button
                        onClick={() => {
                          setSelectedLotId(lot.id);
                          setShowProductModal(true);
                        }}
                        className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <PackagePlus className="w-3.5 h-3.5" />
                        Thêm sản phẩm
                      </button>
                      <button
                        onClick={() => handleDeleteLot(lot.id)}
                        className="px-3 py-1.5 bg-white text-red-500 border border-red-200 rounded-lg hover:bg-red-50 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Xóa lô
                      </button>
                    </div>
                  </div>

                  {/* Products in Lot */}
                  {lot?.lotProducts && lot.lotProducts.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[520px] table-fixed">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="w-[50%] px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                              Tên hàng hóa
                            </th>
                            <th className="w-[30%] px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                              Số lượng
                            </th>
                            <th className="w-[20%] px-4 py-2.5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                              Hành động
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white">
                          {lot.lotProducts.map((product, idx) => (
                            <tr key={product.id} className={`hover:bg-blue-50/40 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                              <td className="px-4 py-3 text-sm text-gray-900 flex items-center gap-2">
                                <Package className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                {product.internationalProduct?.tenSanPham || '-'}
                              </td>
                              <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md text-xs font-semibold">
                                  {product.soLuong} {product.donViTinh}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm">
                                <div className="flex justify-center gap-2">
                                  <button
                                    onClick={() => openMoveModal(product)}
                                    className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                                    title="Di chuyển sang lô khác"
                                  >
                                    <MoveRight className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleRemoveProduct(product.id)}
                                    className="p-1.5 text-red-500 hover:bg-red-100 rounded-lg transition-colors"
                                    title="Xóa sản phẩm"
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
                    <div className="px-4 py-8 text-center bg-white">
                      <Package className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-gray-400">Chưa có sản phẩm trong lô này</p>
                    </div>
                  )}
                </div>
              ))}
                    {lotsTotalPages > 1 && (
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-4 px-2">
                        <span className="text-sm text-gray-600">
                          Hiển thị {(currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, allLots.length)} / {allLots.length} lô
                        </span>
                        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
                          <button
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Trước
                          </button>
                          {Array.from({ length: lotsTotalPages }, (_, i) => i + 1)
                            .filter(page => page === 1 || page === lotsTotalPages || Math.abs(page - currentPage) <= 2)
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
                            onClick={() => setCurrentPage(p => Math.min(lotsTotalPages, p + 1))}
                            disabled={currentPage === lotsTotalPages}
                            className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Sau
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          ) : (
            <div className="text-center py-12">
              <WarehouseIcon className="w-12 h-12 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">Chưa có lô nào trong kho này</p>
              <button
                onClick={() => setShowLotModal(true)}
                className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium inline-flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                Thêm lô đầu tiên
              </button>
            </div>
          )}
          </div>
        </div>
      )}

      {/* Create Warehouse Modal */}
      <Modal isOpen={showWarehouseModal} onClose={() => { setShowWarehouseModal(false); setNewWarehouseName(''); }} showBackdrop>
          <div className="bg-white rounded-lg shadow-xl w-[calc(100vw-2rem)] sm:w-96 flex flex-col max-h-[calc(100vh-2rem)]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
              <h2 className="text-xl font-bold">Tạo kho mới</h2>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
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
            <div className="flex flex-col sm:flex-row sm:justify-end gap-2">
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
      </Modal>

      {/* Create Lot Modal */}
      <Modal isOpen={showLotModal} onClose={() => { setShowLotModal(false); setNewLotName(''); }} showBackdrop>
          <div className="bg-white rounded-lg shadow-xl w-[calc(100vw-2rem)] sm:w-96 flex flex-col max-h-[calc(100vh-2rem)]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
              <h2 className="text-xl font-bold">Tạo lô mới</h2>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
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
            <div className="flex flex-col sm:flex-row sm:justify-end gap-2">
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
      </Modal>

      {/* Add Product to Lot Modal */}
      <Modal isOpen={showProductModal} onClose={() => { setShowProductModal(false); resetProductForm(); }} showBackdrop>
          <div className="bg-white rounded-lg shadow-xl w-[calc(100vw-2rem)] sm:w-96 flex flex-col max-h-[calc(100vh-2rem)]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
              <h2 className="text-xl font-bold">Thêm sản phẩm vào lô</h2>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sản phẩm <span className="text-red-500">*</span>
                </label>
                <ProductCombobox
                  products={products}
                  value={selectedProductId || null}
                  onChange={(productId, product) => {
                    setSelectedProductId(productId ?? '');
                    // Auto-fill unit from product if it matches a standard option
                    if (product?.donViTinh && DON_VI_TINH_OPTIONS.includes(product.donViTinh)) {
                      setProductUnit(product.donViTinh);
                    } else if (!productId) {
                      // Reset to default when clearing
                      setProductUnit(DEFAULT_DON_VI_TINH);
                    }
                  }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Số lượng <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={productQuantity}
                  onChange={(e) => setProductQuantity(parseNumberInputStr(e.target.value))}
                  onBlur={() => setQuantityTouched(true)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none ${
                    quantityTouched && (!productQuantity || parseFloat(productQuantity) <= 0)
                      ? 'border-red-400 focus:ring-red-400'
                      : 'border-gray-300'
                  }`}
                  placeholder="Nhập số lượng"
                  min="0"
                  step="0.01"
                />
                {quantityTouched && (!productQuantity || parseFloat(productQuantity) <= 0) && (
                  <p className="mt-1 text-xs text-red-500">Số lượng phải lớn hơn 0</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Đơn vị tính <span className="text-red-500">*</span>
                </label>
                <UnitSelect
                  value={productUnit}
                  onChange={setProductUnit}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <button
                  onClick={() => { setShowProductModal(false); resetProductForm(); }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Hủy
                </button>
                <button
                  onClick={handleAddProductToLot}
                  disabled={
                    !selectedProductId ||
                    !productQuantity ||
                    parseFloat(productQuantity) <= 0 ||
                    !productUnit
                  }
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Thêm
                </button>
              </div>
            </div>
          </div>
        </div>
      </Modal>

      {/* Move Product Modal */}
      <Modal isOpen={showMoveModal && !!movingProduct} onClose={() => { setShowMoveModal(false); setMovingProduct(null); setTargetWarehouseId(''); setTargetLotId(''); }} showBackdrop>
          <div className="bg-white rounded-lg shadow-xl w-[calc(100vw-2rem)] sm:w-96 flex flex-col max-h-[calc(100vh-2rem)]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
              <h2 className="text-xl font-bold">Di chuyển sản phẩm</h2>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
            <p className="text-sm text-gray-600 mb-4">
              Sản phẩm: <strong>{movingProduct?.internationalProduct?.tenSanPham}</strong>
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

            <div className="flex flex-col sm:flex-row sm:justify-end gap-2">
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
      </Modal>
    </div>
  );
};

export default WarehouseManagement;

