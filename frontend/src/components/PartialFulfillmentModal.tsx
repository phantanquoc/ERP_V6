import React, { useState, useMemo, useEffect } from 'react';
import { ModalForm, ModalFooter, FormField, inputCls, textareaCls, selectCls } from './ModalForm';
import { useAuth } from '../contexts/AuthContext';
import { usePartialFulfillItem } from '../hooks/useSupplyRequests';
import { SupplyRequestItem } from '../services/supplyRequestService';
import warehouseService, { Warehouse, Lot, LotProduct } from '../services/warehouseService';

interface PartialFulfillmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: SupplyRequestItem | null;
  onSuccess?: () => void;
}

const PartialFulfillmentModal: React.FC<PartialFulfillmentModalProps> = ({
  isOpen,
  onClose,
  item,
  onSuccess,
}) => {
  const { user } = useAuth();
  const partialFulfill = usePartialFulfillItem();

  const alreadyFulfilled = item?.fulfilledQty ?? 0;
  const remaining = useMemo(
    () => (item ? Math.max(0, item.soLuong - alreadyFulfilled) : 0),
    [item, alreadyFulfilled]
  );

  const [fulfilledQty, setFulfilledQty] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [routeShortageToPurchase, setRouteShortageToPurchase] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  // Warehouse/Lot selection
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('');
  const [lots, setLots] = useState<Lot[]>([]);
  const [selectedLotId, setSelectedLotId] = useState<string>('');
  const [lotProducts, setLotProducts] = useState<LotProduct[]>([]);
  const [selectedLotProductId, setSelectedLotProductId] = useState<string>('');
  const [loadingWarehouses, setLoadingWarehouses] = useState(false);
  const [loadingLots, setLoadingLots] = useState(false);
  const [noMatchInLot, setNoMatchInLot] = useState<boolean>(false);
  const [autoCreateProduct, setAutoCreateProduct] = useState<boolean>(false);

  const fetchWarehouses = async () => {
    setLoadingWarehouses(true);
    try {
      const res = await warehouseService.getAllWarehouses() as any;
      setWarehouses(res.data?.data || res.data || []);
    } catch (err) {
      console.error('Error fetching warehouses:', err);
    } finally {
      setLoadingWarehouses(false);
    }
  };

  const fetchLots = async (warehouseId: string) => {
    setLoadingLots(true);
    try {
      const res = await warehouseService.getLotsByWarehouse(warehouseId) as any;
      const allLots: Lot[] = res.data?.data || res.data || [];
      setLots(allLots);
    } catch (err) {
      console.error('Error fetching lots:', err);
    } finally {
      setLoadingLots(false);
    }
  };

  const handleWarehouseChange = (warehouseId: string) => {
    setSelectedWarehouseId(warehouseId);
    setSelectedLotId('');
    setSelectedLotProductId('');
    setLotProducts([]);
    if (warehouseId) {
      fetchLots(warehouseId);
    } else {
      setLots([]);
    }
  };

  const handleLotChange = (lotId: string) => {
    setSelectedLotId(lotId);
    setSelectedLotProductId('');
    setAutoCreateProduct(false);
    if (lotId && item) {
      const lot = lots.find(l => l.id === lotId);
      const allProducts = lot?.lotProducts || [];
      const matched = allProducts.filter(lp => {
        const name = lp.internationalProduct?.tenSanPham?.toLowerCase() || '';
        const itemName = item.tenGoi.toLowerCase();
        return name.includes(itemName) || itemName.includes(name);
      });
      const products = matched.length > 0 ? matched : allProducts;
      setLotProducts(products);
      setNoMatchInLot(matched.length === 0);
      if (products.length === 1 && matched.length > 0) {
        setSelectedLotProductId(products[0].id);
      }
    } else {
      setLotProducts([]);
      setNoMatchInLot(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setFulfilledQty(String(remaining));
      setReason('');
      setRouteShortageToPurchase(true);
      setError('');
      setSelectedWarehouseId('');
      setSelectedLotId('');
      setSelectedLotProductId('');
      setLots([]);
      setLotProducts([]);
      setNoMatchInLot(false);
      setAutoCreateProduct(false);
      fetchWarehouses();
    }
  }, [isOpen, remaining]);

  const shortage = useMemo(() => {
    const val = parseFloat(fulfilledQty || '0');
    return Math.max(0, remaining - (isNaN(val) ? 0 : val));
  }, [fulfilledQty, remaining]);

  if (!item) return null;

  const qtyNum = parseFloat(fulfilledQty || '0');
  const needsWarehouseSelection = !isNaN(qtyNum) && qtyNum > 0;

  const handleSubmit = async () => {
    setError('');
    const qty = parseFloat(fulfilledQty);
    if (isNaN(qty) || qty < 0) {
      setError('Số lượng cấp không hợp lệ');
      return;
    }
    if (qty > remaining) {
      setError(`Số lượng cấp không được vượt quá số còn lại (${remaining} ${item.donViTinh})`);
      return;
    }
    if (qty > 0 && !selectedWarehouseId) {
      setError('Vui lòng chọn kho để xuất kho');
      return;
    }
    if (qty > 0 && !selectedLotId) {
      setError('Vui lòng chọn lô để xuất kho');
      return;
    }
    if (qty > 0 && !selectedLotProductId && !autoCreateProduct) {
      setError('Vui lòng chọn sản phẩm hoặc bật "Tạo sản phẩm mới trong lô"');
      return;
    }
    if (!user?.employeeId) {
      setError('Không xác định được nhân viên hiện tại');
      return;
    }

    try {
      await partialFulfill.mutateAsync({
        itemId: item.id,
        payload: {
          fulfilledQty: qty,
          reason: reason.trim() || undefined,
          decidedByEmployeeId: user.employeeId,
          routeShortageToPurchase,
          lotProductId: selectedLotProductId || undefined,
          warehouseId: selectedWarehouseId || undefined,
          lotId: selectedLotId || undefined,
          autoCreateProduct: autoCreateProduct || undefined,
        },
      });
      onSuccess?.();
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Không thể cập nhật fulfillment';
      setError(message);
    }
  };

  const selectedLotProduct = lotProducts.find(lp => lp.id === selectedLotProductId);

  return (
    <ModalForm
      isOpen={isOpen}
      onClose={onClose}
      title="Cấp một phần cho dòng yêu cầu"
      maxWidth="lg"
      footer={
        <ModalFooter
          onClose={onClose}
          onSubmit={handleSubmit}
          submitLabel="Xác nhận cấp & xuất kho"
          isLoading={partialFulfill.isPending}
        />
      }
    >
      <div className="space-y-4">
        <div className="bg-gray-50 rounded-lg p-3 text-sm">
          <div className="font-medium text-gray-900">{item.tenGoi}</div>
          <div className="mt-1 grid grid-cols-3 gap-2 text-xs text-gray-600">
            <div>
              <span className="text-gray-500">Yêu cầu:</span>{' '}
              <span className="font-medium text-gray-800">
                {item.soLuong} {item.donViTinh}
              </span>
            </div>
            <div>
              <span className="text-gray-500">Đã cấp:</span>{' '}
              <span className="font-medium text-blue-700">
                {alreadyFulfilled} {item.donViTinh}
              </span>
            </div>
            <div>
              <span className="text-gray-500">Còn lại:</span>{' '}
              <span className="font-medium text-orange-700">
                {remaining} {item.donViTinh}
              </span>
            </div>
          </div>
        </div>

        <FormField label="Số lượng cấp lần này" required>
          <input
            type="number"
            min={0}
            max={remaining}
            step="any"
            value={fulfilledQty}
            onChange={(e) => setFulfilledQty(e.target.value)}
            className={inputCls(!!error && !fulfilledQty)}
          />
        </FormField>

        {needsWarehouseSelection && (
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 space-y-3">
            <div className="text-xs font-medium text-blue-800">Chọn nguồn xuất kho</div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <FormField label="Kho" required>
                <select
                  value={selectedWarehouseId}
                  onChange={(e) => handleWarehouseChange(e.target.value)}
                  className={selectCls(!selectedWarehouseId && !!error)}
                  disabled={loadingWarehouses}
                >
                  <option value="">{loadingWarehouses ? 'Đang tải...' : '-- Chọn kho --'}</option>
                  {warehouses.map(w => (
                    <option key={w.id} value={w.id}>{w.tenKho}</option>
                  ))}
                </select>
              </FormField>
              <FormField label="Lô" required>
                <select
                  value={selectedLotId}
                  onChange={(e) => handleLotChange(e.target.value)}
                  className={selectCls(!selectedLotId && !!error)}
                  disabled={!selectedWarehouseId || loadingLots}
                >
                  <option value="">{loadingLots ? 'Đang tải...' : '-- Chọn lô --'}</option>
                  {lots.map(l => (
                    <option key={l.id} value={l.id}>{l.tenLo}</option>
                  ))}
                </select>
              </FormField>
              <FormField label="Sản phẩm" required>
                <select
                  value={selectedLotProductId}
                  onChange={(e) => setSelectedLotProductId(e.target.value)}
                  className={selectCls(!selectedLotProductId && !autoCreateProduct && !!error)}
                  disabled={!selectedLotId || autoCreateProduct}
                >
                  <option value="">{autoCreateProduct ? '-- Sẽ tạo mới --' : '-- Chọn --'}</option>
                  {lotProducts.map(lp => (
                    <option key={lp.id} value={lp.id}>
                      {lp.internationalProduct?.tenSanPham} ({lp.soLuong} {lp.donViTinh})
                    </option>
                  ))}
                </select>
              </FormField>
            </div>
            {selectedLotProduct && (
              <div className="text-xs text-blue-700">
                Tồn kho: <span className="font-semibold">{selectedLotProduct.soLuong} {selectedLotProduct.donViTinh}</span>
                {qtyNum > selectedLotProduct.soLuong && (
                  <span className="ml-2 text-red-600 font-medium">
                    (Không đủ — tồn kho chỉ có {selectedLotProduct.soLuong})
                  </span>
                )}
              </div>
            )}
            {selectedLotId && noMatchInLot && (
              <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800 space-y-2">
                <div>
                  Không tìm thấy sản phẩm khớp tên <span className="font-semibold">"{item.tenGoi}"</span> trong lô này.
                </div>
                <label className="inline-flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoCreateProduct}
                    onChange={(e) => {
                      setAutoCreateProduct(e.target.checked);
                      if (e.target.checked) setSelectedLotProductId('');
                    }}
                    className="mt-0.5 rounded border-amber-300"
                  />
                  <span>
                    Tạo sản phẩm <span className="font-semibold">"{item.tenGoi}"</span> mới trong lô này (mã SP tự sinh, đơn vị {item.donViTinh}, loại {item.phanLoai})
                  </span>
                </label>
              </div>
            )}
          </div>
        )}

        {shortage > 0 && (
          <div className="rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-xs text-orange-800 space-y-2">
            <div>
              Còn thiếu: <span className="font-semibold">{shortage} {item.donViTinh}</span>
            </div>
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={routeShortageToPurchase}
                onChange={(e) => setRouteShortageToPurchase(e.target.checked)}
                className="rounded border-orange-300"
              />
              <span>Tự động tạo yêu cầu thu mua cho phần còn thiếu</span>
            </label>
          </div>
        )}

        <FormField label="Lý do (tùy chọn)">
          <textarea
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className={textareaCls()}
            placeholder="Ví dụ: tồn kho không đủ, chờ nhập lô mới..."
          />
        </FormField>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            {error}
          </div>
        )}
      </div>
    </ModalForm>
  );
};

export default PartialFulfillmentModal;
