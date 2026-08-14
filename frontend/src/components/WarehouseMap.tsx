import React, { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { MapPin, Package, PackageOpen } from 'lucide-react';
import type { Warehouse, LotProduct } from '../services/warehouseService';
import { useWarehouses, useUpdateLotProduct } from '../hooks';
import { getLayoutByMaKho, type LayoutSlot } from '../constants/warehouseLayouts';
import Modal from './Modal';

interface PlacedRow extends LotProduct {
  tenLo: string;
}

const formatNumber = (n: number) => new Intl.NumberFormat('vi-VN').format(n);

const zoneLabel = (zone: string) => {
  if (zone.startsWith('DAUCHIEN-')) return `Dầu chiên · ${zone.replace('DAUCHIEN-LO', 'LÔ ')}`;
  if (zone.startsWith('NHA-')) return `Nha · ${zone.replace('NHA-LO', 'LÔ ')}`;
  return zone.replace('LO', 'LÔ ');
};

interface ActiveSlot {
  zone: string;
  code: string;
  dbSlotId: string | null;
}

const WarehouseMap: React.FC<{ warehouseId: string | null; onWarehouseChange?: (id: string) => void }> = ({
  warehouseId,
  onWarehouseChange,
}) => {
  const { data: warehousesData } = useWarehouses();
  const updateLotProduct = useUpdateLotProduct();
  const [activeSlot, setActiveSlot] = useState<ActiveSlot | null>(null);
  const [assignId, setAssignId] = useState('');

  const warehouse = (warehousesData as Warehouse[] | undefined)?.find((w) => w.id === warehouseId) ?? null;
  const layout = getLayoutByMaKho(warehouse?.maKho);

  const mappedWarehouses = useMemo(
    () => ((warehousesData as Warehouse[] | undefined) ?? []).filter((w) => getLayoutByMaKho(w.maKho)),
    [warehousesData],
  );

  // Every stock row of this warehouse, flattened with its lot name
  const rows = useMemo<PlacedRow[]>(
    () => (warehouse?.lots ?? []).flatMap((l) => (l.lotProducts ?? []).map((lp) => ({ ...lp, tenLo: l.tenLo }))),
    [warehouse],
  );

  const dbSlotByZoneCode = useMemo(() => {
    const m = new Map<string, string>();
    (warehouse?.warehouseSlots ?? []).forEach((s) => m.set(`${s.zone}|${s.code}`, s.id));
    return m;
  }, [warehouse]);

  const bySlot = useMemo(() => {
    const m = new Map<string, PlacedRow[]>();
    rows.forEach((r) => {
      if (r.slotId) m.set(r.slotId, [...(m.get(r.slotId) ?? []), r]);
    });
    return m;
  }, [rows]);

  const unplaced = useMemo(() => rows.filter((r) => !r.slotId && r.soLuong > 0), [rows]);

  // Compact goods overview: sum quantities per product + unit
  const goods = useMemo(() => {
    const m = new Map<string, { tenSanPham: string; donViTinh: string; soLuong: number; kien: number }>();
    rows.forEach((r) => {
      const key = `${r.internationalProduct?.tenSanPham ?? '?'}|||${r.donViTinh}`;
      const cur = m.get(key) ?? { tenSanPham: r.internationalProduct?.tenSanPham ?? '?', donViTinh: r.donViTinh, soLuong: 0, kien: 0 };
      cur.soLuong += r.soLuong;
      cur.kien += 1;
      m.set(key, cur);
    });
    return [...m.values()].sort((a, b) => b.soLuong - a.soLuong);
  }, [rows]);

  // Zone label anchors: bottom-center of each zone's bounding box
  const zoneAnchors = useMemo(() => {
    const m = new Map<string, { x: number; y: number }>();
    (layout?.slots ?? []).forEach((s) => {
      const cur = m.get(s.zone);
      const right = s.x + s.w;
      const bottom = s.y + s.h;
      if (!cur) {
        m.set(s.zone, { x: (s.x + right) / 2, y: bottom });
      } else {
        m.set(s.zone, { x: (cur.x + (s.x + right) / 2) / 2, y: Math.max(cur.y, bottom) });
      }
    });
    return m;
  }, [layout]);

  if (!warehouse || !layout) return null;

  const slotRows = (s: LayoutSlot) => {
    const id = dbSlotByZoneCode.get(`${s.zone}|${s.code}`);
    return id ? bySlot.get(id) ?? [] : [];
  };
  const slotDbId = (s: LayoutSlot) => dbSlotByZoneCode.get(`${s.zone}|${s.code}`) ?? null;

  const occupiedSlots = layout.slots.filter((s) => slotRows(s).some((r) => r.soLuong > 0));

  const activeRows = activeSlot?.dbSlotId ? bySlot.get(activeSlot.dbSlotId) ?? [] : [];

  const handleAssign = async () => {
    if (!activeSlot?.dbSlotId || !assignId) return;
    try {
      await updateLotProduct.mutateAsync({ id: assignId, data: { slotId: activeSlot.dbSlotId } });
      toast.success('Đã đặt hàng vào vị trí');
      setAssignId('');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Lỗi khi đặt vị trí');
    }
  };

  const handleUnplace = async (id: string) => {
    if (!window.confirm('Gỡ hàng khỏi vị trí này?')) return;
    try {
      await updateLotProduct.mutateAsync({ id, data: { slotId: null } });
      toast.success('Đã gỡ vị trí');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Lỗi khi gỡ vị trí');
    }
  };

  return (
    <div className="flex flex-col xl:flex-row gap-4">
      {/* Map */}
      <div className="flex-1 bg-white rounded-lg shadow p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-blue-600" />
            Sơ đồ
            {onWarehouseChange ? (
              <select
                value={warehouse?.id ?? ''}
                onChange={(e) => onWarehouseChange(e.target.value)}
                aria-label="Chọn kho có bản đồ"
                className="border border-gray-300 rounded-lg px-2 py-1 text-xs font-medium text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {mappedWarehouses.map((w) => (
                  <option key={w.id} value={w.id}>{w.tenKho}</option>
                ))}
              </select>
            ) : (
              warehouse?.tenKho
            )}
          </h3>
          <div className="flex items-center gap-4 text-xs text-gray-600">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm border border-amber-400 bg-amber-100 inline-block" />
              Đang chứa ({occupiedSlots.length})
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm border border-green-300 bg-green-50 inline-block" />
              Trống ({layout.slots.length - occupiedSlots.length})
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm border border-gray-400 bg-gray-200 inline-block" />
              Dàn quạt
            </span>
          </div>
        </div>

        <svg viewBox={`0 0 ${layout.viewW} ${layout.viewH + 4}`} className="w-full" role="img" aria-label={`Sơ đồ ${warehouse.tenKho}`}>
          {layout.fans.map((f, i) => (
            <g key={`fan-${i}`}>
              <rect x={f.x} y={f.y} width={f.w} height={f.h} rx={0.4} className="fill-gray-200 stroke-gray-400" strokeWidth={0.2} />
              <text x={f.x + f.w / 2} y={f.y + f.h / 2 + 0.6} textAnchor="middle" fontSize={1.5} className="fill-gray-500">
                DÀN QUẠT
              </text>
            </g>
          ))}

          {layout.slots.map((s) => {
            const rs = slotRows(s);
            const occupied = rs.some((r) => r.soLuong > 0);
            const total = rs.reduce((a, r) => a + r.soLuong, 0);
            const title = `${zoneLabel(s.zone)} — ${s.code}: ${rs.length ? `${rs.length} mặt hàng, ${formatNumber(total)}` : 'trống'}`;
            return (
              <g
                key={`${s.zone}|${s.code}`}
                className="cursor-pointer"
                onClick={() => {
                  setActiveSlot({ zone: s.zone, code: s.code, dbSlotId: slotDbId(s) });
                  setAssignId('');
                }}
              >
                <title>{title}</title>
                <rect
                  x={s.x}
                  y={s.y}
                  width={s.w}
                  height={s.h}
                  rx={0.4}
                  strokeWidth={0.25}
                  className={occupied
                    ? 'fill-amber-100 stroke-amber-500 hover:fill-amber-200'
                    : 'fill-green-50 stroke-green-300 hover:fill-green-100'}
                />
                <text x={s.x + s.w / 2} y={s.y + s.h / 2 + 0.6} textAnchor="middle" fontSize={1.6} className="fill-gray-700 pointer-events-none">
                  {s.code}
                </text>
              </g>
            );
          })}

          {[...zoneAnchors.entries()].map(([zone, a]) => (
            <text key={zone} x={a.x} y={a.y + 2.4} textAnchor="middle" fontSize={1.7} fontWeight={600} className="fill-gray-500">
              {zoneLabel(zone)}
            </text>
          ))}
        </svg>
      </div>

      {/* Side panel */}
      <div className="w-full xl:w-80 shrink-0 space-y-4">
        <div className="bg-white rounded-lg shadow p-4">
          <h4 className="text-sm font-semibold text-gray-800 mb-2 flex items-center gap-1.5">
            <Package className="w-4 h-4 text-blue-600" />
            Hàng hóa trong kho
          </h4>
          {goods.length === 0 ? (
            <p className="text-xs text-gray-400">Kho chưa có hàng hóa</p>
          ) : (
            <ul className="divide-y divide-gray-100 max-h-72 overflow-y-auto">
              {goods.map((g) => (
                <li key={`${g.tenSanPham}|${g.donViTinh}`} className="py-1.5 flex items-baseline justify-between gap-2 text-xs">
                  <span className="text-gray-700">{g.tenSanPham}</span>
                  <span className="text-gray-900 font-medium whitespace-nowrap">
                    {formatNumber(g.soLuong)} {g.donViTinh}
                    <span className="text-gray-400 font-normal"> · {g.kien} kiện</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <h4 className="text-sm font-semibold text-gray-800 mb-2 flex items-center gap-1.5">
            <PackageOpen className="w-4 h-4 text-amber-600" />
            Chưa xếp vị trí ({unplaced.length})
          </h4>
          {unplaced.length === 0 ? (
            <p className="text-xs text-gray-400">Mọi hàng hóa đều đã có vị trí trên sơ đồ</p>
          ) : (
            <>
              <ul className="divide-y divide-gray-100 max-h-56 overflow-y-auto">
                {unplaced.map((r) => (
                  <li key={r.id} className="py-1.5 flex items-baseline justify-between gap-2 text-xs">
                    <span className="text-gray-700 truncate">
                      {r.internationalProduct?.tenSanPham ?? '?'}
                      <span className="text-gray-400"> · {r.maKien ?? r.id.slice(-4)}</span>
                    </span>
                    <span className="text-gray-900 font-medium whitespace-nowrap">{formatNumber(r.soLuong)} {r.donViTinh}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-[11px] text-gray-400">Chọn một ô trên sơ đồ để đặt hàng vào vị trí.</p>
            </>
          )}
        </div>
      </div>

      {/* Slot modal */}
      <Modal isOpen={!!activeSlot} onClose={() => setActiveSlot(null)} ariaLabel="Chi tiết vị trí">
        {activeSlot && (
          <div className="bg-white rounded-lg shadow-xl w-[calc(100vw-2rem)] sm:w-96 max-h-[85vh] flex flex-col">
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-800">
                Vị trí {zoneLabel(activeSlot.zone)} — {activeSlot.code}
              </h3>
              <button onClick={() => setActiveSlot(null)} className="p-1 text-gray-400 hover:text-gray-600 rounded" aria-label="Đóng">
                ✕
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-4">
              {activeSlot.dbSlotId ? (
                activeRows.length === 0 ? (
                  <p className="text-xs text-gray-400">Vị trí trống</p>
                ) : (
                  <ul className="divide-y divide-gray-100">
                    {activeRows.map((r) => (
                      <li key={r.id} className="py-2 flex items-center justify-between gap-2 text-xs">
                        <div>
                          <p className="text-gray-800 font-medium">{r.internationalProduct?.tenSanPham ?? '?'}</p>
                          <p className="text-gray-400">
                            {r.maKien ?? ''} · Lô {r.tenLo} · {formatNumber(r.soLuong)} {r.donViTinh}
                          </p>
                        </div>
                        <button
                          onClick={() => handleUnplace(r.id)}
                          className="px-2 py-1 text-red-600 border border-red-200 rounded hover:bg-red-50 whitespace-nowrap"
                        >
                          Gỡ vị trí
                        </button>
                      </li>
                    ))}
                  </ul>
                )
              ) : (
                <p className="text-xs text-amber-600">Vị trí chưa có trong CSDL — làm mới dữ liệu kho để đồng bộ.</p>
              )}

              {activeSlot.dbSlotId && (
                <div className="border-t border-gray-100 pt-3">
                  <label className="block text-xs font-medium text-gray-600 mb-1" htmlFor="assign-select">
                    Đặt hàng vào vị trí
                  </label>
                  <select
                    id="assign-select"
                    value={assignId}
                    onChange={(e) => setAssignId(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">— Chọn hàng chưa xếp vị trí —</option>
                    {unplaced.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.internationalProduct?.tenSanPham ?? '?'} · {r.maKien ?? r.id.slice(-4)} · {formatNumber(r.soLuong)} {r.donViTinh}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={handleAssign}
                    disabled={!assignId || updateLotProduct.isPending}
                    className="mt-2 w-full px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Đặt vào vị trí
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default WarehouseMap;
