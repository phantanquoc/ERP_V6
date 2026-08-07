import React, { useState, useEffect } from 'react';
import { X, PackagePlus, Check } from 'lucide-react';
import warehouseReceiptService from '../services/warehouseReceiptService';
import warehouseService, { Warehouse, Lot } from '../services/warehouseService';
import { useAuth } from '../contexts/AuthContext';
import { SupplyRequest } from '../services/supplyRequestService';
import { parseNumberInput } from '../utils/numberInput';
import Modal from './Modal';
import UnitSelect from './common/UnitSelect';
import ProductCombobox from './common/ProductCombobox';
import { useProducts } from '../hooks';
import { useUnitOptions } from '../hooks/useLookups';

interface CreateWarehouseReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  supplyRequest?: SupplyRequest | null;
  onSuccess?: () => void;
}

interface ItemRow {
  tenSanPham: string;
  soLuong: number;
  donViTinh: string;
  phanLoai: string;
  warehouseId: string;
  lotId: string;
  ghiChu: string;
  selected: boolean;
}

/** Purpose presets — cover the common cases; the field stays free text for the rest. */
const MUC_DICH_PRESETS = [
  'Nhập từ thu mua',
  'Nhập thành phẩm sản xuất',
  'Nhập trả lại từ bộ phận',
  'Nhập điều chuyển kho',
  'Kiểm kê điều chỉnh',
];

