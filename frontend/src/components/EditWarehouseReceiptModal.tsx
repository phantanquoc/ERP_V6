import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import warehouseReceiptService, { WarehouseReceipt } from '../services/warehouseReceiptService';
import warehouseService, { Warehouse, Lot, LotProduct } from '../services/warehouseService';
import { parseNumberInput } from '../utils/numberInput';
import Modal from './Modal';
import ProductCombobox from './common/ProductCombobox';
import UnitSelect from './common/UnitSelect';
import EmployeeCombobox from './common/EmployeeCombobox';
import MultiKienPicker from './common/MultiKienPicker';
import { useProducts } from '../hooks';
import { useEmployeesForAssignment } from '../hooks/useEmployeesForAssignment';
import { useUnitOptions } from '../hooks/useLookups';
import { TINH_TRANG_OPTIONS } from '../constants/warehouseCatalogs';
import { kienCapacityByUnit } from '../utils/kienCapacity';

/** Purpose presets — cover the common cases; the field stays free text for the rest. */
const MUC_DICH_PRESETS = [
  'Nhập từ thu mua',
  'Nhập thành phẩm sản xuất',
  'Nhập trả lại từ bộ phận',
  'Nhập điều chuyển kho',
  'Kiểm kê điều chỉnh',
];

interface EditWarehouseReceiptModalProps {
  isOpen: boolean;
  receipt: WarehouseReceipt | null;
  onClose: () => void;
  onSuccess?: () => void;
}

interface EditReceiptRow {
  /** Stored line id — carried back in the payload so the backend diff matches
   *  this row to its stored line instead of treating it as a delete + insert. */
  id?: string;
  warehouseId: string;
  lotId: string;
  /** Empty when the row targets a product not yet in the lot; the backend resolves it. */
  lotProductId: string;
  internationalProductId: string;
  tenSanPham: string;
  donViTinh: string;
  soLuongNhap: number;
  ghiChu: string;
  tinhTrang: string;
  tinhTrangCustom: string;
  quyCach: string;
  lots: Lot[];
  lotProducts: LotProduct[];
  selectedKienIds: string[];
  perKienQty: number[];
}

const emptyRow = (): EditReceiptRow => ({
  warehouseId: '', lotId: '', lotProductId: '', internationalProductId: '',
  tenSanPham: '', donViTinh: '', soLuongNhap: 0, ghiChu: '', tinhTrang: 'Bình thường', tinhTrangCustom: '', quyCach: '',
  lots: [], lotProducts: [], selectedKienIds: [], perKienQty: [],
});

