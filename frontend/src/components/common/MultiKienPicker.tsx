import React, { useMemo, useState } from 'react';
import type { LotProduct, Lot } from '../../services/warehouseService';

interface MultiKienPickerProps {
  lots: Lot[];
  value: string[]; // lotProductId[]
  onChange: (ids: string[]) => void;
  disabled?: boolean;
}

const MultiKienPicker: React.FC<MultiKienPickerProps> = ({ lots, value, onChange, disabled }) => {
  const [q, setQ] = useState('');
  const [lotFilter, setLotFilter] = useState<string>('');

  const flat: Array<LotProduct & { tenLo: string; lotId: string }> = useMemo(() => {
    const out: Array<LotProduct & { tenLo: string; lotId: string }> = [];
    for (const lot of lots) {
      for (const lp of (lot.lotProducts ?? [])) {
        out.push({ ...lp, tenLo: lot.tenLo, lotId: lot.id });
      }
    }
    return out;
  }, [lots]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return flat.filter((lp) => {
      if (lotFilter && lp.lotId !== lotFilter) return false;
      if (!query) return true;
      const ma = (lp.maKien ?? '').toLowerCase();
      const ten = (lp.internationalProduct?.tenSanPham ?? '').toLowerCase();
      return ma.includes(query) || ten.includes(query);
    });
  }, [flat, q, lotFilter]);

  const setForLot = (lotId: string, checked: boolean) => {
    const idsInLot = flat.filter((lp) => lp.lotId === lotId).map((lp) => lp.id);
    if (checked) {
      const next = Array.from(new Set([...value, ...idsInLot]));
      onChange(next);
    } else {
      onChange(value.filter((id) => !idsInLot.includes(id)));
    }
  };

  return (
    <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
      <div className="flex flex-wrap gap-2 mb-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Tìm mã kiện / tên hàng..."
          disabled={disabled}
          className="flex-1 min-w-[160px] px-2 py-1.5 border border-gray-300 rounded text-sm disabled:bg-gray-100"
        />
        <select
          value={lotFilter}
          onChange={(e) => setLotFilter(e.target.value)}
          disabled={disabled}
          className="px-2 py-1.5 border border-gray-300 rounded text-sm disabled:bg-gray-100"
        >
          <option value="">Tất cả lô</option>
          {lots.map((lot) => (
            <option key={lot.id} value={lot.id}>{lot.tenLo}</option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap gap-2 mb-2">
        {lots.map((lot) => {
          const idsInLot = flat.filter((lp) => lp.lotId === lot.id).map((lp) => lp.id);
          const allChecked = idsInLot.length > 0 && idsInLot.every((id) => value.includes(id));
          return (
            <label key={lot.id} className="inline-flex items-center gap-1 text-xs text-gray-600">
              <input
                type="checkbox"
                checked={allChecked}
                disabled={disabled || idsInLot.length === 0}
                onChange={(e) => setForLot(lot.id, e.target.checked)}
              />
              Chọn hết {lot.tenLo}
            </label>
          );
        })}
      </div>

      <div className="max-h-48 overflow-y-auto bg-white rounded border border-gray-200 divide-y">
        {filtered.length === 0 ? (
          <div className="px-3 py-2 text-sm text-gray-400">Không có kiện phù hợp</div>
        ) : filtered.map((lp) => {
          const checked = value.includes(lp.id);
          return (
            <label key={lp.id} className="flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-gray-50">
              <input type="checkbox" checked={checked} disabled={disabled} onChange={(e) => {
                if (e.target.checked) onChange([...value, lp.id]);
                else onChange(value.filter((id) => id !== lp.id));
              }} />
              <span className="font-mono text-xs text-gray-500">{lp.maKien ?? lp.id.slice(-4)}</span>
              <span className="flex-1 truncate">{lp.internationalProduct?.tenSanPham ?? '—'}</span>
              <span className="text-xs text-gray-400">{lp.tenLo}</span>
              <span className="text-xs font-semibold text-blue-700 whitespace-nowrap">Tồn {lp.soLuong} {lp.donViTinh}</span>
            </label>
          );
        })}
      </div>

      {value.length > 0 && (
        <div className="mt-2 text-xs text-gray-600">Đã chọn {value.length} kiện</div>
      )}
    </div>
  );
};

export default MultiKienPicker;
