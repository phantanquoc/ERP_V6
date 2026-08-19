import React, { useEffect, useState } from 'react';
import { X, PackagePlus, Check, Plus, Trash2, AlertTriangle } from 'lucide-react';
import warehouseReceiptService from '../services/warehouseReceiptService';
import warehouseService, { Warehouse, Lot, LotProduct } from '../services/warehouseService';
import { useAuth } from '../contexts/AuthContext';
import { SupplyRequest } from '../services/supplyRequestService';
import { parseNumberInput } from '../utils/numberInput';
import Modal from './Modal';
import UnitSelect from './common/UnitSelect';
import ProductCombobox from './common/ProductCombobox';
import EmployeeCombobox from './common/EmployeeCombobox';
import MultiKienPicker from './common/MultiKienPicker';
import { useProducts } from '../hooks';
import { useEmployeesForAssignment } from '../hooks/useEmployeesForAssignment';
import { useUnitOptions } from '../hooks/useLookups';
import { TINH_TRANG_OPTIONS } from '../constants/warehouseCatalogs';
import { kienCapacityByUnit } from '../utils/kienCapacity';

interface CreateWarehouseReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  supplyRequest?: SupplyRequest | null;
  onSuccess?: () => void;
}

interface ReceiptRow {
  tenSanPham: string;
  soLuong: number;
  donViTinh: string;
  phanLoai: string;
  warehouseId: string;
  lotId: string;
  lotProductId: string;
  internationalProductId: string;
  ghiChu: string;
  tinhTrang: string;
  tinhTrangCustom: string;
  quyCach: string;
  selected: boolean;
  lots: Lot[];
  lotProducts: LotProduct[];
  selectedKienIds: string[];
  perKienQty: number[];
}

const MUC_DICH_PRESETS = [
  'Nhập từ thu mua',
  'Nhập thành phẩm sản xuất',
  'Nhập trả lại từ bộ phận',
  'Nhập điều chuyển kho',
  'Kiểm kê điều chỉnh',
];

const emptyRow = (): ReceiptRow => ({
  tenSanPham: '', soLuong: 0, donViTinh: '', phanLoai: '', warehouseId: '', lotId: '',
  lotProductId: '', internationalProductId: '', ghiChu: '', tinhTrang: 'Bình thường', tinhTrangCustom: '', quyCach: '', selected: true, lots: [], lotProducts: [], selectedKienIds: [], perKienQty: [],
});