const EditWarehouseReceiptModal: React.FC<EditWarehouseReceiptModalProps> = ({
  isOpen,
  receipt,
  onClose,
  onSuccess,
}) => {
  const { isKnownUnit } = useUnitOptions();
  const { data: productsData } = useProducts({ page: 1, limit: 1000 });
  const allProducts = productsData?.data || [];
  const { data: employeesData } = useEmployeesForAssignment();
  const employees = employeesData ?? [];

  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(false);
  const [ghiChu, setGhiChu] = useState('');
  const [mucDich, setMucDich] = useState('');
  const [nguoiDeNghi, setNguoiDeNghi] = useState('');
  const [maNguoiDeNghi, setMaNguoiDeNghi] = useState('');
  const [boPhan, setBoPhan] = useState('');
  const [rows, setRows] = useState<EditReceiptRow[]>([]);

  const handleNguoiDeNghiChange = (name: string) => {
    setNguoiDeNghi(name);
    const emp = employees.find((e) => e.name === name);
    if (emp) { setMaNguoiDeNghi(emp.id); setBoPhan(emp.department ?? ''); }
    else if (!name) { setMaNguoiDeNghi(''); setBoPhan(''); }
  };

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;

    const load = async () => {
      const list = await fetchWarehouses();
      if (cancelled) return;
      setWarehouses(list);
      setGhiChu(receipt?.ghiChu || '');
      setMucDich(receipt?.mucDich || '');
      setNguoiDeNghi((receipt as any)?.nguoiDeNghi || '');
      setMaNguoiDeNghi((receipt as any)?.maNguoiDeNghi || '');
      setBoPhan((receipt as any)?.boPhan || '');
      setRows(buildRows(receipt, list));
    };
    load();

    return () => { cancelled = true; };
  }, [isOpen, receipt]);

  const fetchWarehouses = async (): Promise<Warehouse[]> => {
    try {
      const response = await warehouseService.getAllWarehouses() as any;
      const data = response.data?.data ?? response.data ?? [];
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('Error fetching warehouses:', error);
      return [];
    }
  };

  /** Seed one row per stored line, keeping the line id. */
  const buildRows = (target: WarehouseReceipt | null, list: Warehouse[]): EditReceiptRow[] => {
    const lines = target?.items ?? [];

    const hydrate = (warehouseId?: string, lotId?: string) => {
      const warehouse = list.find((w) => w.id === warehouseId);
      const lot = warehouse?.lots?.find((l) => l.id === lotId);
      return { lots: warehouse?.lots ?? [], lotProducts: lot?.lotProducts ?? [] };
    };

    if (lines.length === 0) {
      // Legacy slip with no stored lines — fall back to the deprecated header fields.
      if (!target?.lotId) return [emptyRow()];
      const { lots, lotProducts } = hydrate(target.warehouseId, target.lotId);
      const kien = lotProducts.find((lp) => lp.id === target.lotProductId);
      return [{
        warehouseId: target.warehouseId ?? '',
        lotId: target.lotId ?? '',
        lotProductId: target.lotProductId ?? '',
        internationalProductId: kien?.internationalProductId ?? '',
        tenSanPham: target.tenSanPham ?? '',
        donViTinh: target.donViTinh ?? '',
        soLuongNhap: target.soLuongNhap ?? 0,
        ghiChu: target.ghiChu ?? '',
        tinhTrang: 'Bình thường', tinhTrangCustom: '', quyCach: '',
        lots, lotProducts, selectedKienIds: target.lotProductId ? [target.lotProductId] : [], perKienQty: target.lotProductId ? [target.soLuongNhap ?? 0] : [],
      }];
    }

    return lines.map((line) => {
      const { lots, lotProducts } = hydrate(line.warehouseId, line.lotId);
      const kien = lotProducts.find((lp) => lp.id === line.lotProductId);
      const rawTinh = (line as any).tinhTrang ?? '';
      const isKnownTinh = TINH_TRANG_OPTIONS.some((o) => o.value === rawTinh);
      return {
        id: line.id,
        warehouseId: line.warehouseId ?? '',
        lotId: line.lotId ?? '',
        lotProductId: line.lotProductId ?? '',
        internationalProductId: kien?.internationalProductId ?? '',
        tenSanPham: line.tenSanPham ?? '',
        donViTinh: line.donViTinh ?? '',
        soLuongNhap: line.soLuongThucTe ?? 0,
        ghiChu: line.ghiChu ?? '',
        tinhTrang: isKnownTinh ? rawTinh : (rawTinh ? 'Khác' : 'Bình thường'),
        tinhTrangCustom: isKnownTinh ? '' : rawTinh,
        quyCach: (line as any).quyCach ?? '',
        lots, lotProducts,
        selectedKienIds: line.lotProductId ? [line.lotProductId] : [],
        perKienQty: line.lotProductId ? [line.soLuongThucTe ?? 0] : [],
      };
    });
  };

  const updateRow = (index: number, updates: Partial<EditReceiptRow>) => {
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, ...updates } : row)));
  };

  const handleWarehouseChange = (index: number, warehouseId: string) => {
    const warehouse = warehouses.find((w) => w.id === warehouseId);
    updateRow(index, {
      warehouseId, lotId: '', lotProductId: '',
      lots: warehouse?.lots || [], lotProducts: [],
    });
  };

  const handleLotChange = (index: number, lotId: string) => {
    const lot = rows[index].lots.find((l) => l.id === lotId);
    updateRow(index, { lotId, lotProductId: '', lotProducts: lot?.lotProducts || [], selectedKienIds: [], perKienQty: [] });
  };

  const handleKienMultiChange = (index: number, ids: string[]) => {
    const total = rows[index]?.soLuongNhap ?? 0;
    const n = ids.length;
    let perKienQty: number[] = [];
    if (n > 0 && total > 0) {
      const base = Math.floor(total / n);
      const rem = total % n;
      perKienQty = ids.map((_, i) => i === n - 1 ? base + rem : base);
    } else {
      perKienQty = ids.map(() => 0);
    }
    // Keep lotProductId in sync with the picker so the single-kiem submit path
    // never falls back to a stale kiện selected earlier through the combobox.
    updateRow(index, { selectedKienIds: ids, perKienQty, lotProductId: ids.length === 1 ? ids[0] : '' });
  };

  const handleTotalChange = (index: number, total: number) => {
    const ids = rows[index]?.selectedKienIds ?? [];
    const n = ids.length;
    let perKienQty: number[] = [];
    if (n > 0 && total > 0) {
      const base = Math.floor(total / n);
      const rem = total % n;
      perKienQty = ids.map((_, i) => i === n - 1 ? base + rem : base);
    } else {
      perKienQty = ids.map(() => 0);
    }
    updateRow(index, { soLuongNhap: total, perKienQty });
  };

  const addRow = () => setRows((prev) => [...prev, emptyRow()]);

  const removeRow = (index: number) => {
    if (rows.length === 1) return;
    setRows((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!receipt) return;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!row.warehouseId || !row.lotId) {
        alert(`Dòng ${i + 1}: Vui lòng chọn kho và lô`);
        return;
      }
      const hasKien = (row.selectedKienIds?.length ?? 0) > 0 || !!row.lotProductId;
      if (!hasKien && !row.tenSanPham) {
        alert(`Dòng ${i + 1}: Vui lòng chọn hàng hóa/kiện hoặc nhập tên hàng hóa mới`);
        return;
      }
      if (row.soLuongNhap <= 0) {
        alert(`Dòng ${i + 1}: Số lượng nhập phải lớn hơn 0`);
        return;
      }
    }

    const removedCount = (receipt.items ?? []).filter(
      (line) => !rows.some((row) => row.id === line.id)
    ).length;

    // Detect a repoint inside a surviving line (same row, different package).
    // The second dialog warns the user that stored stock will be refunded to the
    // old kiện and deducted from the new one — otherwise the silent net delta
    // is invisible. Only fire on true lot/kien/lotProduct moves, not quantity edits.
    const repointDetected = (receipt.items ?? []).some((line) => {
      const row = rows.find((r) => r.id === line.id);
      if (!row) return false;
      const kienIds = row.selectedKienIds?.length
        ? row.selectedKienIds
        : row.lotProductId
        ? [row.lotProductId]
        : [];
      if (kienIds.length === 1 && kienIds[0] !== line.lotProductId) return true;
      if (kienIds.length !== 1 && kienIds.some((id) => id !== line.lotProductId)) return true;
      if (row.lotId !== line.lotId) return true;
      if (row.warehouseId !== line.warehouseId) return true;
      return false;
    });
    if (removedCount > 0) {
      const ok = confirm(
        `Bạn đã xóa ${removedCount} dòng hàng khỏi phiếu. ` +
        'Số lượng đã nhập của các dòng đó sẽ bị trừ khỏi tồn kho. Tiếp tục?'
      );
      if (!ok) return;
    } else if (repointDetected) {
      const ok = confirm(
        'Một số dòng được chuyển sang kho/lô/kiện khác. ' +
        'Số lượng sẽ được hoàn lại về kiện cũ và trừ vào kiện mới. Tiếp tục?'
      );
      if (!ok) return;
    }

    setLoading(true);
    try {
      const items = rows.flatMap((row) => {
        const warehouse = warehouses.find((w) => w.id === row.warehouseId);
        const lot = row.lots.find((l) => l.id === row.lotId);
        const tinhTrangVal = row.tinhTrang === 'Khác' ? (row.tinhTrangCustom || 'Khác') : (row.tinhTrang || undefined);
        const kienIds = row.selectedKienIds?.length ? row.selectedKienIds : (row.lotProductId ? [row.lotProductId] : []);
        if (kienIds.length > 1) {
          const perKien = row.perKienQty?.length === kienIds.length ? row.perKienQty : (() => { const base=Math.floor(row.soLuongNhap/kienIds.length); const rem=row.soLuongNhap%kienIds.length; return kienIds.map((_,i)=> i===kienIds.length-1 ? base+rem : base); })();
          const cap = kienCapacityByUnit(row.donViTinh);
          if (cap) { const maxPer=Math.max(...perKien); if(maxPer>cap) throw new Error(`Vượt sức chứa kiện (tối đa ${cap} ${row.donViTinh}/kiện)`); }
          return kienIds.map((kid, i) => {
            const lp = row.lotProducts.find((p)=> p.id===kid);
            return { ...(row.id && i===0 ? { id: row.id } : {}), lotProductId: kid, tenSanPham: lp?.internationalProduct?.tenSanPham || row.tenSanPham, warehouseId: row.warehouseId, tenKho: warehouse?.tenKho || '', lotId: lp?.lotId ?? row.lotId, tenLo: warehouses.find((w)=> w.id===row.warehouseId)?.lots?.find((l)=> l.id===(lp?.lotId ?? row.lotId))?.tenLo ?? lot?.tenLo ?? '', soLuongThucTe: perKien[i], donViTinh: lp?.donViTinh || row.donViTinh, ghiChu: row.ghiChu, tinhTrang: tinhTrangVal, quyCach: row.quyCach || undefined };
          });
        }
        const singleKienId = kienIds.length === 1 ? kienIds[0] : row.lotProductId;
        const lotProduct = row.lotProducts.find((lp) => lp.id === singleKienId);
        return [{ ...(row.id ? { id: row.id } : {}), lotProductId: singleKienId ?? '', tenSanPham: lotProduct?.internationalProduct?.tenSanPham || row.tenSanPham, warehouseId: row.warehouseId, tenKho: warehouse?.tenKho || '', lotId: (lotProduct as any)?.lotId ?? row.lotId, tenLo: lot?.tenLo || '', soLuongThucTe: row.soLuongNhap, donViTinh: lotProduct?.donViTinh || row.donViTinh, ghiChu: row.ghiChu, tinhTrang: tinhTrangVal, quyCach: row.quyCach || undefined }];
      });

      await warehouseReceiptService.updateWarehouseReceipt(receipt.id, {
        ghiChu,
        mucDich: mucDich || undefined,
        nguoiDeNghi: nguoiDeNghi || undefined,
        maNguoiDeNghi: maNguoiDeNghi || undefined,
        boPhan: boPhan || undefined,
        items,
      });
      alert('Cập nhật phiếu nhập kho thành công!');
      onSuccess?.();
      onClose();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Lỗi khi cập nhật phiếu nhập kho');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !receipt) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} showBackdrop>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-[900px] flex flex-col modal-viewport-h" onClick={(e) => e.stopPropagation()}>
        <datalist id="muc-dich-presets-edit">
          {MUC_DICH_PRESETS.map((p) => <option key={p} value={p} />)}
        </datalist>

        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
          <h2 className="text-xl font-bold text-gray-900">Cập nhật phiếu nhập kho</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-6 overflow-y-auto flex-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mã phiếu nhập</label>
              <input type="text" value={receipt.maPhieuNhap} disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nhân viên lập phiếu</label>
              <input type="text" value={receipt.tenNhanVien} disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Người đề nghị</label><EmployeeCombobox employees={employees} value={nguoiDeNghi} onChange={handleNguoiDeNghiChange} placeholder="" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Bộ phận</label><input value={boPhan} onChange={(e) => setBoPhan(e.target.value)} placeholder="" className="w-full px-3 py-2 border border-gray-300 rounded-lg" /></div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Danh sách sản phẩm nhập kho <span className="text-red-500">*</span>
              </label>
              <button type="button" onClick={addRow}
                className="flex items-center gap-1 px-3 py-1.5 text-sm bg-green-600 text-white rounded-md hover:bg-green-700">
                <Plus className="h-4 w-4" />
                Thêm dòng
              </button>
            </div>

            <div className="space-y-4">
              {rows.map((row, index) => (
                <div key={row.id ?? `new-${index}`} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-semibold text-gray-700">
                      Sản phẩm {index + 1}{row.tenSanPham ? `: ${row.tenSanPham}` : ''}
                      {!row.id && <span className="ml-2 text-xs font-normal text-green-600">(dòng mới)</span>}
                    </span>
                    <button type="button" onClick={() => removeRow(index)} disabled={rows.length === 1}
                      className="text-red-500 hover:text-red-700 disabled:text-gray-300">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Kho <span className="text-red-500">*</span></label>
                      <select value={row.warehouseId} onChange={(e) => handleWarehouseChange(index, e.target.value)}
                        required className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-green-500">
                        <option value="">Chọn kho</option>
                        {warehouses.map((w) => <option key={w.id} value={w.id}>{w.tenKho}</option>)}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Lô <span className="text-red-500">*</span></label>
                      <select value={row.lotId} onChange={(e) => handleLotChange(index, e.target.value)}
                        required disabled={!row.warehouseId}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-green-500 disabled:bg-gray-100">
                        <option value="">Chọn lô</option>
                        {row.lots.map((l) => <option key={l.id} value={l.id}>{l.tenLo}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="mt-3">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Hàng hóa <span className="text-red-500">*</span></label>
                    <ProductCombobox
                      products={allProducts}
                      value={row.internationalProductId || null}
                      disabled={!row.lotId}
                      lotProducts={row.lotProducts}
                      allowCreate
                      onChange={(productId, product) => {
                        const existing = row.lotProducts.find(
                          (lp) => lp.internationalProductId === productId
                        );
                        updateRow(index, {
                          internationalProductId: productId ?? '',
                          lotProductId: existing?.id ?? '',
                          tenSanPham: product?.tenSanPham ?? '',
                          donViTinh:
                            existing?.donViTinh ??
                            (isKnownUnit(product?.donViTinh) ? product!.donViTinh : row.donViTinh),
                        });
                      }}
                      onCreateNew={(tenSanPham) => {
                        updateRow(index, {
                          internationalProductId: '',
                          lotProductId: '',
                          tenSanPham,
                        });
                      }}
                    />
                    {row.lotProductId ? (() => {
                      const lp = row.lotProducts.find((p) => p.id === row.lotProductId);
                      return lp ? (
                        <p className="mt-1 text-xs text-blue-600">
                          Kiện {lp.maKien ?? lp.id.slice(-4)}, tồn hiện tại {lp.soLuong} {lp.donViTinh}
                        </p>
                      ) : null;
                    })() : row.tenSanPham ? (
                      <p className="mt-1 text-xs text-green-600">
                        Hàng hóa chưa có trong lô này — kiện mới sẽ được tạo khi lưu phiếu
                      </p>
                    ) : null}
                  </div>
                  {row.lotId && (
                    <div className="mt-3">
                      <label className="block text-xs font-medium text-gray-600 mb-1">Chọn kiện (có thể chọn nhiều — sẽ chia đều tổng số lượng)</label>
                      <MultiKienPicker lots={row.lots.filter((l) => l.id === row.lotId)} value={row.selectedKienIds} onChange={(ids) => handleKienMultiChange(index, ids)} />
                      {row.selectedKienIds.length > 1 && (
                        <div className="mt-2">
                          <div className="text-xs text-gray-500 mb-1">Chia đều {row.soLuongNhap} {row.donViTinh || ''} vào {row.selectedKienIds.length} kiện — có thể sửa tay:</div>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {row.selectedKienIds.map((kid, ki) => {
                              const lp = row.lotProducts.find((p) => p.id === kid);
                              const max = kienCapacityByUnit(row.donViTinh || lp?.donViTinh || '');
                              const per = row.perKienQty[ki] ?? 0;
                              const over = max !== null && per > max;
                              return (
                                <div key={kid} className={`p-2 rounded border ${over ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-white'}`}>
                                  <div className="text-xs font-mono text-gray-600">{lp?.maKien ?? kid.slice(-6)}</div>
                                  <input type="number" value={per} onChange={(e) => { const next=[...row.perKienQty]; next[ki]=parseNumberInput(e.target.value); updateRow(index,{ perKienQty: next }); }} min={0} step={0.01} className="mt-1 w-full px-2 py-1 border border-gray-300 rounded text-sm" />
                                  {over && <div className="text-xs text-red-600 mt-1">Vượt {max}</div>}
                                </div>
                              );
                            })}
                          </div>
                          {(() => { const sum=row.perKienQty.reduce((a,b)=>a+b,0); const diff=row.soLuongNhap-sum; return diff!==0 ? <div className="text-xs mt-1 text-amber-600">Tổng kiện ({sum}) lệch tổng phiếu ({row.soLuongNhap}) — chênh {diff>0?'+':''}{diff}</div> : null; })()}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Tổng số lượng <span className="text-red-500">*</span></label>
                      <input type="number" value={row.soLuongNhap === 0 ? '' : row.soLuongNhap} placeholder=""
                        onChange={(e) => handleTotalChange(index, parseNumberInput(e.target.value))}
                        required min="0" step="0.01"
                        className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-green-500" />
                    </div>

                    {!row.lotProductId && (
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Đơn vị tính <span className="text-red-500">*</span></label>
                        <UnitSelect
                          value={row.donViTinh}
                          onChange={(val) => updateRow(index, { donViTinh: val })}
                          className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-green-500"
                        />
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Ghi chú dòng</label>
                      <input type="text" value={row.ghiChu} placeholder=""
                        onChange={(e) => updateRow(index, { ghiChu: e.target.value })}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-green-500" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
                    <div><label className="block text-xs font-medium text-gray-600 mb-1">Tình trạng</label><select value={row.tinhTrang} onChange={(e) => updateRow(index, { tinhTrang: e.target.value })} className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"><option value="">—</option>{TINH_TRANG_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>{row.tinhTrang === 'Khác' && <input value={row.tinhTrangCustom} onChange={(e) => updateRow(index, { tinhTrangCustom: e.target.value })} placeholder="" className="mt-1 w-full px-2 py-1.5 border border-gray-300 rounded text-sm" />}</div>
                    <div><label className="block text-xs font-medium text-gray-600 mb-1">Quy cách</label><input value={row.quyCach} onChange={(e) => updateRow(index, { quyCach: e.target.value })} placeholder="" className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm" /></div>
                    <div />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mục đích nhập</label>
            <input type="text" list="muc-dich-presets-edit" value={mucDich}
              onChange={(e) => setMucDich(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú phiếu</label>
            <textarea value={ghiChu} onChange={(e) => setGhiChu(e.target.value)} rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500" />
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <button type="button" onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
              Hủy
            </button>
            <button type="submit" disabled={loading}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50">
              {loading ? 'Đang xử lý...' : `Cập nhật${rows.length > 1 ? ` (${rows.length} dòng)` : ''}`}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
};

export default EditWarehouseReceiptModal;
