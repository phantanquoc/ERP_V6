import React, { useEffect, useState } from 'react';
import { X, Warehouse } from 'lucide-react';
import Modal from '../Modal';
import internationalProductService, {
  InternationalProduct,
  ProductStockSummary,
} from '../../services/internationalProductService';

interface ProductDetailModalProps {
  isOpen: boolean;
  product: InternationalProduct | null;
  canEdit: boolean;
  onClose: () => void;
  onEdit: (product: InternationalProduct) => void;
}

const ProductDetailModal: React.FC<ProductDetailModalProps> = ({ isOpen, product, canEdit, onClose, onEdit }) => {
  const [stock, setStock] = useState<ProductStockSummary | null>(null);
  const [stockLoading, setStockLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !product) {
      setStock(null);
      return;
    }
    let cancelled = false;
    setStockLoading(true);
    internationalProductService
      .getStockSummary(product.id)
      .then(res => { if (!cancelled) setStock(res.data); })
      .catch(() => { if (!cancelled) setStock(null); })
      .finally(() => { if (!cancelled) setStockLoading(false); });
    return () => { cancelled = true; };
  }, [isOpen, product]);

  const fmt = (n: number) => new Intl.NumberFormat('vi-VN').format(n);

  return (
    <Modal isOpen={isOpen && !!product} onClose={onClose} showBackdrop closeOnBackdrop={true}>
      <div className="bg-white rounded-lg shadow-xl w-[calc(100vw-1rem)] sm:max-w-2xl sm:w-full flex flex-col max-h-[calc(100vh-1rem)] sm:max-h-[calc(100vh-2rem)]" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-start sm:items-center gap-3 border-b px-4 sm:px-6 py-4 shrink-0">
          <h2 className="text-lg sm:text-xl font-bold">Chi tiết hàng hóa</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 p-4 sm:p-6">
          {product && (<>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-500">Mã hàng hóa</label>
                <p className="mt-1 text-sm text-gray-900">{product.maSanPham}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Tên hàng hóa</label>
                <p className="mt-1 text-sm text-gray-900">{product.tenSanPham}</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500">Loại hàng hóa</label>
                  <p className="mt-1 text-sm text-gray-900">{product.loaiSanPham || '-'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Đơn vị tính</label>
                  <p className="mt-1 text-sm text-gray-900">{product.donViTinh || '-'}</p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Giá thành (VND / đơn vị)</label>
                <p className="mt-1 text-sm text-gray-900">
                  {product.giaThanh != null && Number.isFinite(product.giaThanh)
                    ? `${new Intl.NumberFormat('vi-VN').format(product.giaThanh)} đ` : 'Chưa định giá'}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Mô tả hàng hóa</label>
                <p className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{product.moTaSanPham || '-'}</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500">Ngày tạo</label>
                  <p className="mt-1 text-sm text-gray-900">{new Date(product.createdAt).toLocaleString('vi-VN')}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Ngày cập nhật</label>
                  <p className="mt-1 text-sm text-gray-900">{new Date(product.updatedAt).toLocaleString('vi-VN')}</p>
                </div>
              </div>
            </div>

            {/* Stock section */}
            <div className="mt-6 border-t pt-4">
              <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2 mb-3">
                <Warehouse className="w-4 h-4 text-blue-600" />
                Tồn kho
              </h3>
              {stockLoading ? (
                <p className="text-sm text-gray-400">Đang tải tồn kho...</p>
              ) : !stock || stock.lotDetails.length === 0 ? (
                <p className="text-sm text-gray-400 italic">Hàng hóa này chưa có tồn kho</p>
              ) : (
                <>
                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 mb-3 flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">Tổng tồn</span>
                    <span className="text-lg font-bold text-emerald-700">
                      {fmt(stock.totalQuantity)} {stock.unit || ''}
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="bg-gray-50 text-gray-600">
                          <th className="text-left px-3 py-2 border-b">Kho</th>
                          <th className="text-left px-3 py-2 border-b">Lô</th>
                          <th className="text-right px-3 py-2 border-b">Số lượng</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stock.lotDetails.map((lot) => (
                          <tr key={lot.lotId} className="border-b last:border-0">
                            <td className="px-3 py-2 text-gray-900">{lot.warehouseName}</td>
                            <td className="px-3 py-2 text-gray-700">{lot.lotName}</td>
                            <td className="px-3 py-2 text-right font-medium text-gray-900">
                              {fmt(lot.quantity)} {lot.unit}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                Đóng
              </button>
              {canEdit && (
                <button
                  onClick={() => { onClose(); onEdit(product); }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Chỉnh sửa
                </button>
              )}
            </div>
          </>)}
        </div>
      </div>
    </Modal>
  );
};

export default ProductDetailModal;