const CreateWarehouseReceiptModal: React.FC<CreateWarehouseReceiptModalProps> = ({
  isOpen, onClose, supplyRequest, onSuccess,
}) => {
  const { user } = useAuth();
  const { isKnownUnit } = useUnitOptions();
  const { data: productsData } = useProducts({ page: 1, limit: 1000 });
  const products = productsData?.data || [];
  const { data: employeesData } = useEmployeesForAssignment();
  const employees = employeesData ?? [];
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(false);
  const [code, setCode] = useState('');
  const [rows, setRows] = useState<ReceiptRow[]>([]);
  const [mucDich, setMucDich] = useState('');
  const [ghiChu, setGhiChu] = useState('');
  const [nguoiDeNghi, setNguoiDeNghi] = useState('');
  const [boPhan, setBoPhan] = useState('');
  const [maNguoiDeNghi, setMaNguoiDeNghi] = useState('');

  const handleNguoiDeNghiChange = (name: string) => {
    setNguoiDeNghi(name);
    const emp = employees.find((e) => e.name === name);
    if (emp) {
      setMaNguoiDeNghi(emp.id);
      setBoPhan(emp.department ?? '');
    } else if (!name) {
      setMaNguoiDeNghi('');
      setBoPhan('');
    }
  };

  const isSupplyBatch = !!supplyRequest?.items?.length;
  const selectedRows = rows.filter((row) => row.selected);
  const firstSelected = selectedRows.find((row) => row.warehouseId);

  const getLotsForWarehouse = (warehouseId: string): Lot[] =>
    warehouses.find((warehouse) => warehouse.id === warehouseId)?.lots ?? [];

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    const initialize = async () => {
      const [warehouseResponse, codeResponse] = await Promise.all([
        warehouseService.getAllWarehouses() as any,
        warehouseReceiptService.generateReceiptCode(),
      ]);
      if (cancelled) return;
      const warehouseData = warehouseResponse.data?.data ?? warehouseResponse.data ?? [];
      setWarehouses(Array.isArray(warehouseData) ? warehouseData : []);
      setCode((codeResponse.data as { code: string }).code);
      setMucDich(isSupplyBatch ? 'Nhập từ thu mua' : '');
      setGhiChu('');
      setNguoiDeNghi(supplyRequest?.tenNhanVien ?? '');
      setBoPhan(supplyRequest?.boPhan ?? '');
      setMaNguoiDeNghi('');
      setRows(isSupplyBatch
        ? (supplyRequest?.items ?? []).map((item) => ({
            ...emptyRow(), tenSanPham: item.tenGoi, soLuong: item.soLuong, donViTinh: item.donViTinh,
            phanLoai: item.phanLoai || '', ghiChu: `Nhập kho cho ${supplyRequest?.maYeuCau} - ${item.tenGoi}`,
          }))
        : [emptyRow()]);
    };
    initialize().catch((error) => console.error('Error initializing receipt modal:', error));
    return () => { cancelled = true; };
  }, [isOpen, supplyRequest, isSupplyBatch]);

  const updateRow = (index: number, updates: Partial<ReceiptRow>) => {
    setRows((previous) => previous.map((row, rowIndex) => rowIndex === index ? { ...row, ...updates } : row));
  };

  const handleWarehouseChange = (index: number, warehouseId: string) => {
    updateRow(index, { warehouseId, lotId: '', lotProductId: '', lots: getLotsForWarehouse(warehouseId), lotProducts: [] });
  };

  const handleLotChange = (index: number, lotId: string) => {
    const row = rows[index];
    const lot = row?.lots.find((candidate) => candidate.id === lotId);
    updateRow(index, { lotId, lotProductId: '', lotProducts: lot?.lotProducts ?? [], selectedKienIds: [], perKienQty: [] });
  };

  const applyToAll = (warehouseId: string, lotId: string) => {
    const lots = getLotsForWarehouse(warehouseId);
    const lot = lots.find((candidate) => candidate.id === lotId);
    setRows((previous) => previous.map((row) => row.selected
      ? { ...row, warehouseId, lotId, lots, lotProducts: lot?.lotProducts ?? [], lotProductId: '' }
      : row));
  };

  const handleKienMultiChange = (index: number, ids: string[]) => {
    const total = rows[index]?.soLuong ?? 0;
    const n = ids.length;
    let perKienQty: number[] = [];
    if (n > 0 && total > 0) {
      const base = Math.floor(total / n);
      const rem = total % n;
      perKienQty = ids.map((_, i) => i === n - 1 ? base + rem : base);
    } else {
      perKienQty = ids.map(() => 0);
    }
    updateRow(index, { selectedKienIds: ids, perKienQty });
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
    updateRow(index, { soLuong: total, perKienQty });
  };

  const addRow = () => setRows((previous) => [...previous, emptyRow()]);
  const removeRow = (index: number) => setRows((previous) => previous.length > 1 ? previous.filter((_, i) => i !== index) : previous);

  const handleProductChange = (index: number, productId: string | null, product?: any) => {
    const row = rows[index];
    const existing = row.lotProducts.find((candidate) => candidate.internationalProductId === productId);
    updateRow(index, {
      internationalProductId: productId ?? '', lotProductId: existing?.id ?? '',
      tenSanPham: product?.tenSanPham ?? row.tenSanPham,
      donViTinh: existing?.donViTinh ?? (isKnownUnit(product?.donViTinh) ? product.donViTinh : row.donViTinh),
    });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const submittedRows = isSupplyBatch ? selectedRows : rows;
    if (submittedRows.length === 0) {
      alert('Vui lòng chọn ít nhất một sản phẩm');
      return;
    }
    const invalidIndex = submittedRows.findIndex((row) => {
      const hasKien = (row.selectedKienIds?.length ?? 0) > 0 || !!row.lotProductId;
      return !row.warehouseId || !row.lotId || (!hasKien && !row.tenSanPham) || row.soLuong <= 0
      || (!hasKien && !row.lotProductId && !row.donViTinh);
    });
    if (invalidIndex >= 0) {
      const row = submittedRows[invalidIndex];
      const rowNumber = rows.indexOf(row) + 1;
      alert(`Dòng ${rowNumber}: Vui lòng chọn kho, lô, hàng hóa/kiện, đơn vị tính và số lượng lớn hơn 0`);
      return;
    }

    setLoading(true);
    try {
      const items = submittedRows.flatMap((row) => {
        const warehouse = warehouses.find((candidate) => candidate.id === row.warehouseId);
        const lot = row.lots.find((candidate) => candidate.id === row.lotId);
        const tinhTrangVal = row.tinhTrang === 'Khác' ? (row.tinhTrangCustom || 'Khác') : row.tinhTrang;
        const kienIds = row.selectedKienIds?.length ? row.selectedKienIds : (row.lotProductId ? [row.lotProductId] : []);
        if (kienIds.length > 1) {
          const perKien = row.perKienQty?.length === kienIds.length ? row.perKienQty : (() => {
            const base = Math.floor(row.soLuong / kienIds.length);
            const rem = row.soLuong % kienIds.length;
            return kienIds.map((_, i) => i === kienIds.length - 1 ? base + rem : base);
          })();
          // capacity check
          const cap = kienCapacityByUnit(row.donViTinh);
          if (cap) {
            const maxPer = Math.max(...perKien);
            if (maxPer > cap) {
              throw new Error(`Vượt sức chứa kiện (tối đa ${cap} ${row.donViTinh}/kiện) — dùng nhiều kiện hơn hoặc giảm số lượng`);
            }
          }
          return kienIds.map((kid, i) => {
            const lp = row.lotProducts.find((p) => p.id === kid);
            return {
              lotProductId: kid,
              tenSanPham: lp?.internationalProduct?.tenSanPham || row.tenSanPham,
              warehouseId: row.warehouseId, tenKho: warehouse?.tenKho || '', lotId: lp?.lotId ?? row.lotId,
              tenLo: (warehouses.find((w) => w.id === row.warehouseId)?.lots?.find((l) => l.id === (lp?.lotId ?? row.lotId))?.tenLo) ?? lot?.tenLo ?? '',
              soLuongYeuCau: perKien[i], soLuongThucTe: perKien[i],
              donViTinh: lp?.donViTinh || row.donViTinh, ghiChu: row.ghiChu,
              tinhTrang: tinhTrangVal || undefined, quyCach: row.quyCach || undefined,
            };
          });
        }
        const lotProduct = row.lotProducts.find((candidate) => candidate.id === row.lotProductId);
        return [{
          lotProductId: row.lotProductId,
          tenSanPham: lotProduct?.internationalProduct?.tenSanPham || row.tenSanPham,
          warehouseId: row.warehouseId, tenKho: warehouse?.tenKho || '', lotId: row.lotId,
          tenLo: lot?.tenLo || '', soLuongYeuCau: row.soLuong, soLuongThucTe: row.soLuong,
          donViTinh: lotProduct?.donViTinh || row.donViTinh, ghiChu: row.ghiChu,
          tinhTrang: tinhTrangVal || undefined, quyCach: row.quyCach || undefined,
        }];
      });
      await warehouseReceiptService.createWarehouseReceipt({
        maPhieuNhap: code, employeeId: user?.employeeId || '', maNhanVien: user?.employeeCode || '',
        tenNhanVien: `${user?.lastName || ''} ${user?.firstName || ''}`.trim(), mucDich: mucDich || undefined,
        ghiChu: ghiChu || undefined, supplyRequestId: supplyRequest?.id,
        nguoiDeNghi: nguoiDeNghi || undefined, maNguoiDeNghi: maNguoiDeNghi || undefined, boPhan: boPhan || undefined,
        items,
      });
      alert(`Đã tạo phiếu nhập kho ${items.length} dòng thành công!`);
      onSuccess?.();
      onClose();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Lỗi khi tạo phiếu nhập kho');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} showBackdrop>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-[1000px] flex flex-col modal-viewport-h" onClick={(event) => event.stopPropagation()}>
        <datalist id="muc-dich-presets-create">
          {MUC_DICH_PRESETS.map((preset) => <option key={preset} value={preset} />)}
        </datalist>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2"><PackagePlus className="w-5 h-5 text-green-600" />Tạo phiếu nhập kho</h2>
          <button type="button" onClick={onClose} aria-label="Đóng" className="text-gray-400 hover:text-gray-600"><X className="h-6 w-6" /></button>
        </div>
        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 px-6 py-4 space-y-4">
          {supplyRequest && <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm"><span className="text-gray-600">Mã YC: </span><strong className="text-blue-700">{supplyRequest.maYeuCau}</strong><span className="ml-4 text-gray-600">Người yêu cầu: </span><strong>{supplyRequest.tenNhanVien}</strong></div>}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Mã phiếu nhập</label><input value={code} readOnly className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Nhân viên lập phiếu</label><input value={`${user?.lastName || ''} ${user?.firstName || ''}`.trim()} readOnly className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100" /></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Người đề nghị</label><EmployeeCombobox employees={employees} value={nguoiDeNghi} onChange={handleNguoiDeNghiChange} placeholder="" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Bộ phận</label><input value={boPhan} onChange={(e) => setBoPhan(e.target.value)} placeholder="" className="w-full px-3 py-2 border border-gray-300 rounded-lg" /></div>
          </div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Mục đích nhập</label><input type="text" list="muc-dich-presets-create" value={mucDich} onChange={(event) => setMucDich(event.target.value)} placeholder="" className="w-full px-3 py-2 border border-gray-300 rounded-lg" /></div>
          {isSupplyBatch && <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200"><span className="text-xs font-medium text-gray-500 uppercase">Áp dụng cho tất cả:</span><select className="text-sm border border-gray-300 rounded px-2 py-1" value={firstSelected?.warehouseId || ''} onChange={(event) => { const warehouseId = event.target.value; const lots = getLotsForWarehouse(warehouseId); applyToAll(warehouseId, lots.length === 1 ? lots[0].id : ''); }}><option value="">Chọn kho</option>{warehouses.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.tenKho}</option>)}</select>{firstSelected?.warehouseId && <select className="text-sm border border-gray-300 rounded px-2 py-1" value={firstSelected.lotId} onChange={(event) => applyToAll(firstSelected.warehouseId, event.target.value)}><option value="">Chọn lô</option>{getLotsForWarehouse(firstSelected.warehouseId).map((lot) => <option key={lot.id} value={lot.id}>{lot.tenLo}</option>)}</select>}</div>}
          <div className="flex items-center justify-between"><label className="block text-sm font-medium text-gray-700">Danh sách sản phẩm nhập kho <span className="text-red-500">*</span></label>{!isSupplyBatch && <button type="button" onClick={addRow} className="flex items-center gap-1 px-3 py-1.5 text-sm bg-green-600 text-white rounded-md hover:bg-green-700"><Plus className="h-4 w-4" />Thêm dòng</button>}</div>
          <div className="space-y-4">
            {rows.map((row, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                <div className="flex items-center justify-between mb-3"><span className="text-sm font-semibold text-gray-700">Dòng {index + 1}{row.tenSanPham ? `: ${row.tenSanPham}` : ''}</span>{!isSupplyBatch && <button type="button" onClick={() => removeRow(index)} disabled={rows.length === 1} aria-label={`Xóa dòng ${index + 1}`} className="text-red-500 hover:text-red-700 disabled:text-gray-300"><Trash2 className="h-4 w-4" /></button>}</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div><label className="block text-xs font-medium text-gray-600 mb-1">Kho <span className="text-red-500">*</span></label><select value={row.warehouseId} onChange={(event) => handleWarehouseChange(index, event.target.value)} disabled={isSupplyBatch && !row.selected} required className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm disabled:bg-gray-100"><option value="">Chọn kho</option>{warehouses.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.tenKho}</option>)}</select></div>
                  <div><label className="block text-xs font-medium text-gray-600 mb-1">Lô <span className="text-red-500">*</span></label><select value={row.lotId} onChange={(event) => handleLotChange(index, event.target.value)} disabled={!row.warehouseId || (isSupplyBatch && !row.selected)} required className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm disabled:bg-gray-100"><option value="">Chọn lô</option>{row.lots.map((lot) => <option key={lot.id} value={lot.id}>{lot.tenLo}</option>)}</select></div>
                </div>
                {!isSupplyBatch && <div className="mt-3"><label className="block text-xs font-medium text-gray-600 mb-1">Hàng hóa <span className="text-red-500">*</span></label><ProductCombobox products={products} value={row.internationalProductId || null} disabled={!row.lotId} lotProducts={row.lotProducts} allowCreate onChange={(productId, product) => handleProductChange(index, productId, product)} onCreateNew={(name) => updateRow(index, { internationalProductId: '', lotProductId: '', tenSanPham: name })} />{row.lotProductId && <p className="mt-1 text-xs text-blue-600">Kiện đã có trong lô — tồn hiện tại {row.lotProducts.find((item) => item.id === row.lotProductId)?.soLuong} {row.lotProducts.find((item) => item.id === row.lotProductId)?.donViTinh}</p>}</div>}
                {/* Multi-kiện picker: hiện khi đã chọn kho+lô (kể cả khi chọn hàng hóa đơn kiện) */}
                {row.warehouseId && row.lotId && (
                  <div className="mt-3">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Chọn kiện (có thể chọn nhiều — sẽ chia đều số lượng, remainder dồn kiện cuối){row.selectedKienIds.length > 0 && <span className="ml-2 text-blue-600 font-semibold">Đã chọn {row.selectedKienIds.length} kiện</span>}</label>
                    <MultiKienPicker lots={row.lots.filter((l) => l.id === row.lotId)} value={row.selectedKienIds} onChange={(ids) => handleKienMultiChange(index, ids)} disabled={isSupplyBatch && !row.selected} />
                    {row.selectedKienIds.length > 1 && (
                      <div className="mt-2">
                        <div className="text-xs text-gray-500 mb-1">Chia đều {row.soLuong} {row.donViTinh || ''} vào {row.selectedKienIds.length} kiện — có thể sửa tay từng kiện:</div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {row.selectedKienIds.map((kid, ki) => {
                            const lp = row.lotProducts.find((p) => p.id === kid);
                            const max = kienCapacityByUnit(row.donViTinh || lp?.donViTinh || '');
                            const per = row.perKienQty[ki] ?? 0;
                            const over = max !== null && per > max;
                            return (
                              <div key={kid} className={`p-2 rounded border ${over ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-white'}`}>
                                <div className="text-xs font-mono text-gray-600">{lp?.maKien ?? kid.slice(-6)}</div>
                                <input type="number" value={row.perKienQty[ki] ?? 0} onChange={(e) => { const next = [...row.perKienQty]; next[ki] = parseNumberInput(e.target.value); updateRow(index, { perKienQty: next }); }} min={0} step={0.01} className="mt-1 w-full px-2 py-1 border border-gray-300 rounded text-sm" />
                                {over && <div className="text-xs text-red-600 mt-1">Vượt {max} {row.donViTinh}</div>}
                              </div>
                            );
                          })}
                        </div>
                        {(() => { const sum = row.perKienQty.reduce((a,b)=>a+b,0); const diff = row.soLuong - sum; return diff !== 0 ? <div className="text-xs mt-1 flex items-center gap-1 text-amber-600"><AlertTriangle className="w-3 h-3" />Tổng kiện ({sum}) lệch tổng phiếu ({row.soLuong}) — chênh {diff > 0 ? '+' : ''}{diff}</div> : null; })()}
                      </div>
                    )}
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
                  <div><label className="block text-xs font-medium text-gray-600 mb-1">Tổng số lượng <span className="text-red-500">*</span></label><input type="number" value={row.soLuong === 0 ? '' : row.soLuong} placeholder="" onChange={(event) => handleTotalChange(index, parseNumberInput(event.target.value))} min="0.01" step="0.01" required disabled={isSupplyBatch && !row.selected} className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm" /></div>
                  <div><label className="block text-xs font-medium text-gray-600 mb-1">Đơn vị tính {!row.lotProductId && <span className="text-red-500">*</span>}</label>{row.lotProductId ? <input value={row.lotProducts.find((item) => item.id === row.lotProductId)?.donViTinh || row.donViTinh} readOnly className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm bg-gray-100" /> : <UnitSelect value={row.donViTinh} onChange={(value) => updateRow(index, { donViTinh: value })} className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm" />}</div>
                  <div><label className="block text-xs font-medium text-gray-600 mb-1">Ghi chú dòng</label><input value={row.ghiChu} onChange={(event) => updateRow(index, { ghiChu: event.target.value })} placeholder="" className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm" /></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
                  <div><label className="block text-xs font-medium text-gray-600 mb-1">Tình trạng</label><select value={row.tinhTrang} onChange={(e) => updateRow(index, { tinhTrang: e.target.value })} className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"><option value="">— Chọn —</option>{TINH_TRANG_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>{row.tinhTrang === 'Khác' && <input value={row.tinhTrangCustom} onChange={(e) => updateRow(index, { tinhTrangCustom: e.target.value })} placeholder="" className="mt-1 w-full px-2 py-1.5 border border-gray-300 rounded text-sm" />}</div>
                  <div><label className="block text-xs font-medium text-gray-600 mb-1">Quy cách (đóng gói)</label><input value={row.quyCach} onChange={(e) => updateRow(index, { quyCach: e.target.value })} placeholder="" className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm" /></div>
                  <div />
                </div>
                {isSupplyBatch && <label className="mt-3 flex items-center gap-2 text-xs text-gray-600"><input type="checkbox" checked={row.selected} onChange={(event) => updateRow(index, { selected: event.target.checked })} className="rounded" />Chọn dòng cấp phát</label>}
              </div>
            ))}
          </div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú phiếu</label><textarea value={ghiChu} onChange={(event) => setGhiChu(event.target.value)} rows={2} placeholder="" className="w-full px-3 py-2 border border-gray-300 rounded-lg" /></div>
          <div className="flex justify-end gap-2 pt-2"><button type="button" onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Hủy</button><button type="submit" disabled={loading} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2">{loading ? 'Đang xử lý...' : <><Check className="w-4 h-4" />Nhập kho {isSupplyBatch ? selectedRows.length : rows.length} dòng</>}</button></div>
        </form>
      </div>
    </Modal>
  );
};

export default CreateWarehouseReceiptModal;
