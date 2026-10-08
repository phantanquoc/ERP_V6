import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { CollapsibleSection } from './shared';
import { useSupplyCostList } from '../hooks/useSupplyRequests';
import { useRepairRequestStats, useRepairRequest } from '../hooks/useRepairRequests';
import type { CostDetailEntry } from '../services/repairRequestService';
import type { SupplyRequest } from '../services/supplyRequestService';
import RepairRequestFormModal from './RepairRequestFormModal';

const fmtVND = (n: number) => new Intl.NumberFormat('vi-VN').format(Math.round(n)) + ' ₫';
const fmtMaybeVND = (n: number | null) => (n == null ? '—' : fmtVND(n));
const fmtHours = (h: number | null) => (h == null ? '—' : `${h.toFixed(1)} giờ`);
const fmtDateVN = (s: string) => {
  try { const d = new Date(s); return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`; } catch { return s; }
};

const SUPPLY_STATUSES = ['Chưa cung cấp','Đang xử lý','Chờ bổ sung','Đã duyệt mua','Đã mua hàng','Đã nhập kho','Đã cung cấp','Đã hủy'] as const;
const LOAI_OPTIONS = [{ value: '', label: 'Tất cả loại' }, { value: 'Thường', label: 'Thường' }, { value: 'Mua nhanh', label: 'Mua nhanh' }];

const statusTone = (s: string) => {
  if (s === 'Đã hủy') return 'bg-red-100 text-red-700';
  if (s === 'Đã cung cấp' || s === 'Đã nhập kho') return 'bg-emerald-100 text-emerald-700';
  if (s === 'Chưa cung cấp') return 'bg-gray-100 text-gray-700';
  if (s === 'Đang xử lý' || s === 'Chờ bổ sung') return 'bg-amber-100 text-amber-700';
  return 'bg-blue-50 text-blue-700';
};

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
  return { searchParams, setSearchParams, currentYear, year, dateFrom, dateTo, phongBanId, supplyStatus, supplyLoai, supplyLinked, page, setParam, setPage };
}

export default function TechnicalSupplyCostTab() {
  const { currentYear, year, dateFrom, dateTo, phongBanId, supplyStatus, supplyLoai, supplyLinked, page, setParam, setPage, searchParams, setSearchParams } = useUrlFilters();
  const [selectedRepairId, setSelectedRepairId] = useState<number | null>(null);
  const [expandedMonth, setExpandedMonth] = useState<Set<string>>(new Set());

  // Block 1: YCCC of Technical
  const yearForSupply = !dateFrom && !dateTo ? year : undefined;
  const supplyQuery = useSupplyCostList({
    page, limit: 10, technicalOnly: true,
    linkedToRepair: supplyLinked,
    year: yearForSupply,
    trangThai: supplyStatus || undefined,
    loaiYeuCau: supplyLoai || undefined,
  });

  // Block 2: repair cost stats
  const statsQuery = useRepairRequestStats({ year: !dateFrom && !dateTo ? year : undefined, dateFrom, dateTo, phongBanId, requestType: 'SUA_CHUA' as never });
  const sd: Record<string, unknown> = (statsQuery.data?.data ?? {}) as Record<string, unknown>;
  const costByMonth = (sd.costByMonth ?? []) as Array<{ month: string; duKien: number; thucTe: number; incidental: number }>;
  const costDetailByMonth = (sd.costDetailByMonth ?? {}) as Record<string, CostDetailEntry[]>;
  const departments = (sd.departments ?? []) as Array<{ id: string; name: string }>;

  // modal detail
  const repairDetailQuery = useRepairRequest(selectedRepairId);
  const modalRecord = repairDetailQuery.data?.data ?? null;

  // supply list data extraction (apiClient returns { data, pagination } or { success, data, pagination })
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

  // KPI counts by trangThai (page-local; backend does not return aggregated byStatus for supply)
  const kpiCounts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const r of supplyRows) m[r.trangThai] = (m[r.trangThai] ?? 0) + 1;
    return m;
  }, [supplyRows]);

  const hasAnyFilter = year !== currentYear || !!(dateFrom || dateTo || phongBanId || supplyStatus || supplyLoai || supplyLinked !== undefined);

  return (
    <div className="space-y-4">
      {/* Shared header filters */}
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <label className="flex items-center gap-1">Năm
          <select value={String(year)} onChange={e=>setParam('year', e.target.value)} className="rounded border border-gray-300 px-2 py-1 text-xs">
            {Array.from({length:6},(_,i)=> currentYear - 2 + i).map(y=> <option key={y} value={y}>{y}</option>)}
          </select>
        </label>
        <label className="flex items-center gap-1">Từ <input type="date" value={dateFrom ?? ''} onChange={e=>setParam('dateFrom', e.target.value || undefined)} className="rounded border border-gray-300 px-2 py-1 text-xs" /></label>
        <label className="flex items-center gap-1">Đến <input type="date" value={dateTo ?? ''} onChange={e=>setParam('dateTo', e.target.value || undefined)} className="rounded border border-gray-300 px-2 py-1 text-xs" /></label>
        <label className="flex items-center gap-1">Phòng ban
          <select value={phongBanId ?? ''} onChange={e=>setParam('phongBanId', e.target.value || undefined)} className="rounded border border-gray-300 px-2 py-1 text-xs">
            <option value="">Tất cả</option>
            {departments.map(d=> <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </label>
        {hasAnyFilter && (
          <button onClick={() => {
            const next = new URLSearchParams(searchParams);
            next.delete('dateFrom'); next.delete('dateTo'); next.delete('phongBanId');
            next.delete('year');
            next.delete('page'); next.delete('supplyStatus'); next.delete('supplyLoai'); next.delete('supplyLinked');
            setSearchParams(next,{replace:true});
          }} className="text-xs text-blue-600 hover:underline">Xóa lọc</button>
        )}
      </div>

      {/* Block 1 — YCCC of Technical */}
      <CollapsibleSection title="YCCC của Kỹ thuật" defaultOpen>
        {/* Toggle linkedToRepair */}
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <div className="inline-flex rounded-md border border-gray-200 overflow-hidden">
            <button onClick={()=>setParam('supplyLinked', undefined)} className={`px-3 py-1 text-xs font-medium ${supplyLinked===undefined ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}>Tất cả</button>
            <button onClick={()=>setParam('supplyLinked', 'true')} className={`px-3 py-1 text-xs font-medium border-l border-gray-200 ${supplyLinked===true ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}>Chỉ YCCC gắn YCSC</button>
          </div>
          <label className="flex items-center gap-1 text-xs">Trạng thái
            <select value={supplyStatus ?? ''} onChange={e=>setParam('supplyStatus', e.target.value || undefined)} className="rounded border border-gray-300 px-2 py-1 text-xs">
              <option value="">Tất cả</option>
              {SUPPLY_STATUSES.map(s=> <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
          <label className="flex items-center gap-1 text-xs">Loại
            <select value={supplyLoai ?? ''} onChange={e=>setParam('supplyLoai', e.target.value || undefined)} className="rounded border border-gray-300 px-2 py-1 text-xs">
              {LOAI_OPTIONS.map(o=> <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </label>
        </div>

        {/* KPI row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
          <div className="rounded-lg border bg-white p-2.5"><p className="text-xs text-gray-500">Tổng</p><p className="text-lg font-bold text-gray-900">{supplyTotal}</p></div>
          <div className="rounded-lg border bg-white p-2.5"><p className="text-xs text-gray-500">Chưa cung cấp</p><p className="text-lg font-bold text-gray-900">{kpiCounts['Chưa cung cấp'] ?? 0}</p><p className="text-[11px] text-gray-400">trong trang hiện tại</p></div>
          <div className="rounded-lg border bg-white p-2.5"><p className="text-xs text-gray-500">Đã cung cấp</p><p className="text-lg font-bold text-gray-900">{kpiCounts['Đã cung cấp'] ?? 0}</p><p className="text-[11px] text-gray-400">trong trang hiện tại</p></div>
          <div className="rounded-lg border bg-white p-2.5"><p className="text-xs text-gray-500">Đã hủy</p><p className="text-lg font-bold text-gray-900">{kpiCounts['Đã hủy'] ?? 0}</p><p className="text-[11px] text-gray-400">trong trang hiện tại</p></div>
        </div>

        {supplyQuery.isLoading ? (
          <div className="space-y-2">{[1,2,3].map(i=> <div key={i} className="h-12 rounded bg-gray-100 animate-pulse" />)}</div>
        ) : supplyQuery.isError ? (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-700 flex items-center justify-between">Không tải được YCCC. <button onClick={()=>supplyQuery.refetch()} className="rounded border border-red-300 bg-white px-2 py-1 text-xs">Thử lại</button></div>
        ) : supplyRows.length === 0 ? (
          <p className="text-sm text-gray-400 py-4 text-center">Chưa có YCCC của Kỹ thuật trong kỳ</p>
        ) : (
          <>
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-xs">
                <thead><tr className="bg-gray-50 text-gray-600"><th className="text-left px-2 py-1.5">Mã</th><th className="text-left px-2 py-1.5">Ngày</th><th className="text-left px-2 py-1.5">Người YC</th><th className="text-left px-2 py-1.5">Mục đích</th><th className="text-left px-2 py-1.5">Trạng thái</th><th className="text-left px-2 py-1.5">Loại</th><th className="text-left px-2 py-1.5">YCSC liên kết</th></tr></thead>
                <tbody>
                  {supplyRows.map(r=> (
                    <tr key={r.id} className="border-t hover:bg-gray-50">
                      <td className="px-2 py-1.5 font-mono font-medium">{r.maYeuCau}</td>
                      <td className="px-2 py-1.5 whitespace-nowrap">{fmtDateVN(r.ngayYeuCau)}</td>
                      <td className="px-2 py-1.5">{r.tenNhanVien}</td>
                      <td className="px-2 py-1.5 max-w-[180px] truncate" title={r.mucDichYeuCau}>{r.mucDichYeuCau}</td>
                      <td className="px-2 py-1.5"><span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${statusTone(r.trangThai)}`}>{r.trangThai}</span></td>
                      <td className="px-2 py-1.5"><span className="inline-flex rounded bg-gray-100 px-1.5 py-0.5 text-[11px]">{r.loaiYeuCau ?? 'Thường'}</span></td>
                      <td className="px-2 py-1.5">
                        {!r.supplyLinks || r.supplyLinks.length===0 ? <span className="text-gray-400">—</span> : (
                          <span className="flex flex-wrap gap-1">
                            {r.supplyLinks.map(l=> (
                              <button key={l.repairRequestId} onClick={()=>setSelectedRepairId(l.repairRequestId)} className="rounded bg-blue-50 px-1.5 py-0.5 font-mono text-[11px] text-blue-700 hover:bg-blue-100" title={l.trangThai}>{l.maYeuCau}</button>
                            ))}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-2 flex items-center justify-between text-xs">
              <span className="text-gray-500">Trang {page} / {supplyTotalPages} · {supplyTotal} phiếu</span>
              <span className="flex gap-1">
                <button disabled={page<=1} onClick={()=>setPage(page-1)} className="rounded border px-2 py-1 disabled:opacity-40">‹ Trước</button>
                <button disabled={page>=supplyTotalPages} onClick={()=>setPage(page+1)} className="rounded border px-2 py-1 disabled:opacity-40">Sau ›</button>
              </span>
            </div>
          </>
        )}
      </CollapsibleSection>

      {/* Block 2 — Repair cost overview */}
      <CollapsibleSection title="Chi phí sửa chữa" defaultOpen>
        {statsQuery.isError ? (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-700 flex items-center justify-between">Không tải được thống kê chi phí. <button onClick={()=>statsQuery.refetch()} className="rounded border border-red-300 bg-white px-2 py-1 text-xs">Thử lại</button></div>
        ) : statsQuery.isLoading ? (
          <div className="space-y-2">{[1,2,3].map(i=> <div key={i} className="h-32 rounded bg-gray-100 animate-pulse" />)}</div>
        ) : costByMonth.length===0 ? (
          <p className="text-sm text-gray-400 py-4 text-center">Chưa có dữ liệu chi phí trong kỳ</p>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={260}>
              <ComposedChart data={costByMonth}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{fontSize:11}} />
                <YAxis tickFormatter={(v:number)=> new Intl.NumberFormat('vi-VN',{notation:'compact'}).format(v)} tick={{fontSize:11}} />
                <Tooltip formatter={(v: unknown)=> fmtVND(Number(v ?? 0))} />
                <Legend />
                <Bar dataKey="thucTe" stackId="cost" name="Thực tế" fill="#2563eb" />
                <Bar dataKey="incidental" stackId="cost" name="Phát sinh" fill="#f59e0b" />
                <Line type="monotone" dataKey="duKien" name="Dự kiến" stroke="#16a34a" dot={false} strokeWidth={2} />
              </ComposedChart>
            </ResponsiveContainer>
            <div className="mt-3 divide-y divide-gray-100 border rounded-md">
              {costByMonth.map(row=>{
                const details = costDetailByMonth[row.month] ?? [];
                const isOpen = expandedMonth.has(row.month);
                return (
                  <div key={row.month}>
                    <button onClick={()=> setExpandedMonth(s=>{const n=new Set(s); if(n.has(row.month)) n.delete(row.month); else n.add(row.month); return n;})} className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-gray-50">
                      <span className="font-medium">{row.month} — {details.length} phiếu — {fmtVND(row.thucTe+row.incidental)} / dự kiến {fmtVND(row.duKien)}</span>
                      <span className="text-gray-400">{isOpen?'▴':'▾'}</span>
                    </button>
                    {isOpen && (
                      <div className="px-3 pb-2 overflow-x-auto">
                        {details.length===0 ? <p className="text-xs text-gray-400">Không có phiếu</p> : (
                          <table className="w-full text-xs">
                            <thead><tr className="text-gray-500"><th className="text-left py-1">Mã</th><th className="text-left py-1">Ngày</th><th className="text-right py-1">Dự kiến (₫)</th><th className="text-right py-1">Thực tế (₫)</th><th className="text-right py-1">Chênh lệch (₫)</th></tr></thead>
                            <tbody>
                              {details.map(r=> (
                                <tr key={r.id} className="border-t">
                                  <td className="py-1"><button onClick={()=>setSelectedRepairId(r.id)} className="text-blue-600 hover:underline font-mono">{r.maYeuCau}</button></td>
                                  <td className="py-1">{r.ngayThang}</td>
                                  <td className="py-1 text-right">{fmtMaybeVND(r.duKien)}</td>
                                  <td className="py-1 text-right">{fmtMaybeVND(r.thucTe)}</td>
                                  <td className="py-1 text-right">{r.chenhLech==null?'—':fmtVND(r.chenhLech)}</td>
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
        {/* KPI cards — always render (independent of chart loading) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mt-3">
          <div className="rounded-lg border bg-white p-3">
            <p className="text-xs font-semibold text-gray-500">MTTR (giờ)</p>
            <p className="text-lg font-semibold text-gray-900">{fmtHours((sd.mttrHours as number | null) ?? null)}</p>
            {Array.isArray(sd.mttrByDept) && (sd.mttrByDept as unknown[]).length>0 && (
              <details className="mt-1"><summary className="text-xs text-blue-600 cursor-pointer">Theo phòng ban yêu cầu</summary>
                <ul className="mt-1 text-xs text-gray-600">{(sd.mttrByDept as Array<{deptId:string|null;deptName:string;mttrHours:number|null}>).map(r=><li key={r.deptId ?? 'null'} className="flex justify-between"><span>{r.deptName}</span><span>{r.mttrHours!=null? `${r.mttrHours.toFixed(1)}h`:'—'}</span></li>)}</ul>
              </details>
            )}
          </div>
          <div className="rounded-lg border bg-white p-3">
            <p className="text-xs font-semibold text-gray-500">Tỉ lệ KHÔNG ĐẠT</p>
            <p className="text-lg font-semibold text-gray-900">{(sd.khongDatRate as {rate:number|null}|undefined)?.rate!=null? `${(((sd.khongDatRate as {rate:number}).rate)*100).toFixed(1)}%` : '—'}</p>
            <p className="text-xs text-gray-400">{sd.khongDatRate ? `${(sd.khongDatRate as {khongDat:number}).khongDat}/${(sd.khongDatRate as {totalConfirmations:number}).totalConfirmations} lần nghiệm thu` : ''}</p>
          </div>
          <div className="rounded-lg border bg-white p-3">
            <p className="text-xs font-semibold text-gray-500">Top chi phí cao nhất</p>
            {!sd.topExpensive || (sd.topExpensive as unknown[]).length===0 ? <p className="text-xs text-gray-400 mt-1">Chưa có dữ liệu</p> : (
              <ul className="mt-1 space-y-1 text-xs">
                {(sd.topExpensive as Array<{id:number;maYeuCau:string;total:number}>).map(r=> (
                  <li key={r.id} className="flex justify-between gap-2"><button onClick={()=>setSelectedRepairId(r.id)} className="text-blue-600 hover:underline font-mono truncate">{r.maYeuCau}</button><span className="shrink-0">{fmtVND(r.total)}</span></li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </CollapsibleSection>

      {selectedRepairId!=null && (
        <RepairRequestFormModal isOpen={!!selectedRepairId} onClose={()=>setSelectedRepairId(null)} mode="view" record={modalRecord as never} lockedRequestType="SUA_CHUA" />
      )}
    </div>
  );
}
