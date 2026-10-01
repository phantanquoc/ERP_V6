import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Ban, CheckCircle, Edit, History, Plus, Search, Trash2, X } from 'lucide-react';
import Modal from './Modal';
import RepairRequestFormModal from './RepairRequestFormModal';
import { useAuth } from '../contexts/AuthContext';
import { can, isCachedPermissionsLoaded } from '../utils/permissions';
import { UserRole } from '../types/auth';
import { useQueryClient } from '@tanstack/react-query';
import { useInspectionRequests, useInspectionStatusHistory, useDeleteInspectionRequest, useAcceptInspection, useCompleteInspection, useCancelInspection, useRejectInspection, inspectionKeys } from '../hooks/useInspectionRequests';
import { useDepartments } from '../hooks/useDepartments';
import inspectionRequestService, { InspectionRequest, INSPECTION_STATUS_LABELS } from '../services/inspectionRequestService';
import type { InspectionRequestStatus } from '../services/inspectionRequestService';

const statusBadgeClass = (tone: string) => {
  if (tone === 'green') return 'bg-green-100 text-green-700 border-green-200';
  if (tone === 'blue') return 'bg-blue-100 text-blue-700 border-blue-200';
  if (tone === 'red') return 'bg-red-100 text-red-700 border-red-200';
  if (tone === 'yellow') return 'bg-yellow-100 text-yellow-700 border-yellow-200';
  return 'bg-gray-100 text-gray-700 border-gray-200';
};
const formatDate = (v?: string | null) => v ? new Date(v).toLocaleDateString('vi-VN') : '—';

