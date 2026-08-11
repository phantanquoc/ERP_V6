import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import warehouseIssueService, { WarehouseIssue } from '../services/warehouseIssueService';
import warehouseService, { Warehouse, Lot, LotProduct } from '../services/warehouseService';
import { parseNumberInput } from '../utils/numberInput';
import Modal from './Modal';
import LotProductCombobox from './common/LotProductCombobox';

interface EditWarehouseIssueModalProps {
  isOpen: boolean;
  issue: WarehouseIssue | null;
  onClose: () => void;
  onSuccess?: () => void;
}

interface EditIssueRow {
  /** Stored line id — carried back in the payload so the backend diff matches
   *  this row to its stored line instead of treating it as a delete + insert. */
  id?: string;
  warehouseId: string;
  lotId: string;
  lotProductId: string;
  soLuongXuat: number;
  ghiChu: string;
  lots: Lot[];
  lotProducts: LotProduct[];
  tenSanPham: string;
  donViTinh: string;
}

const emptyRow = (): EditIssueRow => ({
  warehouseId: '', lotId: '', lotProductId: '',
  soLuongXuat: 0, ghiChu: '', lots: [], lotProducts: [],
  tenSanPham: '', donViTinh: '',
});

const EditWarehouseIssueModal: React.FC<EditWarehouseIssueModalProps> = ({
  isOpen,
  issue,
  onClose,
  onSuccess,
}) => {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(false);
  const [ghiChu, setGhiChu] = useState('');
  const [rows, setRows] = useState<EditIssueRow[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;

    const load = async () => {
      const list = await fetchWarehouses();
      if (cancelled) return;
      setWarehouses(list);
      setGhiChu(issue?.ghiChu || '');
      setRows(buildRows(issue, list));
    };
    load();

    return () => { cancelled = true; };
  }, [isOpen, issue]);

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

  /** Seed one row per stored line, keeping the line id and rehydrating the
   *  lot / package pickers from the warehouse tree. */
  const buildRows = (target: WarehouseIssue | null, list: Warehouse[]): EditIssueRow[] => {
    const lines = target?.items ?? [];
    if (lines.length === 0) {
      // Legacy slip with no stored lines — fall back to the deprecated header fields.
      if (!target?.lotProductId) return [emptyRow()];
      const warehouse = list.find((w) => w.id === target.warehouseId);
      const lot = warehouse?.lots?.find((l) => l.id === target.lotId);
      return [{
        warehouseId: target.warehouseId ?? '',
        lotId: target.lotId ?? '',
        lotProductId: target.lotProductId ?? '',
        soLuongXuat: target.soLuongXuat ?? 0,
        ghiChu: target.ghiChu ?? '',
        lots: warehouse?.lots ?? [],
        lotProducts: lot?.lotProducts ?? [],
        tenSanPham: target.tenSanPham ?? '',
        donViTinh: target.donViTinh ?? '',
      }];
    }

    return lines.map((line) => {
      const warehouse = list.find((w) => w.id === line.warehouseId);
      const lot = warehouse?.lots?.find((l) => l.id === line.lotId);
      return {
        id: line.id,
        warehouseId: line.warehouseId ?? '',
        lotId: line.lotId ?? '',
        lotProductId: line.lotProductId ?? '',
        soLuongXuat: line.soLuongThucTe ?? 0,
        ghiChu: line.ghiChu ?? '',
        lots: warehouse?.lots ?? [],
        lotProducts: lot?.lotProducts ?? [],
        tenSanPham: line.tenSanPham ?? '',
        donViTinh: line.donViTinh ?? '',
      };
    });
  };

  const updateRow = (index: number, updates: Partial<EditIssueRow>) => {
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
    updateRow(index, { lotId, lotProductId: '', lotProducts: lot?.lotProducts || [] });
  };

  const addRow = () => setRows((prev) => [...prev, emptyRow()]);

  const removeRow = (index: number) => {
    if (rows.length === 1) return;
    setRows((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!issue) return;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!row.warehouseId || !row.lotId || !row.lotProductId) {
        alert(`Dòng ${i + 1}: Vui lòng chọn đầy đủ kho, lô và kiện hàng`);
        return;
      }
      if (row.soLuongXuat <= 0) {
        alert(`Dòng ${i + 1}: Số lượng xuất phải lớn hơn 0`);
        return;
      }
    }

    const removedCount = (issue.items ?? []).filter(
      (line) => !rows.some((row) => row.id === line.id)
    ).length;
    if (removedCount > 0) {
      const ok = confirm(
        `Bạn đã xóa ${removedCount} dòng hàng khỏi phiếu. ` +
        'Số lượng của các dòng đó sẽ được hoàn lại tồn kho. Tiếp tục?'
      );
      if (!ok) return;
    }

    setLoading(true);
    try {
      const items = rows.map((row) => {
        const warehouse = warehouses.find((w) => w.id === row.warehouseId);
        const lot = row.lots.find((l) => l.id === row.lotId);
        const lotProduct = row.lotProducts.find((lp) => lp.id === row.lotProductId);
        return {
          // Present only for stored lines — a new row has no id and lands as an insert.
          ...(row.id ? { id: row.id } : {}),
          lotProductId: row.lotProductId,
          tenSanPham: lotProduct?.internationalProduct?.tenSanPham || row.tenSanPham || '',
          warehouseId: row.warehouseId,
          tenKho: warehouse?.tenKho || '',
          lotId: row.lotId,
          tenLo: lot?.tenLo || '',
          soLuongThucTe: row.soLuongXuat,
          donViTinh: lotProduct?.donViTinh || row.donViTinh || '',
          ghiChu: row.ghiChu,
        };
      });

      await warehouseIssueService.updateWarehouseIssue(issue.id, { ghiChu, items });
      alert('Cập nhật phiếu xuất kho thành công!');
      onSuccess?.();
      onClose();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Lỗi khi cập nhật phiếu xuất kho');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !issue) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} showBackdrop>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-[900px] flex flex-col modal-viewport-h" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
          <h2 className="text-xl font-bold text-gray-900">Cập nhật phiếu xuất kho</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-6 overflow-y-auto flex-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mã phiếu xuất</label>
              <input type="text" value={issue.maPhieuXuat} disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nhân viên</label>
              <input type="text" value={issue.tenNhanVien} disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100" />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Danh sách sản phẩm xuất kho <span className="text-red-500">*</span>
              </label>
              <button type="button" onClick={addRow}
                className="flex items-center gap-1 px-3 py-1.5 text-sm bg-red-600 text-white rounded-md hover:bg-red-700">
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

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Kho <span className="text-red-500">*</span></label>
                      <select value={row.warehouseId} onChange={(e) => handleWarehouseChange(index, e.target.value)}
                        required className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-red-500">
                        <option value="">Chọn kho</option>
                        {warehouses.map((w) => <option key={w.id} value={w.id}>{w.tenKho}</option>)}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Lô <span className="text-red-500">*</span></label>
                      <select value={row.lotId} onChange={(e) => handleLotChange(index, e.target.value)}
                        required disabled={!row.warehouseId}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-red-500 disabled:bg-gray-100">
                        <option value="">Chọn lô</option>
                        {row.lots.map((l) => <option key={l.id} value={l.id}>{l.tenLo}</option>)}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Kiện hàng <span className="text-red-500">*</span></label>
                      <LotProductCombobox
                        lotProducts={row.lotProducts}
                        value={row.lotProductId || null}
                        disabled={!row.lotId}
                        // A stored line has already drawn from its kiện, so a kiện at
                        // zero stock is still a valid target when editing.
                        hideEmpty={!row.id}
                        onChange={(lotProductId) => updateRow(index, { lotProductId: lotProductId ?? '' })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Số lượng xuất <span className="text-red-500">*</span></label>
                      <input type="number" value={row.soLuongXuat}
                        onChange={(e) => updateRow(index, { soLuongXuat: parseNumberInput(e.target.value) })}
                        required min="0" step="0.01"
                        className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-red-500" />
                      {(() => {
                        const lp = row.lotProducts.find((p) => p.id === row.lotProductId);
                        if (!lp) return null;
                        return (
                          <p className="text-xs mt-1 text-gray-500">
                            Tồn hiện tại của kiện: {lp.soLuong} {lp.donViTinh}
                            {row.id ? ' (chưa tính hoàn lại số lượng của dòng này)' : ''}
                          </p>
                        );
                      })()}
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Ghi chú dòng</label>
                      <input type="text" value={row.ghiChu}
                        onChange={(e) => updateRow(index, { ghiChu: e.target.value })}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-red-500" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú phiếu</label>
            <textarea value={ghiChu} onChange={(e) => setGhiChu(e.target.value)} rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500" />
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <button type="button" onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
              Hủy
            </button>
            <button type="submit" disabled={loading}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50">
              {loading ? 'Đang xử lý...' : `Cập nhật${rows.length > 1 ? ` (${rows.length} dòng)` : ''}`}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
};

export default EditWarehouseIssueModal;
