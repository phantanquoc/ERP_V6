import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Package, FileText, AlertTriangle, Trophy, Clock, DollarSign, Inbox, ChevronDown, ChevronUp } from 'lucide-react';
import { useSupplyCostList } from '../hooks/useSupplyRequests';
import { useRepairRequestStats, useRepairRequest } from '../hooks/useRepairRequests';
import type { CostDetailEntry } from '../services/repairRequestService';
import type { SupplyRequest } from '../services/supplyRequestService';
import RepairRequestFormModal from './RepairRequestFormModal';

// ── formatters ──
const fmtVND = (n: number) => new Intl.NumberFormat('vi-VN').format(Math.round(n)) + ' ₫';
const fmtMaybeVND = (n: number | null) => (n == null ? '—' : fmtVND(n));
const fmtHours = (h: number | null) => (h == null ? '—' : `${h.toFixed(1)} giờ`);
const fmtDateVN = (s: string) => {
  try { const d = new Date(s); return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`; } catch { return s; }
};
const fmtCompact = (v: number) => new Intl.NumberFormat('vi-VN', { notation: 'compact' }).format(v);

const SUPPLY_STATUSES = ['Chưa cung cấp', 'Đang xử lý', 'Chờ bổ sung', 'Đã duyệt mua', 'Đã mua hàng', 'Đã nhập kho', 'Đã cung cấp', 'Đã hủy'] as const;
const LOAI_OPTIONS = [{ value: '', label: 'Tất cả loại' }, { value: 'Thường', label: 'Thường' }, { value: 'Mua nhanh', label: 'Mua nhanh' }];

const statusTone = (s: string) => {
  if (s === 'Đã hủy') return 'bg-red-100 text-red-700 ring-1 ring-red-200';
  if (s === 'Đã cung cấp' || s === 'Đã nhập kho') return 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200';
  if (s === 'Chưa cung cấp') return 'bg-gray-100 text-gray-700 ring-1 ring-gray-200';
  if (s === 'Đang xử lý' || s === 'Chờ bổ sung') return 'bg-amber-100 text-amber-700 ring-1 ring-amber-200';
  return 'bg-blue-50 text-blue-700 ring-1 ring-blue-200';
};

// ── URL filters ──
type SupplyView = 'yccc' | 'cost';
const VALID_VIEWS: SupplyView[] = ['yccc', 'cost'];
const isSupplyView = (v: string | null): v is SupplyView => (VALID_VIEWS as string[]).includes(v ?? '');

function useUrlFilters() {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentYear = new Date().getFullYear();
  const yearParam = searchParams.get('year');
  const year = yearParam ? parseInt(yearParam, 10) || currentYear : currentYear;
  const dateFrom = searchParams.get('dateFrom') || undefined;
  const dateTo = searchParams.get('dateTo') || undefined;
  const phongBanId = searchParams.get('phongBanId') || undefined;
  const supplyStatus = searchParams.get('supplyStatus') || undefined;
  const supplyLoai = searchParams.get('supplyLoai') || undefined;
  const supplyLinkedRaw = searchParams.get('supplyLinked');
  const supplyLinked = supplyLinkedRaw === 'true' ? true : supplyLinkedRaw === 'false' ? false : undefined;
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
  const supplyView: SupplyView = isSupplyView(searchParams.get('supplyView')) ? (searchParams.get('supplyView') as SupplyView) : 'yccc';

  const setParam = (k: string, v: string | undefined) => {
    const next = new URLSearchParams(searchParams);
    if (!v) next.delete(k); else next.set(k, v);
    if (k !== 'page') next.delete('page');
    setSearchParams(next, { replace: true });
  };
  const setPage = (p: number) => {
    const next = new URLSearchParams(searchParams);
    next.set('page', String(p));
    setSearchParams(next, { replace: true });
  };
  const setSupplyView = (v: SupplyView) => {
    const next = new URLSearchParams(searchParams);
    next.set('supplyView', v);
    next.delete('page');
    setSearchParams(next, { replace: true });
  };
  return { searchParams, setSearchParams, currentYear, year, dateFrom, dateTo, phongBanId, supplyStatus, supplyLoai, supplyLinked, page, setParam, setPage, supplyView, setSupplyView };
}

// ── small atoms ──
function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-gray-200 ${className}`} />;
}

function EmptyState({ icon: Icon = Inbox, title, hint }: { icon?: React.ElementType; title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-400"><Icon className="h-5 w-5" /></div>
      <p className="text-sm font-medium text-gray-600">{title}</p>
      {hint && <p className="text-xs text-gray-400">{hint}</p>}
    </div>
  );
}