const CreateWarehouseReceiptModal: React.FC<CreateWarehouseReceiptModalProps> = ({
  isOpen,
  onClose,
  supplyRequest,
  onSuccess,
}) => {
  const { user } = useAuth();
  // Unit list from the shared lookup API; drives the auto-fill guard.
  const { isKnownUnit } = useUnitOptions();
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [lotsMap, setLotsMap] = useState<Record<string, Lot[]>>({});
  const [loading, setLoading] = useState(false);
  const [itemRows, setItemRows] = useState<ItemRow[]>([]);
  // Shared purpose for every receipt in a batch — all rows come from one supply request,
  // so one purpose describes them all rather than repeating it per row.
  const [batchMucDich, setBatchMucDich] = useState('');

  // For single-item fallback (no supplyRequest)
  const [singleForm, setSingleForm] = useState({
    maPhieuNhap: '',
    warehouseId: '',
    lotId: '',
    internationalProductId: '' as string | null,
    tenSanPham: '',
    loaiSanPham: '',
    soLuongNhap: 0,
    donViTinh: '',
    ghiChu: '',
    mucDich: '',
  });

  // Product list for the searchable combobox (existing products, with create-new support)
  const { data: productsData } = useProducts({ page: 1, limit: 1000 });
  const products = productsData?.data || [];

  useEffect(() => {
    if (isOpen) {
      fetchWarehouses();

      if (supplyRequest?.items && supplyRequest.items.length > 0) {
        // Multi-item mode — default the purpose to the supply-request case
        setBatchMucDich('Nhập từ thu mua');
        setItemRows(
          supplyRequest.items.map((item) => ({
            tenSanPham: item.tenGoi,
            soLuong: item.soLuong,
            donViTinh: item.donViTinh,
            phanLoai: item.phanLoai || '',
            warehouseId: '',
            lotId: '',
            ghiChu: `Nhập kho cho ${supplyRequest.maYeuCau} - ${item.tenGoi}`,
            selected: true,
          }))
        );
      } else {
        // Single mode
        generateCode();
      }
    }
  }, [isOpen, supplyRequest]);

  const generateCode = async () => {
    try {
      const response = await warehouseReceiptService.generateReceiptCode();
      setSingleForm((prev) => ({
        ...prev,
        maPhieuNhap: (response.data as { code: string }).code,
        internationalProductId: '',
        tenSanPham: '',
        loaiSanPham: '',
        mucDich: '',
      }));
    } catch (error) {
      console.error('Error generating receipt code:', error);
    }
  };

  const fetchWarehouses = async () => {
    try {
      const response = await warehouseService.getAllWarehouses() as any;
      const data = response.data?.data || response.data || [];
      setWarehouses(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching warehouses:', error);
    }
  };

  const getLotsForWarehouse = (warehouseId: string): Lot[] => {
    if (lotsMap[warehouseId]) return lotsMap[warehouseId];
    const warehouse = warehouses.find((w) => w.id === warehouseId);
    const lots = warehouse?.lots || [];
    setLotsMap((prev) => ({ ...prev, [warehouseId]: lots }));
    return lots;
  };

  // Kiện in the lot currently picked in single mode — drives the stock annotation
  const singleLotProducts = React.useMemo(() => {
    if (!singleForm.warehouseId || !singleForm.lotId) return [];
    const warehouse = warehouses.find((w) => w.id === singleForm.warehouseId);
    const lot = warehouse?.lots?.find((l) => l.id === singleForm.lotId);
    return lot?.lotProducts ?? [];
  }, [warehouses, singleForm.warehouseId, singleForm.lotId]);

  const updateItemRow = (index: number, field: keyof ItemRow, value: any) => {
    setItemRows((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      if (field === 'warehouseId') {
        updated[index].lotId = '';
      }
      return updated;
    });
  };

  // Apply same warehouse + lot to all selected items
  const applyToAll = (warehouseId: string, lotId: string) => {
    setItemRows((prev) =>
      prev.map((row) =>
        row.selected ? { ...row, warehouseId, lotId } : row
      )
    );
  };

  const toggleSelectAll = (checked: boolean) => {
    setItemRows((prev) => prev.map((row) => ({ ...row, selected: checked })));
  };

  const selectedCount = itemRows.filter((r) => r.selected).length;

  // ── MULTI-ITEM SUBMIT ──
  const handleBatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const selectedItems = itemRows.filter((r) => r.selected);
    if (selectedItems.length === 0) {
      alert('Vui lòng chọn ít nhất một sản phẩm');
      return;
    }

    const invalidItems = selectedItems.filter((r) => !r.warehouseId || !r.lotId);
    if (invalidItems.length > 0) {
      alert(`Có ${invalidItems.length} sản phẩm chưa chọn kho/lô. Vui lòng chọn đầy đủ.`);
      return;
    }

    setLoading(true);
    try {
      let successCount = 0;

      for (const item of selectedItems) {
        // Generate code for each receipt
        const codeRes = await warehouseReceiptService.generateReceiptCode();
        const code = (codeRes.data as { code: string }).code;

        const warehouse = warehouses.find((w) => w.id === item.warehouseId);
        const lot = getLotsForWarehouse(item.warehouseId).find((l) => l.id === item.lotId);

        await warehouseReceiptService.createWarehouseReceipt({
          maPhieuNhap: code,
          employeeId: user?.employeeId || '',
          maNhanVien: user?.employeeCode || '',
          tenNhanVien: `${user?.lastName} ${user?.firstName}`,
          warehouseId: item.warehouseId,
          tenKho: warehouse?.tenKho || '',
          lotId: item.lotId,
          tenLo: lot?.tenLo || '',
          tenSanPham: item.tenSanPham,
          soLuongNhap: item.soLuong,
          donViTinh: item.donViTinh,
          ghiChu: item.ghiChu,
          mucDich: batchMucDich || undefined,
          supplyRequestId: supplyRequest?.id,
          loaiSanPham: item.phanLoai,
        });
        successCount++;
      }

      alert(`Đã tạo ${successCount} phiếu nhập kho thành công!`);
      onSuccess?.();
      onClose();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Lỗi khi tạo phiếu nhập kho');
    } finally {
      setLoading(false);
    }
  };

  // ── SINGLE-ITEM SUBMIT (fallback, no supply request) ──
  const handleSingleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!singleForm.warehouseId || !singleForm.lotId) {
      alert('Vui lòng chọn kho và lô');
      return;
    }
    if (!singleForm.tenSanPham) {
      alert('Vui lòng nhập tên sản phẩm');
      return;
    }

    setLoading(true);
    try {
      const warehouse = warehouses.find((w) => w.id === singleForm.warehouseId);
      const lot = getLotsForWarehouse(singleForm.warehouseId).find((l) => l.id === singleForm.lotId);

      await warehouseReceiptService.createWarehouseReceipt({
        maPhieuNhap: singleForm.maPhieuNhap,
        employeeId: user?.employeeId || '',
        maNhanVien: user?.employeeCode || '',
        tenNhanVien: `${user?.lastName} ${user?.firstName}`,
        warehouseId: singleForm.warehouseId,
        tenKho: warehouse?.tenKho || '',
        lotId: singleForm.lotId,
        tenLo: lot?.tenLo || '',
        tenSanPham: singleForm.tenSanPham,
        soLuongNhap: singleForm.soLuongNhap,
        donViTinh: singleForm.donViTinh,
        ghiChu: singleForm.ghiChu,
        mucDich: singleForm.mucDich || undefined,
        loaiSanPham: singleForm.loaiSanPham || undefined,
      });

      alert('Tạo phiếu nhập kho thành công!');
      onSuccess?.();
      onClose();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Lỗi khi tạo phiếu nhập kho');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const isMultiItem = supplyRequest?.items && supplyRequest.items.length > 0;

  // ── FIRST SELECTED ROW (for "apply to all" default) ──
  const firstSelected = itemRows.find((r) => r.selected && r.warehouseId);

  return (
    <Modal isOpen={isOpen} onClose={onClose} showBackdrop>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-[900px] flex flex-col modal-viewport-h" onClick={(e) => e.stopPropagation()}>
        {/* Purpose suggestions shared by both single and batch mode */}
        <datalist id="muc-dich-presets">
          {MUC_DICH_PRESETS.map((p) => (
            <option key={p} value={p} />
          ))}
        </datalist>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <PackagePlus className="w-5 h-5 text-green-600" />
            Tạo phiếu nhập kho
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-4">
        {/* Supply Request Info */}
        {supplyRequest && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg mb-4">
            <div className="flex items-center gap-4 text-sm">
              <span className="text-gray-600">Mã YC:</span>
              <span className="font-semibold text-blue-700">{supplyRequest.maYeuCau}</span>
              <span className="text-gray-600">Người yêu cầu:</span>
              <span className="font-medium">{supplyRequest.tenNhanVien}</span>
              <span className="text-gray-600">Sản phẩm:</span>
              <span className="font-medium">{supplyRequest.items?.length || 0} mặt hàng</span>
            </div>
          </div>
        )}

        {isMultiItem ? (
          /* ═══ MULTI-ITEM MODE ═══ */
          <form onSubmit={handleBatchSubmit}>
            {/* Shared purpose for the whole batch */}
            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mục đích nhập <span className="text-xs font-normal text-gray-400">(áp dụng cho tất cả phiếu)</span>
              </label>
              <input
                type="text"
                list="muc-dich-presets"
                value={batchMucDich}
                onChange={(e) => setBatchMucDich(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                placeholder="VD: Nhập từ thu mua"
              />
            </div>

            {/* Quick apply to all */}
            <div className="flex items-center gap-3 mb-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <span className="text-xs font-medium text-gray-500 uppercase">Áp dụng cho tất cả:</span>
              <select
                className="text-sm border border-gray-300 rounded px-2 py-1"
                value={firstSelected?.warehouseId || ''}
                onChange={(e) => {
                  const wId = e.target.value;
                  const lots = getLotsForWarehouse(wId);
                  applyToAll(wId, lots.length === 1 ? lots[0].id : '');
                }}
              >
                <option value="">Chọn kho</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>{w.tenKho}</option>
                ))}
              </select>
              {firstSelected?.warehouseId && (
                <select
                  className="text-sm border border-gray-300 rounded px-2 py-1"
                  value={firstSelected?.lotId || ''}
                  onChange={(e) => applyToAll(firstSelected.warehouseId, e.target.value)}
                >
                  <option value="">Chọn lô</option>
                  {getLotsForWarehouse(firstSelected.warehouseId).map((l) => (
                    <option key={l.id} value={l.id}>{l.tenLo}</option>
                  ))}
                </select>
              )}
            </div>

            {/* Items table */}
            <div className="overflow-x-auto border border-gray-200 rounded-lg mb-4">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left">
                      <input
                        type="checkbox"
                        checked={selectedCount === itemRows.length}
                        onChange={(e) => toggleSelectAll(e.target.checked)}
                        className="rounded"
                      />
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Sản phẩm</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">SL</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">ĐVT</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Kho <span className="text-red-500">*</span></th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Lô <span className="text-red-500">*</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {itemRows.map((row, index) => (
                    <tr key={index} className={row.selected ? 'bg-white' : 'bg-gray-50 opacity-60'}>
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={row.selected}
                          onChange={(e) => updateItemRow(index, 'selected', e.target.checked)}
                          className="rounded"
                        />
                      </td>
                      <td className="px-3 py-2 font-medium text-gray-900">{row.tenSanPham}</td>
                      <td className="px-3 py-2 text-right">
                        <input
                          type="number"
                          value={row.soLuong}
                          onChange={(e) => updateItemRow(index, 'soLuong', parseNumberInput(e.target.value))}
                          className="w-20 text-right border border-gray-300 rounded px-2 py-1 text-sm"
                          min="0"
                          step="0.01"
                          disabled={!row.selected}
                        />
                      </td>
                      <td className="px-3 py-2 text-gray-600">{row.donViTinh}</td>
                      <td className="px-3 py-2">
                        <select
                          value={row.warehouseId}
                          onChange={(e) => updateItemRow(index, 'warehouseId', e.target.value)}
                          disabled={!row.selected}
                          className="w-full border border-gray-300 rounded px-2 py-1 text-sm disabled:bg-gray-100"
                        >
                          <option value="">Chọn kho</option>
                          {warehouses.map((w) => (
                            <option key={w.id} value={w.id}>{w.tenKho}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <select
                          value={row.lotId}
                          onChange={(e) => updateItemRow(index, 'lotId', e.target.value)}
                          disabled={!row.selected || !row.warehouseId}
                          className="w-full border border-gray-300 rounded px-2 py-1 text-sm disabled:bg-gray-100"
                        >
                          <option value="">Chọn lô</option>
                          {row.warehouseId &&
                            getLotsForWarehouse(row.warehouseId).map((l) => (
                              <option key={l.id} value={l.id}>{l.tenLo}</option>
                            ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="text-xs text-gray-500 mb-4">
              Sản phẩm mới chưa có trong kho sẽ được tự động tạo. Sản phẩm đã có sẽ cộng dồn số lượng.
            </p>

            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">
                Đã chọn <strong className="text-gray-800">{selectedCount}/{itemRows.length}</strong> sản phẩm
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={loading || selectedCount === 0}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {loading ? (
                    'Đang xử lý...'
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      Nhập kho {selectedCount} sản phẩm
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        ) : (
          /* ═══ SINGLE-ITEM MODE (no supply request) ═══ */
          <form onSubmit={handleSingleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mã phiếu nhập</label>
              <input type="text" value={singleForm.maPhieuNhap} disabled className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hàng hóa <span className="text-red-500">*</span></label>
              <ProductCombobox
                products={products}
                value={singleForm.internationalProductId || null}
                lotProducts={singleLotProducts}
                allowCreate
                onChange={(productId, product) => {
                  const existing = singleLotProducts.find(
                    (lp) => lp.internationalProductId === productId
                  );
                  setSingleForm((prev) => ({
                    ...prev,
                    internationalProductId: productId ?? '',
                    tenSanPham: product?.tenSanPham ?? '',
                    loaiSanPham: product?.loaiSanPham ?? '',
                    // Prefer the kiện's unit when the lot already holds this product
                    donViTinh:
                      existing?.donViTinh ??
                      (isKnownUnit(product?.donViTinh) ? product!.donViTinh : prev.donViTinh),
                  }));
                }}
                onCreateNew={(tenSanPham) => {
                  // New product — backend resolveOrCreateLotProduct will create it on submit
                  setSingleForm((prev) => ({
                    ...prev,
                    internationalProductId: '',
                    tenSanPham,
                    loaiSanPham: '',
                  }));
                }}
              />
              {(() => {
                if (singleForm.tenSanPham && !singleForm.internationalProductId) {
                  return (
                    <p className="mt-1 text-xs text-green-600">
                      Sản phẩm mới "{singleForm.tenSanPham}" sẽ được tạo khi lưu phiếu
                    </p>
                  );
                }
                if (!singleForm.internationalProductId) return null;
                if (!singleForm.lotId) {
                  return (
                    <p className="mt-1 text-xs text-gray-400">
                      Chọn kho và lô bên dưới để xem tồn kho hiện tại
                    </p>
                  );
                }
                const kien = singleLotProducts.find(
                  (lp) => lp.internationalProductId === singleForm.internationalProductId
                );
                return kien ? (
                  <p className="mt-1 text-xs text-blue-600">
                    Đã có trong lô — kiện {kien.maKien ?? kien.id.slice(-4)}, tồn {kien.soLuong}{' '}
                    {kien.donViTinh}. Số lượng sẽ được cộng dồn.
                  </p>
                ) : (
                  <p className="mt-1 text-xs text-green-600">
                    Hàng hóa chưa có trong lô này — kiện mới sẽ được tạo khi lưu phiếu
                  </p>
                );
              })()}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Số lượng <span className="text-red-500">*</span></label>
                <input
                  type="number"
                  value={singleForm.soLuongNhap}
                  onChange={(e) => setSingleForm({ ...singleForm, soLuongNhap: parseNumberInput(e.target.value) })}
                  required min="0" step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Đơn vị tính</label>
                <UnitSelect
                  value={singleForm.donViTinh}
                  onChange={(val) => setSingleForm({ ...singleForm, donViTinh: val })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Kho <span className="text-red-500">*</span></label>
              <select
                value={singleForm.warehouseId}
                onChange={(e) => setSingleForm({ ...singleForm, warehouseId: e.target.value, lotId: '' })}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="">Chọn kho</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>{w.tenKho}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Lô <span className="text-red-500">*</span></label>
              <select
                value={singleForm.lotId}
                onChange={(e) => setSingleForm({ ...singleForm, lotId: e.target.value })}
                required
                disabled={!singleForm.warehouseId}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg disabled:bg-gray-100"
              >
                <option value="">Chọn lô</option>
                {singleForm.warehouseId &&
                  getLotsForWarehouse(singleForm.warehouseId).map((l) => (
                    <option key={l.id} value={l.id}>{l.tenLo}</option>
                  ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mục đích nhập</label>
              <input
                type="text"
                list="muc-dich-presets"
                value={singleForm.mucDich}
                onChange={(e) => setSingleForm({ ...singleForm, mucDich: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="VD: Nhập từ thu mua, Nhập thành phẩm sản xuất, Nhập trả lại..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú</label>
              <textarea
                value={singleForm.ghiChu}
                onChange={(e) => setSingleForm({ ...singleForm, ghiChu: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="VD: sản xuất nhập kho / mua nhập kho - nhà cung cấp - ..."
              />
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Hủy</button>
              <button type="submit" disabled={loading} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50">
                {loading ? 'Đang xử lý...' : 'Tạo phiếu nhập'}
              </button>
            </div>
          </form>
        )}
        </div>
      </div>
    </Modal>
  );
};

export default CreateWarehouseReceiptModal;
