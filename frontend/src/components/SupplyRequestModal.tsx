import React, { useState, useEffect } from 'react';
import { Plus, Trash2, AlertTriangle, Package } from 'lucide-react';
import supplyRequestService from '../services/supplyRequestService';
import { useAuth } from '../contexts/AuthContext';
import { parseNumberInput } from '../utils/numberInput';
import { internationalProductService, InternationalProduct } from '../services/internationalProductService';
import { ModalForm, ModalFooter, FormField, textareaCls, readonlyCls } from './ModalForm';
import UnitSelect from './common/UnitSelect';
import ProductCombobox from './common/ProductCombobox';

interface SupplyRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ItemRow {
  id: string; // unique ID for React key
  internationalProductId: string | null;
  tenGoi: string;
  soLuong: number;
  donViTinh: string;
  stockInfo?: {
    totalQuantity: number;
    unit: string;
  };
}

const emptyRow = (): ItemRow => ({
  id: Math.random().toString(36).substring(2, 11),
  internationalProductId: null,
  tenGoi: '',
  soLuong: 0,
  donViTinh: 'Kg',
});

const SupplyRequestModal: React.FC<SupplyRequestModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<InternationalProduct[]>([]);
  const [items, setItems] = useState<ItemRow[]>([emptyRow()]);
  const [mucDichYeuCau, setMucDichYeuCau] = useState('');
  const [mucDoUuTien, setMucDoUuTien] = useState('Trung bình');
  const [ghiChu, setGhiChu] = useState('');
  const [stockCache, setStockCache] = useState<Map<string, { totalQuantity: number; unit: string }>>(new Map());

  // EMPLOYEE không được tạo hàng hóa mới
  const canCreateNewProduct = user?.role !== 'EMPLOYEE';

  useEffect(() => {
    if (isOpen) {
      fetchProducts();
      resetForm();
    }
  }, [isOpen]);

  const fetchProducts = async () => {
    try {
      const response = await internationalProductService.getAllProducts(1, 10000);
      setProducts(response.data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const fetchStockForProduct = async (productId: string) => {
    if (stockCache.has(productId)) {
      return stockCache.get(productId)!;
    }
    try {
      const response = await internationalProductService.getStockSummary(productId);
      const stockInfo = {
        totalQuantity: response.data.totalQuantity,
        unit: response.data.unit || 'Kg',
      };
      setStockCache(prev => new Map(prev).set(productId, stockInfo));
      return stockInfo;
    } catch (error) {
      console.error('Error fetching stock:', error);
      return null;
    }
  };

  const updateItem = (index: number, updates: Partial<ItemRow>) => {
    setItems(prev => prev.map((row, i) => i === index ? { ...row, ...updates } : row));
  };

  const handleProductSelect = async (index: number, _productId: string | null, product: InternationalProduct | null) => {
    if (!product) {
      updateItem(index, {
        internationalProductId: null,
        tenGoi: '',
        donViTinh: 'Kg',
        stockInfo: undefined,
      });
      return;
    }

    const stockInfo = await fetchStockForProduct(product.id);
    updateItem(index, {
      internationalProductId: product.id,
      tenGoi: product.tenSanPham,
      donViTinh: product.donViTinh || 'Kg',
      stockInfo: stockInfo || undefined,
    });
  };

  const handleCreateNew = (index: number, tenSanPham: string) => {
    updateItem(index, {
      internationalProductId: null,
      tenGoi: tenSanPham,
      donViTinh: 'Kg',
      stockInfo: undefined,
    });
  };

  const addRow = () => {
    setItems(prev => [...prev, emptyRow()]);
  };

  const removeRow = (index: number) => {
    if (items.length === 1) return;
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const resetForm = () => {
    setItems([emptyRow()]);
    setMucDichYeuCau('');
    setMucDoUuTien('Trung bình');
    setGhiChu('');
    setStockCache(new Map());
  };

  const validateForm = (): string | null => {
    // Check for empty product names
    for (let i = 0; i < items.length; i++) {
      const row = items[i];
      if (!row.tenGoi || !row.tenGoi.trim()) {
        return `Dòng ${i + 1}: Vui lòng chọn hoặc nhập tên hàng hóa`;
      }
      if (!row.soLuong || row.soLuong <= 0) {
        return `Dòng ${i + 1}: Số lượng phải lớn hơn 0`;
      }
    }

    // Check for duplicates (same product)
    const productNames = items.map(r => r.tenGoi.trim().toLowerCase());
    const duplicates = productNames.filter((name, idx) => productNames.indexOf(name) !== idx);
    if (duplicates.length > 0) {
      return `Hàng hóa "${items.find(r => r.tenGoi.trim().toLowerCase() === duplicates[0])?.tenGoi}" bị trùng lặp`;
    }

    if (!mucDichYeuCau.trim()) {
      return 'Vui lòng nhập mục đích yêu cầu';
    }

    return null;
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user || !user.employeeId) {
      alert('Không tìm thấy thông tin nhân viên');
      return;
    }

    const validationError = validateForm();
    if (validationError) {
      alert(validationError);
      return;
    }

    setLoading(true);
    try {
      await supplyRequestService.createSupplyRequest({
        employeeId: user.employeeId,
        maNhanVien: user.employeeCode || '',
        tenNhanVien: `${user.lastName} ${user.firstName}`,
        boPhan: user.department || '',
        items: items.map(row => ({
          phanLoai: products.find(p => p.id === row.internationalProductId)?.loaiSanPham || '',
          tenGoi: row.tenGoi,
          soLuong: row.soLuong,
          donViTinh: row.donViTinh,
        })),
        mucDichYeuCau,
        mucDoUuTien,
        ghiChu,
      });
      alert('Tạo yêu cầu cung cấp thành công!');
      resetForm();
      onClose();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Lỗi khi tạo yêu cầu cung cấp');
    } finally {
      setLoading(false);
    }
  };

  const hasLowStockWarning = items.some(row =>
    row.stockInfo && row.soLuong > row.stockInfo.totalQuantity
  );

  return (
    <ModalForm
      isOpen={isOpen}
      onClose={onClose}
      title="Tạo yêu cầu cung cấp"
      maxWidth="4xl"
      footer={<ModalFooter onClose={onClose} onSubmit={handleSubmit as any} submitLabel="Tạo yêu cầu" isLoading={loading} />}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Tên nhân viên + Bộ phận */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Tên nhân viên">
            <input type="text" readOnly value={`${user?.lastName || ''} ${user?.firstName || ''}`} className={readonlyCls} />
          </FormField>
          <FormField label="Bộ phận">
            <input type="text" readOnly value={user?.department || 'Chưa xác định'} className={readonlyCls} />
          </FormField>
        </div>

        {/* Items list */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">
              Danh sách hàng hóa <span className="text-red-500">*</span>
            </label>
            <button
              type="button"
              onClick={addRow}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Thêm hàng hóa
            </button>
          </div>

          {hasLowStockWarning && (
            <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
              <p className="text-sm text-amber-800">
                Một số hàng hóa có số lượng yêu cầu <strong>lớn hơn tồn kho hiện tại</strong>. Vui lòng kiểm tra lại.
              </p>
            </div>
          )}

          <div className="space-y-3">
            {items.map((row, index) => {
              const hasStockWarning = row.stockInfo && row.soLuong > row.stockInfo.totalQuantity;
              return (
                <div
                  key={row.id}
                  className={`p-4 border rounded-lg transition-all ${
                    hasStockWarning ? 'border-amber-300 bg-amber-50/30' : 'border-gray-200 bg-gray-50/50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-semibold text-sm shrink-0 mt-1">
                      {index + 1}
                    </div>

                    <div className="flex-1 space-y-3">
                      {/* Product combobox */}
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Hàng hóa <span className="text-red-500">*</span>
                        </label>
                        <ProductCombobox
                          products={products}
                          value={row.internationalProductId}
                          onChange={(productId, product) => handleProductSelect(index, productId, product)}
                          onCreateNew={canCreateNewProduct ? (name) => handleCreateNew(index, name) : undefined}
                          allowCreate={canCreateNewProduct}
                          placeholder={
                            canCreateNewProduct
                              ? "Tìm theo mã, tên hoặc loại hàng hóa, hoặc nhập tên mới..."
                              : "Tìm theo mã, tên hoặc loại hàng hóa..."
                          }
                        />
                        {canCreateNewProduct && !row.internationalProductId && row.tenGoi && (
                          <p className="mt-1.5 text-xs text-blue-600 flex items-center gap-1">
                            <span className="inline-block w-1.5 h-1.5 bg-blue-600 rounded-full"></span>
                            Hàng hóa chưa có trong danh sách — sẽ được tạo khi submit
                          </p>
                        )}
                        {!canCreateNewProduct && (
                          <p className="mt-1.5 text-xs text-gray-500 flex items-center gap-1">
                            <span className="inline-block w-1.5 h-1.5 bg-gray-400 rounded-full"></span>
                            Chỉ chọn từ danh sách có sẵn. Cần hàng hóa mới? Liên hệ quản lý.
                          </p>
                        )}
                        {row.stockInfo && (
                          <div className={`mt-1.5 flex items-center gap-1.5 text-xs ${
                            hasStockWarning ? 'text-amber-700' : 'text-green-700'
                          }`}>
                            <Package className="h-3.5 w-3.5" />
                            <span>
                              Tồn kho: <strong>{row.stockInfo.totalQuantity} {row.stockInfo.unit}</strong>
                            </span>
                            {hasStockWarning && (
                              <span className="text-amber-600 font-medium ml-1">
                                (Yêu cầu vượt tồn!)
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Quantity + Unit */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Số lượng <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="number"
                            value={row.soLuong || ''}
                            onChange={(e) => updateItem(index, { soLuong: parseNumberInput(e.target.value) })}
                            required
                            min="0.01"
                            step="0.01"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            placeholder="0.00"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Đơn vị <span className="text-red-500">*</span>
                          </label>
                          <UnitSelect
                            value={row.donViTinh}
                            onChange={(val) => updateItem(index, { donViTinh: val })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Remove button */}
                    <button
                      type="button"
                      onClick={() => removeRow(index)}
                      disabled={items.length === 1}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition-colors disabled:text-gray-300 disabled:cursor-not-allowed disabled:hover:bg-transparent mt-1"
                      title="Xóa hàng hóa"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Mục đích yêu cầu */}
        <FormField label="Mục đích yêu cầu" required>
          <textarea
            value={mucDichYeuCau}
            onChange={(e) => setMucDichYeuCau(e.target.value)}
            required
            className={textareaCls()}
            rows={2}
            placeholder="Mô tả mục đích yêu cầu cung cấp..."
          />
        </FormField>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Mức độ ưu tiên */}
          <FormField label="Mức độ ưu tiên" required>
            <select
              value={mucDoUuTien}
              onChange={(e) => setMucDoUuTien(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="Cao">Cao</option>
              <option value="Trung bình">Trung bình</option>
              <option value="Thấp">Thấp</option>
            </select>
          </FormField>

          {/* Ghi chú */}
          <FormField label="Ghi chú">
            <textarea
              value={ghiChu}
              onChange={(e) => setGhiChu(e.target.value)}
              className={textareaCls()}
              rows={2}
              placeholder="Ghi chú thêm nếu có..."
            />
          </FormField>
        </div>
      </form>
    </ModalForm>
  );
};

export default SupplyRequestModal;