function ErrorCard({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      <span>{message}</span>
      <button onClick={onRetry} className="shrink-0 rounded-full bg-white px-3 py-1 text-xs font-medium text-red-700 ring-1 ring-red-200 hover:bg-red-50">Thử lại</button>
    </div>
  );
}

function KpiCard({ label, value, sub, accent, icon: Icon }: { label: string; value: React.ReactNode; sub?: string; accent: string; icon: React.ElementType }) {
  return (
    <div className={`rounded-xl border bg-white p-3 shadow-sm border-l-4 ${accent} flex items-start justify-between gap-2`}>
      <div className="min-w-0">
        <p className="text-xs font-medium text-gray-500">{label}</p>
        <p className="mt-1 text-xl font-bold text-gray-900 truncate">{value}</p>
        {sub && <p className="text-[11px] text-gray-400">{sub}</p>}
      </div>
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-50 text-gray-400"><Icon className="h-4 w-4" /></span>
    </div>
  );
}

// ── main ──
export default function TechnicalSupplyCostTab() {
  const { currentYear, year, dateFrom, dateTo, phongBanId, supplyStatus, supplyLoai, supplyLinked, page, setParam, setPage, searchParams, setSearchParams, supplyView, setSupplyView } = useUrlFilters();
  const [selectedRepairId, setSelectedRepairId] = useState<number | null>(null);
  const [expandedMonth, setExpandedMonth] = useState<Set<string>>(new Set());

  const yearForSupply = !dateFrom && !dateTo ? year : undefined;
  const supplyQuery = useSupplyCostList({
    page, limit: 10, technicalOnly: true,
    linkedToRepair: supplyLinked,
    year: yearForSupply,
    trangThai: supplyStatus || undefined,
    loaiYeuCau: supplyLoai || undefined,
  });

  const statsQuery = useRepairRequestStats({ year: !dateFrom && !dateTo ? year : undefined, dateFrom, dateTo, phongBanId, requestType: 'SUA_CHUA' as never });
  const sd: Record<string, unknown> = (statsQuery.data?.data ?? {}) as Record<string, unknown>;
  const costByMonth = (sd.costByMonth ?? []) as Array<{ month: string; duKien: number; thucTe: number; incidental: number }>;
  const costDetailByMonth = (sd.costDetailByMonth ?? {}) as Record<string, CostDetailEntry[]>;
  const departments = (sd.departments ?? []) as Array<{ id: string; name: string }>;

  const repairDetailQuery = useRepairRequest(selectedRepairId);
  const modalRecord = repairDetailQuery.data?.data ?? null;

  const supplyRaw: unknown = supplyQuery.data;
  const supplyRows: SupplyRequest[] = useMemo(() => {
    if (!supplyRaw) return [];
    const r = supplyRaw as Record<string, unknown>;
    const d = r.data ?? r;
    if (Array.isArray(d)) return d as SupplyRequest[];
    if (Array.isArray((d as Record<string, unknown>).data)) return (d as Record<string, unknown>).data as SupplyRequest[];
    return [];
  }, [supplyRaw]);
  const supplyPagination = (supplyRaw as Record<string, unknown> | null)?.pagination as { total?: number; totalPages?: number } | undefined
    ?? ((supplyRaw as Record<string, unknown> | null)?.data as Record<string, unknown> | undefined)?.pagination as { total?: number } | undefined;
  const supplyTotal = supplyPagination?.total ?? supplyRows.length;
  const supplyTotalPages = (supplyPagination as { totalPages?: number })?.totalPages ?? Math.max(1, Math.ceil(supplyTotal / 10));

  const kpiCounts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const r of supplyRows) m[r.trangThai] = (m[r.trangThai] ?? 0) + 1;
    return m;
  }, [supplyRows]);

  const hasAnyFilter = year !== currentYear || !!(dateFrom || dateTo || phongBanId || supplyStatus || supplyLoai || supplyLinked !== undefined);

  const yearRange = Array.from({ length: 6 }, (_, i) => currentYear - 2 + i);

  return (
    <div className="space-y-4">
      {/* Shared header filters */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-gray-50 px-3 py-2.5 text-sm">
        <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600">Năm
          <select value={String(year)} onChange={e => setParam('year', e.target.value)} className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-500">
            {yearRange.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600">Từ <input type="date" value={dateFrom ?? ''} onChange={e => setParam('dateFrom', e.target.value || undefined)} className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-500" /></label>
        <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600">Đến <input type="date" value={dateTo ?? ''} onChange={e => setParam('dateTo', e.target.value || undefined)} className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-500" /></label>
        <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600">Phòng ban
          <select value={phongBanId ?? ''} onChange={e => setParam('phongBanId', e.target.value || undefined)} className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-500">
            <option value="">Tất cả</option>
            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </label>
        {hasAnyFilter && (
          <button onClick={() => {
            const next = new URLSearchParams(searchParams);
            next.delete('dateFrom'); next.delete('dateTo'); next.delete('phongBanId');
            next.delete('year'); next.delete('page'); next.delete('supplyStatus'); next.delete('supplyLoai'); next.delete('supplyLinked');
            setSearchParams(next, { replace: true });
          }} className="ml-auto text-xs font-medium text-cyan-700 hover:text-cyan-800 hover:underline">Xóa lọc</button>
        )}
      </div>

      {/* Sub-tab pills */}
      <div className="flex gap-2" role="tablist" aria-label="Cung ứng & chi phí">
        {([{ key: 'yccc' as SupplyView, label: 'YCCC của Kỹ thuật' }, { key: 'cost' as SupplyView, label: 'Chi phí sửa chữa' }] as const).map(({ key, label }) => {
          const active = supplyView === key;
          return (
            <button
              key={key}
              role="tab"
              aria-selected={active}
              onClick={() => setSupplyView(key)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-1 ${active ? 'bg-cyan-600 text-white shadow-sm' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
            >{label}</button>
          );
        })}
      </div>

      {/* ── Sub-tab: YCCC ── */}
      {supplyView === 'yccc' && (
        <div className="rounded-xl border bg-white shadow-sm">
          {/* yccc filter bar */}
          <div className="flex flex-wrap items-center gap-2 border-b px-3 py-2.5">
            <div className="inline-flex overflow-hidden rounded-full border border-gray-200 p-0.5 bg-gray-50">
              <button onClick={() => setParam('supplyLinked', undefined)} aria-pressed={supplyLinked === undefined} className={`rounded-full px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 ${supplyLinked === undefined ? 'bg-cyan-600 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}>Tất cả</button>
              <button onClick={() => setParam('supplyLinked', 'true')} aria-pressed={supplyLinked === true} className={`rounded-full px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 ${supplyLinked === true ? 'bg-cyan-600 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}>Chỉ YCCC gắn YCSC</button>
            </div>
            <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600">Trạng thái
              <select value={supplyStatus ?? ''} onChange={e => setParam('supplyStatus', e.target.value || undefined)} className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-500">
                <option value="">Tất cả</option>
                {SUPPLY_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
            <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600">Loại
              <select value={supplyLoai ?? ''} onChange={e => setParam('supplyLoai', e.target.value || undefined)} className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-500">
                {LOAI_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </label>
          </div>

          {/* KPI row */}
          <div className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-4">
            <KpiCard label="Tổng" value={supplyTotal} accent="border-cyan-500" icon={Package} />
            <KpiCard label="Chưa cung cấp" value={kpiCounts['Chưa cung cấp'] ?? 0} sub="trong trang hiện tại" accent="border-gray-300" icon={FileText} />
            <KpiCard label="Đã cung cấp" value={kpiCounts['Đã cung cấp'] ?? 0} sub="trong trang hiện tại" accent="border-emerald-500" icon={Package} />
            <KpiCard label="Đã hủy" value={kpiCounts['Đã hủy'] ?? 0} sub="trong trang hiện tại" accent="border-red-400" icon={AlertTriangle} />
          </div>

          {/* Table / states */}
          <div className="px-3 pb-3">
            {supplyQuery.isLoading ? (
              <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-10" />)}</div>
            ) : supplyQuery.isError ? (
              <ErrorCard message="Không tải được YCCC." onRetry={() => supplyQuery.refetch()} />
            ) : supplyRows.length === 0 ? (
              <EmptyState title="Chưa có YCCC của Kỹ thuật trong kỳ" hint="Thử đổi bộ lọc hoặc khoảng thời gian" />
            ) : (
              <>
                <div className="overflow-x-auto rounded-lg border">
                  <table className="w-full text-xs">
                    <thead><tr className="bg-gray-50 text-gray-600"><th className="px-2 py-2 text-left font-semibold">Mã</th><th className="px-2 py-2 text-left font-semibold">Ngày</th><th className="px-2 py-2 text-left font-semibold">Người YC</th><th className="px-2 py-2 text-left font-semibold">Mục đích</th><th className="px-2 py-2 text-left font-semibold">Trạng thái</th><th className="px-2 py-2 text-left font-semibold">Loại</th><th className="px-2 py-2 text-left font-semibold">YCSC liên kết</th></tr></thead>
                    <tbody>
                      {supplyRows.map(r => (
                        <tr key={r.id} className="border-t hover:bg-gray-50">
                          <td className="px-2 py-2 font-mono text-xs font-medium">{r.maYeuCau}</td>
                          <td className="whitespace-nowrap px-2 py-2">{fmtDateVN(r.ngayYeuCau)}</td>
                          <td className="px-2 py-2">{r.tenNhanVien}</td>
                          <td className="max-w-[180px] truncate px-2 py-2" title={r.mucDichYeuCau}>{r.mucDichYeuCau}</td>
                          <td className="px-2 py-2"><span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${statusTone(r.trangThai)}`}>{r.trangThai}</span></td>
                          <td className="px-2 py-2"><span className="inline-flex rounded bg-gray-100 px-1.5 py-0.5 text-[11px]">{r.loaiYeuCau ?? 'Thường'}</span></td>
                          <td className="px-2 py-2">
                            {!r.supplyLinks || r.supplyLinks.length === 0 ? <span className="text-gray-400">—</span> : (
                              <span className="flex flex-wrap gap-1">
                                {r.supplyLinks.map(l => (
                                  <button key={l.repairRequestId} onClick={() => setSelectedRepairId(l.repairRequestId)} className="rounded-full bg-cyan-50 px-2 py-0.5 font-mono text-[11px] text-cyan-700 ring-1 ring-cyan-200 hover:bg-cyan-100" title={l.trangThai}>{l.maYeuCau}</button>
                                ))}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs">
                  <span className="text-gray-500">Trang {page} / {supplyTotalPages} · {supplyTotal} phiếu</span>
                  <span className="flex gap-1">
                    <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="rounded-full border bg-white px-3 py-1 text-xs font-medium disabled:opacity-40 hover:bg-gray-50">‹ Trước</button>
                    <button disabled={page >= supplyTotalPages} onClick={() => setPage(page + 1)} className="rounded-full border bg-white px-3 py-1 text-xs font-medium disabled:opacity-40 hover:bg-gray-50">Sau ›</button>
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Sub-tab: Cost ── */}
      {supplyView === 'cost' && (
        <div className="space-y-4">
          {/* Chart card */}
          <div className="rounded-xl border bg-white p-4 shadow-sm">
            <div className="mb-3">
              <h3 className="text-sm font-semibold text-gray-900">Chi phí theo tháng</h3>
              <p className="text-xs text-gray-400">Thực tế + phát sinh (cột chồng) và dự kiến (nét xanh)</p>
            </div>
            {statsQuery.isError ? (
              <ErrorCard message="Không tải được thống kê chi phí." onRetry={() => statsQuery.refetch()} />
            ) : statsQuery.isLoading ? (
              <div className="space-y-2"><Skeleton className="h-48" /><Skeleton className="h-12" /></div>
            ) : costByMonth.length === 0 ? (
              <EmptyState title="Chưa có dữ liệu chi phí trong kỳ" icon={DollarSign} />
            ) : (
              <>
                <ResponsiveContainer width="100%" height={260}>
                  <ComposedChart data={costByMonth}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tickFormatter={fmtCompact} tick={{ fontSize: 11 }} width={56} />
                    <Tooltip formatter={(v: unknown) => fmtVND(Number(v ?? 0))} contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb' }} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="thucTe" stackId="cost" name="Thực tế" fill="#0891b2" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="incidental" stackId="cost" name="Phát sinh" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                    <Line type="monotone" dataKey="duKien" name="Dự kiến" stroke="#16a34a" dot={false} strokeWidth={2} />
                  </ComposedChart>
                </ResponsiveContainer>

                <div className="mt-4 divide-y divide-gray-100 overflow-hidden rounded-lg border">
                  {costByMonth.map(row => {
                    const details = costDetailByMonth[row.month] ?? [];
                    const isOpen = expandedMonth.has(row.month);
                    return (
                      <div key={row.month}>
                        <button onClick={() => setExpandedMonth(s => { const n = new Set(s); if (n.has(row.month)) n.delete(row.month); else n.add(row.month); return n; })} className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-sm hover:bg-gray-50">
                          <span className="font-medium text-gray-900">{row.month} — {details.length} phiếu — {fmtVND(row.thucTe + row.incidental)} <span className="font-normal text-gray-400">/ dự kiến {fmtVND(row.duKien)}</span></span>
                          <span className="shrink-0 text-gray-400">{isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}</span>
                        </button>
                        {isOpen && (
                          <div className="overflow-x-auto bg-gray-50/50 px-3 pb-3">
                            {details.length === 0 ? <p className="py-2 text-xs text-gray-400">Không có phiếu</p> : (
                              <table className="w-full text-xs">
                                <thead><tr className="text-gray-500"><th className="py-1.5 text-left font-semibold">Mã</th><th className="py-1.5 text-left font-semibold">Ngày</th><th className="py-1.5 text-right font-semibold">Dự kiến (₫)</th><th className="py-1.5 text-right font-semibold">Thực tế (₫)</th><th className="py-1.5 text-right font-semibold">Chênh lệch (₫)</th></tr></thead>
                                <tbody>
                                  {details.map(r => (
                                    <tr key={r.id} className="border-t border-gray-200">
                                      <td className="py-1.5"><button onClick={() => setSelectedRepairId(r.id)} className="font-mono text-cyan-700 hover:underline">{r.maYeuCau}</button></td>
                                      <td className="py-1.5">{r.ngayThang}</td>
                                      <td className="py-1.5 text-right">{fmtMaybeVND(r.duKien)}</td>
                                      <td className="py-1.5 text-right">{fmtMaybeVND(r.thucTe)}</td>
                                      <td className="py-1.5 text-right">{r.chenhLech == null ? '—' : fmtVND(r.chenhLech)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* KPI cards */}
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
            <div className="rounded-xl border bg-white p-4 shadow-sm border-l-4 border-cyan-500">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold text-gray-500">MTTR (giờ)</p>
                  <p className="mt-1 text-xl font-bold text-gray-900">{fmtHours((sd.mttrHours as number | null) ?? null)}</p>
                </div>
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-50 text-cyan-600"><Clock className="h-4 w-4" /></span>
              </div>
              {Array.isArray(sd.mttrByDept) && (sd.mttrByDept as unknown[]).length > 0 && (
                <details className="mt-2"><summary className="cursor-pointer text-xs font-medium text-cyan-700">Theo phòng ban yêu cầu</summary>
                  <ul className="mt-1 space-y-1 text-xs text-gray-600">{(sd.mttrByDept as Array<{ deptId: string | null; deptName: string; mttrHours: number | null }>).map(r => <li key={r.deptId ?? 'null'} className="flex justify-between"><span>{r.deptName}</span><span>{r.mttrHours != null ? `${r.mttrHours.toFixed(1)}h` : '—'}</span></li>)}</ul>
                </details>
              )}
            </div>
            <div className="rounded-xl border bg-white p-4 shadow-sm border-l-4 border-amber-400">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold text-gray-500">Tỉ lệ KHÔNG ĐẠT</p>
                  <p className="mt-1 text-xl font-bold text-gray-900">{(sd.khongDatRate as { rate: number | null } | undefined)?.rate != null ? `${(((sd.khongDatRate as { rate: number }).rate) * 100).toFixed(1)}%` : '—'}</p>
                  <p className="text-xs text-gray-400">{sd.khongDatRate ? `${(sd.khongDatRate as { khongDat: number }).khongDat}/${(sd.khongDatRate as { totalConfirmations: number }).totalConfirmations} lần nghiệm thu` : ''}</p>
                </div>
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600"><AlertTriangle className="h-4 w-4" /></span>
              </div>
            </div>
            <div className="rounded-xl border bg-white p-4 shadow-sm border-l-4 border-violet-400">
              <div className="mb-2 flex items-start justify-between">
                <p className="text-xs font-semibold text-gray-500">Top chi phí cao nhất</p>
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-50 text-violet-600"><Trophy className="h-4 w-4" /></span>
              </div>
              {!sd.topExpensive || (sd.topExpensive as unknown[]).length === 0 ? <p className="text-xs text-gray-400">Chưa có dữ liệu</p> : (
                <ul className="space-y-1.5 text-xs">
                  {(sd.topExpensive as Array<{ id: number; maYeuCau: string; total: number }>).map(r => (
                    <li key={r.id} className="flex justify-between gap-2"><button onClick={() => setSelectedRepairId(r.id)} className="truncate font-mono text-cyan-700 hover:underline">{r.maYeuCau}</button><span className="shrink-0 font-medium">{fmtVND(r.total)}</span></li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {selectedRepairId != null && (
        <RepairRequestFormModal isOpen={!!selectedRepairId} onClose={() => setSelectedRepairId(null)} mode="view" record={modalRecord as never} lockedRequestType="SUA_CHUA" />
      )}
    </div>
  );
}
