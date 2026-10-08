import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { LineChart, Line, BarChart, Bar, ComposedChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { CollapsibleSection } from './shared';
import { useRepairRequestStats } from '../hooks/useRepairRequests';
import type { CostDetailEntry } from '../services/repairRequestService';

const COLORS = ['#2563eb','#16a34a','#dc2626','#9333ea','#ea580c','#0891b2'];
const fmtVND = (n: number) => new Intl.NumberFormat('vi-VN').format(Math.round(n)) + ' ₫';
const fmtMaybeVND = (n: number | null) => n == null ? '—' : fmtVND(n);
const fmtDelta = (d: number | null | undefined) => d == null ? null : `${d > 0 ? '+' : ''}${d}`;
const fmtHours = (h: number | null) => h == null ? '—' : `${h.toFixed(1)} giờ`;

export default function RepairStatisticsDashboard({ lockedMachineSystemId, onOpenDetail, compact }: { lockedMachineSystemId?: string; onOpenDetail?: (id: number) => void; compact?: boolean }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentYear = new Date().getFullYear();
  const yearParam = searchParams.get('year');
  const year = yearParam ? parseInt(yearParam, 10) || currentYear : currentYear;
  const dateFrom = searchParams.get('dateFrom') || undefined;
  const dateTo = searchParams.get('dateTo') || undefined;
  const phongBanId = searchParams.get('phongBanId') || undefined;

  const setParam = (k: string, v: string | undefined) => {
    const next = new URLSearchParams(searchParams);
    if (!v) next.delete(k); else next.set(k, v);
    setSearchParams(next, { replace: true });
  };

  const statsQuery = useRepairRequestStats({ year: !dateFrom && !dateTo ? year : undefined, dateFrom, dateTo, phongBanId, machineSystemId: lockedMachineSystemId, requestType: 'SUA_CHUA' as never });
  const d: any = statsQuery.data?.data as any;
  const [hiddenDepts, setHiddenDepts] = useState<Set<string>>(new Set());
  const [expandedMonth, setExpandedMonth] = useState<Set<string>>(new Set());

  const deptLines = useMemo(() => {
    const names = new Set<string>();
    for (const row of (d?.departmentTrend ?? [])) for (const dep of row.departments ?? []) names.add(dep.deptName);
    return [...names];
  }, [d]);
  const deptChartData = useMemo(() => {
    return (d?.departmentTrend ?? []).map((row: any) => {
      const o: Record<string, any> = { month: row.month };
      for (const dep of row.departments) o[dep.deptName] = dep.count;
      return o;
    });
  }, [d]);

  if (statsQuery.isError) {
    return <div className="rounded-md border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-700 flex items-center justify-between">Không tải được thống kê. <button onClick={() => statsQuery.refetch()} className="rounded border border-red-300 bg-white px-2 py-1 text-xs">Thử lại</button></div>;
  }
  if (statsQuery.isLoading) {
    return <div className="space-y-3">{[1,2,3].map(i=><div key={i} className="h-40 rounded bg-gray-100 animate-pulse"/> )}</div>;
  }

  const byArea = (d?.byArea ?? []) as Array<{ khuVuc: string; count: number; viTriBreakdown?: Array<{ viTri: string; count: number }>; machines?: Array<{ tenHeThong: string; count: number }>; reason?: string }>;
  const unmappedCount = (d?.unmappedCount ?? null) as number | null;
  const topMachines = (d?.topMachines ?? []) as Array<{ tenHeThong: string | null; khuVuc?: string | null; count: number }>;
  const costByMonth = (d?.costByMonth ?? []) as Array<{ month: string; duKien: number; thucTe: number; incidental: number }>;
  const costDetailByMonth = (d?.costDetailByMonth ?? {}) as Record<string, CostDetailEntry[]>;
  const departments = (d?.departments ?? []) as Array<{ id: string; name: string }>;
  const empty = (arr?: any[]) => !arr || arr.length === 0;

  const total = d?.total ?? 0;
  const hoanThanh = d?.byStatus?.HOAN_THANH ?? 0;
  const completionRate = total > 0 ? (hoanThanh / total) * 100 : null;
  const avgCost = (() => {
    if (!costByMonth.length) return null;
    const sum = costByMonth.reduce((s: number, r: any) => s + (r.thucTe ?? 0) + (r.incidental ?? 0), 0);
    const cnt = total || 1;
    return sum > 0 ? sum / cnt : null;
  })();
  const deltaTotal = d?.delta?.total as number | undefined;
  const deltaHoanThanh = d?.delta?.byStatus?.HOAN_THANH as number | undefined;
  // khuVuc insights for banner
  const byAreaInsights = (() => {
    if (!byArea.length) return null;
    const totalItems = byArea.reduce((s, r) => s + r.count, 0);
    const top = byArea[0];
    const xuong = byArea.find(r => r.khuVuc.toLowerCase().includes('xưởng sản xuất') || r.khuVuc.toLowerCase().includes('xuong san xuat'));
    const unmapped = byArea.find(r => r.khuVuc === 'Chưa xác định');
    const unmappedRate = totalItems > 0 && unmapped ? (unmapped.count / totalItems) * 100 : null;
    return { totalItems, top, xuong, unmapped, unmappedRate };
  })();

  const onDetail = onOpenDetail ?? (() => {});

  return (
    <div className={compact ? 'space-y-3' : 'space-y-4'}>
      <div className={`flex flex-wrap items-center gap-2 ${compact ? 'text-xs' : 'text-sm'}`}>
        <label className="flex items-center gap-1">Năm
          <select value={String(year)} onChange={e=>setParam('year', e.target.value)} className={`rounded border border-gray-300 ${compact ? 'px-1.5 py-0.5 text-xs' : 'px-2 py-1'}`}>
            {Array.from({length:6},(_,i)=> currentYear - 2 + i).map(y=> <option key={y} value={y}>{y}</option>)}
          </select>
        </label>
        <label className="flex items-center gap-1">Từ <input type="date" value={dateFrom ?? ''} onChange={e=>setParam('dateFrom', e.target.value || undefined)} className={`rounded border border-gray-300 ${compact ? 'px-1.5 py-0.5 text-xs' : 'px-2 py-1'}`} /></label>
        <label className="flex items-center gap-1">Đến <input type="date" value={dateTo ?? ''} onChange={e=>setParam('dateTo', e.target.value || undefined)} className={`rounded border border-gray-300 ${compact ? 'px-1.5 py-0.5 text-xs' : 'px-2 py-1'}`} /></label>
        <label className="flex items-center gap-1">Phòng ban
          <select value={phongBanId ?? ''} onChange={e=>setParam('phongBanId', e.target.value || undefined)} className={`rounded border border-gray-300 ${compact ? 'px-1.5 py-0.5 text-xs' : 'px-2 py-1'}`}>
            <option value="">Tất cả</option>
            {departments.map(dep=> <option key={dep.id} value={dep.id}>{dep.name}</option>)}
          </select>
        </label>
        {(dateFrom || dateTo || phongBanId) && <button onClick={()=>{const n=new URLSearchParams(searchParams); n.delete('dateFrom'); n.delete('dateTo'); n.delete('phongBanId'); setSearchParams(n,{replace:true});}} className="text-xs text-blue-600 hover:underline">Xóa lọc</button>}
      </div>

      {/* KPI header */}
      <div className={`grid grid-cols-1 sm:grid-cols-3 ${compact ? 'gap-2' : 'gap-3'}`}>
        <div className={`rounded-lg border bg-white ${compact ? 'p-2.5' : 'p-3'}`}>
          <p className="text-xs font-semibold text-gray-500">Tổng YCSC trong kỳ</p>
          <div className="flex items-baseline gap-2">
            <p className={`${compact ? 'text-xl' : 'text-2xl'} font-bold text-gray-900`}>{total}</p>
            {deltaTotal != null && deltaTotal !== 0 && (
              <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${deltaTotal > 0 ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>{fmtDelta(deltaTotal)} vs kỳ trước</span>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-1">{total === 0 ? 'Chưa có phiếu nào trong khoảng thời gian này' : `${hoanThanh} hoàn thành`}</p>
        </div>
        <div className={`rounded-lg border bg-white ${compact ? 'p-2.5' : 'p-3'}`}>
          <p className="text-xs font-semibold text-gray-500">Tỉ lệ hoàn thành</p>
          <div className="flex items-baseline gap-2">
            <p className={`${compact ? 'text-xl' : 'text-2xl'} font-bold text-gray-900`}>{completionRate != null ? `${completionRate.toFixed(1)}%` : '—'}</p>
            {deltaHoanThanh != null && deltaHoanThanh !== 0 && (
              <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${deltaHoanThanh > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>{fmtDelta(deltaHoanThanh)} phiếu</span>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-1">Hoàn thành / tổng</p>
        </div>
        <div className={`rounded-lg border bg-white ${compact ? 'p-2.5' : 'p-3'}`}>
          <p className="text-xs font-semibold text-gray-500">Chi phí trung bình / phiếu</p>
          <p className={`${compact ? 'text-xl' : 'text-2xl'} font-bold text-gray-900`}>{avgCost != null ? fmtVND(avgCost) : '—'}</p>
          <p className="text-xs text-gray-400 mt-1">Thực tế + phát sinh</p>
        </div>
      </div>

      <CollapsibleSection title="Xu hướng theo phòng ban (bên yêu cầu)" defaultOpen>
        {empty(d?.departmentTrend) || deptLines.length === 0 ? <p className="text-sm text-gray-400">Chưa có dữ liệu — khi có YCSC, biểu đồ hiển thị số phiếu theo phòng ban yêu cầu theo tháng</p> : (
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={deptChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{fontSize:11}} label={{ value: 'Tháng', position: 'insideBottom', offset: -2, fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{fontSize:11}} label={{ value: 'Số phiếu', angle: -90, position: 'insideLeft', fontSize: 11 }} />
              <Tooltip />
              <Legend onClick={e=>{ const k=String(e.dataKey); setHiddenDepts(s=>{const n=new Set(s); if(n.has(k)) n.delete(k); else n.add(k); return n;});}} />
              {deptLines.map((name,i)=> (
                <Line key={name} type="monotone" dataKey={name} stroke={COLORS[i%COLORS.length]} hide={hiddenDepts.has(name)} dot={false} strokeWidth={2} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </CollapsibleSection>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <CollapsibleSection title="Theo khu vực" defaultOpen>
          {empty(byArea) ? <p className="text-sm text-gray-400">Chưa có dữ liệu khu vực</p> : (
            <>
              {byAreaInsights && (
                <div className="mb-3 rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-xs leading-5 text-slate-700">
                  <span className="font-semibold">Nhận định:</span>{' '}
                  {byAreaInsights.top && <><span className="font-medium">{byAreaInsights.top.khuVuc}</span> cao nhất ({byAreaInsights.top.count}/{byAreaInsights.totalItems} hạng mục)</>}
                  {byAreaInsights.xuong && byAreaInsights.xuong.khuVuc !== byAreaInsights.top?.khuVuc && <> · Xưởng sản xuất {byAreaInsights.xuong.count} hạng mục</>}
                  {byAreaInsights.unmappedRate != null && byAreaInsights.unmappedRate > 0 && <> · <span className={byAreaInsights.unmappedRate >= 20 ? 'font-semibold text-amber-700' : ''}>{byAreaInsights.unmapped!.count} chưa xác định ({byAreaInsights.unmappedRate.toFixed(0)}%)</span></>}
                  {byAreaInsights.unmappedRate != null && byAreaInsights.unmappedRate >= 20 && <> — liên kết máy khi tạo YCSC để giảm nhóm này</>}
                </div>
              )}
              {unmappedCount != null && unmappedCount > 0 && !byArea.some(r=>r.khuVuc==='Chưa xác định') && (
                <p className="mb-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">{unmappedCount} hạng mục chưa liên kết máy (unmappedCount) — tạo YCSC nhớ chọn hệ thống máy.</p>
              )}
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={byArea}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="khuVuc" tick={{fontSize:11}} interval={0} angle={-15} textAnchor="end" height={50} label={{ value: 'Khu vực', position: 'insideBottom', offset: -2, fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{fontSize:11}} label={{ value: 'Số lượt', angle: -90, position: 'insideLeft', fontSize: 11 }} />
                  <Tooltip content={({active,payload}:any)=> active && payload?.[0] ? (
                    <div className="rounded border bg-white px-2 py-1.5 text-xs shadow">
                      <p className="font-medium">{payload[0].payload.khuVuc}</p>
                      <p>{payload[0].value} hạng mục</p>
                      {payload[0].payload.khuVuc==='Chưa xác định' && <p className="mt-1 max-w-[220px] text-gray-500">{payload[0].payload.reason ?? 'Thiếu liên kết MachineSystem hoặc khuVuc trống — chọn máy khi tạo YCSC.'}</p>}
                      {payload[0].payload.viTriBreakdown?.length > 0 && <p className="mt-1 text-gray-500">Top vị trí: {payload[0].payload.viTriBreakdown.slice(0,3).map((v:any)=> `${v.viTri} (${v.count})`).join(', ')}</p>}
                    </div>
                  ): null} />
                  <Bar dataKey="count" name="Số lượt">
                    {byArea.map((e,i)=> <Cell key={i} fill={e.khuVuc==='Chưa xác định' ? '#9ca3af' : '#2563eb'} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </>
          )}
        </CollapsibleSection>
        <CollapsibleSection title="Top 10 máy hay hỏng" defaultOpen>
          {empty(topMachines) ? <p className="text-sm text-gray-400">Chưa có dữ liệu máy</p> : (
            <ResponsiveContainer width="100%" height={Math.max(260, topMachines.length * 42)}>
              <BarChart data={topMachines} layout="vertical" margin={{ left: 12, right: 24, top: 4, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" allowDecimals={false} tick={{fontSize:11}} label={{ value: 'Số phiếu', position: 'insideBottom', offset: -4, fontSize: 11 }} />
                <YAxis
                  type="category"
                  dataKey="tenHeThong"
                  width={190}
                  tick={({ x, y, payload }: any) => {
                    const raw: string = String(payload.value ?? '—');
                    const khuVuc: string | null = topMachines.find(m => m.tenHeThong === raw)?.khuVuc ?? null;
                    const shortName = raw.length > 26 ? raw.slice(0, 26) + '…' : raw;
                    const shortKhu = khuVuc && khuVuc.length > 22 ? khuVuc.slice(0, 22) + '…' : khuVuc;
                    return (
                      <g transform={`translate(${x},${y})`}>
                        <text x={-8} y={-2} textAnchor="end" fontSize={11} fill="#1f2937" title={raw}>{shortName}</text>
                        {shortKhu && <text x={-8} y={10} textAnchor="end" fontSize={10} fill="#9ca3af" title={khuVuc ?? undefined}>{shortKhu}</text>}
                      </g>
                    );
                  }}
                  interval={0}
                />
                <Tooltip content={({ active, payload }: any) => active && payload?.[0] ? (
                  <div className="rounded border bg-white px-2.5 py-2 text-xs shadow">
                    <p className="font-medium text-gray-800">{payload[0].payload.tenHeThong}</p>
                    {payload[0].payload.khuVuc && <p className="text-gray-400">{payload[0].payload.khuVuc}</p>}
                    <p className="mt-1 font-semibold text-emerald-700">{payload[0].value} lần</p>
                  </div>
                ) : null} />
                <Bar dataKey="count" name="Số phiếu" fill="#16a34a" radius={[0,4,4,0]} barSize={18}>
                  {topMachines.map((_, i) => <Cell key={i} fill={i < 3 ? '#16a34a' : '#86efac'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </CollapsibleSection>
      </div>

      <CollapsibleSection title="Chi phí theo tháng" defaultOpen>
        {empty(costByMonth) ? <p className="text-sm text-gray-400">Chưa có dữ liệu chi phí</p> : (
          <ResponsiveContainer width="100%" height={260}>
            <ComposedChart data={costByMonth}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{fontSize:11}} label={{ value: 'Tháng', position: 'insideBottom', offset: -2, fontSize: 11 }} />
              <YAxis tickFormatter={(v:number)=> new Intl.NumberFormat('vi-VN',{notation:'compact'}).format(v)} tick={{fontSize:11}} label={{ value: 'VND', angle: -90, position: 'insideLeft', fontSize: 11 }} />
              <Tooltip formatter={(v:any)=> fmtVND(Number(v ?? 0))} />
              <Legend />
              <Bar dataKey="thucTe" stackId="cost" name="Thực tế" fill="#2563eb" />
              <Bar dataKey="incidental" stackId="cost" name="Phát sinh" fill="#f59e0b" />
              <Line type="monotone" dataKey="duKien" name="Dự kiến" stroke="#16a34a" dot={false} strokeWidth={2} />
            </ComposedChart>
          </ResponsiveContainer>
        )}
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
                              <td className="py-1"><button onClick={()=>onDetail(r.id)} className="text-blue-600 hover:underline font-mono">{r.maYeuCau}</button></td>
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
      </CollapsibleSection>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="rounded-lg border bg-white p-3">
          <p className="text-xs font-semibold text-gray-500">MTTR (giờ)</p>
          <p className="text-lg font-semibold text-gray-900">{fmtHours(d?.mttrHours ?? null)}</p>
          {Array.isArray(d?.mttrByDept) && d.mttrByDept.length>0 && (
            <details className="mt-1"><summary className="text-xs text-blue-600 cursor-pointer">Theo phòng ban yêu cầu</summary>
              <ul className="mt-1 text-xs text-gray-600">{d.mttrByDept.map((r:any)=><li key={r.deptId ?? 'null'} className="flex justify-between"><span>{r.deptName}</span><span>{r.mttrHours!=null? `${r.mttrHours.toFixed(1)}h`:'—'}</span></li>)}</ul>
            </details>
          )}
        </div>
        <div className="rounded-lg border bg-white p-3">
          <p className="text-xs font-semibold text-gray-500">Tỉ lệ KHÔNG ĐẠT</p>
          <p className="text-lg font-semibold text-gray-900">{d?.khongDatRate?.rate!=null? `${(d.khongDatRate.rate*100).toFixed(1)}%` : '—'}</p>
          <p className="text-xs text-gray-400">{d?.khongDatRate ? `${d.khongDatRate.khongDat}/${d.khongDatRate.totalConfirmations} lần nghiệm thu` : ''}</p>
        </div>
        <div className="rounded-lg border bg-white p-3">
          <p className="text-xs font-semibold text-gray-500">Top chi phí cao nhất</p>
          {empty(d?.topExpensive) ? <p className="text-xs text-gray-400 mt-1">Chưa có dữ liệu</p> : (
            <ul className="mt-1 space-y-1 text-xs">
              {(d.topExpensive as any[]).map((r:any)=> (
                <li key={r.id} className="flex justify-between gap-2"><button onClick={()=>onDetail(r.id)} className="text-blue-600 hover:underline font-mono truncate">{r.maYeuCau}</button><span className="shrink-0">{fmtVND(r.total)}</span></li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