export default function InspectionRequestList(_props: { lockedMachineSystemId?: string } = {}) {
  const { user } = useAuth();
  const isAdmin = isCachedPermissionsLoaded() ? can('repair-requests','DELETE', user?.role as string) : user?.role === UserRole.ADMIN;
  const canUpdate = isCachedPermissionsLoaded() ? can('repair-requests','UPDATE', user?.role as string) : [UserRole.ADMIN, UserRole.DEPARTMENT_HEAD, UserRole.TEAM_LEAD].includes(user?.role as UserRole);
  const queryClient = useQueryClient();
  const { data: departments = [] } = useDepartments();
  const deptName = (id: string | null | undefined) => {
    if (!id) return '—';
    const d = (departments as { id: string; name: string }[]).find(x => x.id === id);
    return d?.name ?? id;
  };
  const [searchParams, setSearchParams] = useSearchParams();
  const detailSyncRef = useRef(false);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout>|null>(null);
  const VALID = new Set(Object.keys(INSPECTION_STATUS_LABELS));
  const parsePage = (v:string|null,f:number)=>{ const n=v?parseInt(v,10):NaN; return Number.isFinite(n)&&n>=1?n:f; };
  const [filters, setFilters] = useState(()=>{ const sp=new URLSearchParams(window.location.search); return { page: parsePage(sp.get('page'),1), limit: 10, search: sp.get('q')??sp.get('search')??'', trangThai: VALID.has(sp.get('status')??sp.get('trangThai')??'') ? (sp.get('status')??sp.get('trangThai')??'') : '' }; });
  const [searchInput, setSearchInput] = useState(filters.search);
  const listQ = useInspectionRequests({ page: filters.page, limit: filters.limit, search: filters.search||undefined, trangThai: (filters.trangThai as InspectionRequestStatus)||undefined });
  const requests = listQ.data?.data ?? [];
  const pagination = listQ.data?.pagination;
  const [modal, setModal] = useState<{mode:'create'|'edit'|'view'; record?: InspectionRequest}|null>(null);
  const [historyId, setHistoryId] = useState<number|null>(null);
  const historyQ = useInspectionStatusHistory(historyId);
  const [cancelTarget, setCancelTarget] = useState<InspectionRequest|null>(null);
  const [cancelReason, setCancelReason]=useState('');
  const delMut = useDeleteInspectionRequest(); const acceptMut=useAcceptInspection(); const completeMut=useCompleteInspection(); const cancelMut=useCancelInspection(); void useRejectInspection;

  const openModal=(mode:'create'|'edit'|'view', record?:InspectionRequest)=>{ setModal({mode,record}); if(mode==='view'&&record?.id!=null){ const next=new URLSearchParams(searchParams); next.set('inspectionId',String(record.id)); detailSyncRef.current=true; setSearchParams(next);} if(mode==='create'){ const next=new URLSearchParams(searchParams); next.set('create','inspection'); detailSyncRef.current=true; setSearchParams(next);} };
  const closeModal=()=>{ const wasView=modal?.mode==='view'; const wasCreate=modal?.mode==='create'; setModal(null); if(wasView&&(searchParams.has('inspectionId')||searchParams.has('inspectionRequestId'))){ const n=new URLSearchParams(searchParams); n.delete('inspectionId'); n.delete('inspectionRequestId'); detailSyncRef.current=true; setSearchParams(n,{replace:true}); } if(wasCreate&&searchParams.get('create')==='inspection'){ const n=new URLSearchParams(searchParams); n.delete('create'); detailSyncRef.current=true; setSearchParams(n,{replace:true}); } };

  useEffect(()=>{ if(searchDebounceRef.current) clearTimeout(searchDebounceRef.current); searchDebounceRef.current=setTimeout(()=>{ const t=searchInput.trim(); setFilters(f=> (f.search??'')===t?f:{...f,search:t,page:1}); },300); return()=>{ if(searchDebounceRef.current) clearTimeout(searchDebounceRef.current); }; },[searchInput]);

  const inspectionIdParam=searchParams.get('inspectionId') ?? searchParams.get('inspectionRequestId');
  useEffect(()=>{ if(detailSyncRef.current){ detailSyncRef.current=false; return; } const cid=searchParams.get('create'); if(cid==='inspection'){ if(!modal||modal.mode!=='create') setModal({mode:'create'});} else if(modal?.mode==='create') setModal(null); if(!inspectionIdParam){ if(modal?.mode==='view') setModal(null); return; } if(modal?.mode==='view'&&String(modal.record?.id)===String(inspectionIdParam)) return; let cancelled=false; inspectionRequestService.getById(inspectionIdParam).then(res=>{ if(cancelled) return; const rec=res?.data; if(rec?.id!=null) setModal({mode:'view',record: rec}); }).catch(()=>{}); return()=>{ cancelled=true; }; },[inspectionIdParam, searchParams]);

  const remove=async(r:InspectionRequest)=>{ if(!confirm(`Xóa phiếu ${r.maYeuCau}?`)) return; try{ await delMut.mutateAsync(r.id); toast.success('Đã xóa'); }catch(e){ toast.error(e instanceof Error?e.message:'Không xóa được'); } };
  const handleCancel=async()=>{ if(!cancelTarget) return; try{ await cancelMut.mutateAsync({id:cancelTarget.id, reason: cancelReason||undefined}); toast.success('Đã hủy'); setCancelTarget(null); setCancelReason(''); }catch(e){ toast.error(e instanceof Error?e.message:'Không hủy được'); } };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div><h2 className="text-base font-semibold text-gray-900">Phiếu kiểm tra</h2><p className="text-xs text-gray-500">Yêu cầu kiểm tra (KIEM_TRA) — tách khỏi YC sửa chữa.</p></div>
        <div className="flex gap-2">
          <button type="button" onClick={()=>inspectionRequestService.exportExcel({search: filters.search||undefined}).catch(e=>toast.error(e instanceof Error?e.message:'Lỗi xuất Excel'))} className="rounded-md border px-3 py-2 text-sm">Xuất Excel</button>
          <button type="button" onClick={()=>openModal('create')} className="inline-flex items-center gap-1.5 rounded-md bg-cyan-600 px-3 py-2 text-sm font-medium text-white hover:bg-cyan-700"><Plus className="h-4 w-4"/> Thêm kiểm tra</button>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 border-b border-gray-200 p-3">
        <div className="relative"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400"/><input value={searchInput} onChange={e=>setSearchInput(e.target.value)} placeholder="Tìm phiếu kiểm tra" className="w-48 rounded-md border py-2 pl-8 pr-3 text-sm"/></div>
        <select value={filters.trangThai} onChange={e=>setFilters(v=>({...v,trangThai:e.target.value,page:1}))} className="rounded-md border px-3 py-2 text-sm">
          <option value="">Tất cả trạng thái</option>{Object.keys(INSPECTION_STATUS_LABELS).map(k=> <option key={k} value={k}>{INSPECTION_STATUS_LABELS[k as InspectionRequestStatus].label}</option>)}
        </select>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500"><tr>
            <th className="border-b px-3 py-2.5 text-left sticky left-0 bg-gray-50 z-10 min-w-[100px]">Mã</th><th className="border-b px-3 py-2.5 text-left min-w-[95px]">Ngày</th><th className="border-b px-3 py-2.5 text-left min-w-[120px]">Người phát hiện</th><th className="border-b px-3 py-2.5 text-left min-w-[140px]">Bộ phận</th><th className="border-b px-3 py-2.5 text-left min-w-[160px]">Thiết bị</th><th className="border-b px-3 py-2.5 text-left min-w-[110px]">Khu vực</th><th className="border-b px-3 py-2.5 text-left min-w-[110px]">Trạng thái</th><th className="border-b px-3 py-2.5 text-left min-w-[130px]">Kết luận</th><th className="border-b px-3 py-2.5 text-right sticky right-0 bg-gray-50 z-10 min-w-[160px]">Thao tác</th>
          </tr></thead>
          <tbody className="divide-y divide-gray-100">
            {listQ.isLoading ? <tr><td colSpan={9} className="px-3 py-8 text-center text-gray-400">Đang tải...</td></tr> : requests.length===0 ? <tr><td colSpan={9} className="px-3 py-8 text-center text-gray-400">Chưa có phiếu kiểm tra.</td></tr> : requests.map(r=>{
              const items=r.items?.length?r.items:[{id:`${r.id}-legacy`, inspectionRequestId:r.id, tenHeThong:(r as unknown as {tenHeThong?:string}).tenHeThong??'', tinhTrangThietBi:(r as unknown as {tinhTrangThietBi?:string}).tinhTrangThietBi??'', loaiLoi:(r as unknown as {loaiLoi?:string}).loaiLoi??'', noiDungLoi:(r as unknown as {noiDungLoi?:string}).noiDungLoi??''} as unknown as NonNullable<InspectionRequest['items']>[number]];
              const s=r.trangThai as InspectionRequestStatus; const isTerminal=s==='HOAN_THANH'||s==='DA_HUY';
              const ketLuan = (r as unknown as { ketLuan?: string|null }).ketLuan ?? null;
              const ketLuanTone = ketLuan==='CAN_SUA_CHUA'?'yellow':ketLuan==='KHONG_CAN'?'green':ketLuan==='THEO_DOI'?'blue':'gray';
              const ketLuanLabel = ketLuan==='CAN_SUA_CHUA'?'Cần sửa chữa':ketLuan==='KHONG_CAN'?'Không cần':ketLuan==='THEO_DOI'?'Theo dõi':'—';
              const boPhanLabel = deptName((r as unknown as { phongBanId?: string|null }).phongBanId ?? null);
              const khuVuc = (r as unknown as { khuVuc?: string }).khuVuc ?? '—';
              return (
              <tr key={r.id} onClick={()=>openModal('view',r)} className="hover:bg-cyan-50 cursor-pointer">
                <td className="px-3 py-2.5 font-mono text-xs text-cyan-700 sticky left-0 bg-white z-10">{r.maYeuCau}</td>
                <td className="px-3 py-2.5 text-xs text-gray-600">{formatDate(r.ngayThang)}</td>
                <td className="px-3 py-2.5 text-xs">{r.createdByName||'—'}</td>
                <td className="px-3 py-2.5 text-xs text-gray-600">{boPhanLabel}</td>
                <td className="px-3 py-2.5 text-xs">{items.map((it:any)=><div key={it.id}>{it.tenHeThong||'—'}</div>)}</td>
                <td className="px-3 py-2.5 text-xs text-gray-600">{khuVuc}</td>
                <td className="px-3 py-2.5"><span className={`inline-flex rounded-full border px-2 py-0.5 text-xs whitespace-nowrap ${statusBadgeClass(INSPECTION_STATUS_LABELS[s]?.tone??'gray')}`}>{INSPECTION_STATUS_LABELS[s]?.label??s}</span></td>
                <td className="px-3 py-2.5"><span className={`inline-flex rounded-full border px-2 py-0.5 text-xs whitespace-nowrap ${statusBadgeClass(ketLuanTone)}`}>{ketLuanLabel}</span></td>
                <td className="px-3 py-2.5 text-right sticky right-0 bg-white z-10">
                  <div className="flex items-center justify-end gap-1 flex-wrap" onClick={e=>e.stopPropagation()}>
                    {(() => {
                      const iconBtn = (cls: string) => `inline-flex items-center justify-center h-7 w-7 rounded-md border transition-colors ${cls}`;
                      const acts: { title: string; icon: JSX.Element; onClick: (e: React.MouseEvent)=>void; wrap: (btn: JSX.Element)=>JSX.Element; cls: string; disabled?: boolean }[] = [];
                      if (s==='CHO_XU_LY'&&canUpdate) acts.push({ title:'Tiếp nhận', icon:<CheckCircle className="h-3.5 w-3.5"/>, onClick:e=>{ e.stopPropagation(); acceptMut.mutate(r.id,{onSuccess:()=>toast.success('Đã tiếp nhận'),onError:(e)=>toast.error(e instanceof Error?e.message:'Lỗi')}); }, wrap:b=>b, cls:'bg-blue-600 border-blue-600 text-white hover:bg-blue-700' });
                      if (s==='DA_TIEP_NHAN'&&canUpdate) acts.push({ title:'Hoàn thành', icon:<CheckCircle className="h-3.5 w-3.5"/>, onClick:e=>{ e.stopPropagation(); completeMut.mutate(r.id,{onSuccess:()=>toast.success('Đã hoàn thành'),onError:(e)=>toast.error(e instanceof Error?e.message:'Lỗi')}); }, wrap:b=>b, cls:'bg-green-600 border-green-600 text-white hover:bg-green-700' });
                      const baseActs: { title: string; icon: JSX.Element; onClick:(e:React.MouseEvent)=>void; cls:string }[] = [];
                      if (!isTerminal) baseActs.push({ title:'Sửa', icon:<Edit className="h-3.5 w-3.5"/>, onClick:e=>{ e.stopPropagation(); openModal('edit',r); }, cls:'bg-white border-blue-200 text-blue-600 hover:bg-blue-50' });
                      baseActs.push({ title:'Lịch sử', icon:<History className="h-3.5 w-3.5"/>, onClick:e=>{ e.stopPropagation(); setHistoryId(r.id); }, cls:'bg-white border-gray-200 text-gray-500 hover:bg-gray-50' });
                      if (!isTerminal) baseActs.push({ title:'Hủy phiếu', icon:<Ban className="h-3.5 w-3.5"/>, onClick:e=>{ e.stopPropagation(); setCancelTarget(r); setCancelReason(''); }, cls:'bg-amber-50 border-amber-200 text-amber-600 hover:bg-amber-100' });
                      if (isAdmin) baseActs.push({ title:'Xóa', icon:<Trash2 className="h-3.5 w-3.5"/>, onClick:e=>{ e.stopPropagation(); remove(r); }, cls:'bg-red-50 border-red-200 text-red-600 hover:bg-red-100' });
                      const allActs = [...acts.map(a=>({title:a.title,icon:a.icon,onClick:a.onClick,cls:a.cls})), ...baseActs];
                      return allActs.map((a,i)=>(
                        <button key={i} type="button" title={a.title} aria-label={a.title} onClick={a.onClick} className={iconBtn(a.cls)}><span className="sr-only">{a.title}</span>{a.icon}</button>
                      ));
                    })()}
                  </div>
                </td>
              </tr>); })}
          </tbody>
        </table>
      </div>
      {pagination&&pagination.totalPages>1&&<div className="flex items-center justify-between border-t px-3 py-2 text-sm"><span className="text-gray-600">Trang {pagination.page}/{pagination.totalPages} - {pagination.total} dòng</span><div className="flex gap-1"><button disabled={filters.page<=1} onClick={()=>setFilters(v=>({...v,page:v.page-1}))} className="rounded border px-3 py-1 disabled:opacity-40">Trước</button><button disabled={filters.page>=pagination.totalPages} onClick={()=>setFilters(v=>({...v,page:v.page+1}))} className="rounded border px-3 py-1 disabled:opacity-40">Sau</button></div></div>}
      <RepairRequestFormModal isOpen={!!modal} onClose={closeModal} mode={modal?.mode??'create'} record={modal?.record as unknown as import('../services/repairRequestService').RepairRequest} lockedRequestType="KIEM_TRA" hideCodeField={false} onSaved={() => { setFilters(v => ({ ...v, trangThai: '', page: 1 })); setSearchInput(''); queryClient.invalidateQueries({ queryKey: inspectionKeys.all }); closeModal(); }} onEdit={()=>{ if(modal?.record) setModal({mode:'edit',record: modal.record}); }} />
      {historyId&&<Modal isOpen={!!historyId} onClose={()=>setHistoryId(null)} showBackdrop><div className="w-full max-w-lg rounded-lg bg-white shadow-xl" onClick={e=>e.stopPropagation()}><div className="flex items-center justify-between border-b px-4 py-3"><h3 className="font-semibold">Lịch sử</h3><button onClick={()=>setHistoryId(null)}><X className="h-4 w-4"/></button></div><div className="max-h-[60vh] overflow-y-auto p-4 text-sm">{historyQ.isLoading?<p className="text-gray-400">Đang tải...</p>: (historyQ.data?.data?.length??0)===0?<p className="text-gray-400">Chưa có.</p> : <ol className="space-y-2">{historyQ.data!.data!.map((l:any)=><li key={l.id} className="flex gap-2 text-xs"><span className="mt-1 h-2 w-2 rounded-full bg-gray-400 shrink-0"/><div><p>{l.oldStatus} → {l.newStatus}</p><p className="text-gray-400">{new Date(l.createdAt).toLocaleString('vi-VN')}</p></div></li>)}</ol>}</div></div></Modal>}
      {cancelTarget&&<Modal isOpen onClose={()=>setCancelTarget(null)} showBackdrop><div className="w-full max-w-md rounded-lg bg-white p-4" onClick={e=>e.stopPropagation()}><h3 className="font-semibold mb-2">Hủy {cancelTarget.maYeuCau}</h3><textarea rows={3} value={cancelReason} onChange={e=>setCancelReason(e.target.value)} placeholder="Lý do..." className="w-full rounded border px-3 py-2 text-sm"/><div className="mt-3 flex justify-end gap-2"><button onClick={()=>setCancelTarget(null)} className="rounded border px-3 py-1 text-sm">Không</button><button onClick={handleCancel} className="rounded bg-red-600 px-3 py-1 text-sm text-white">Xác nhận hủy</button></div></div></Modal>}
    </div>
  );
}
