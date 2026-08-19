import React, { useState } from 'react';
import { Clock, FileText, FileImage, FileSpreadsheet, FileCode } from 'lucide-react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useAuth } from '../../../contexts/AuthContext';
import { hasSubModuleAccess } from '../../../utils/permissions';
import { useOvertimePlans, overtimePlanKeys } from '../../../hooks/useOvertimePlans';
import { overtimePlanService, OvertimePlanStatus } from '../../../services/overtimePlanService';
import TableFilter, { FilterField } from '../../TableFilter';
import Modal from '../../Modal';
import { getFileUrl } from '../../../config/api';

function getStatusBadge(status: OvertimePlanStatus) {
  const badges: Record<string, { label: string; class: string }> = {
    [OvertimePlanStatus.CHO_DUYET]: { label: 'Chờ duyệt', class: 'bg-yellow-100 text-yellow-700' },
    [OvertimePlanStatus.DA_DUYET]: { label: 'Đã duyệt', class: 'bg-blue-100 text-blue-700' },
    [OvertimePlanStatus.TU_CHOI]: { label: 'Từ chối', class: 'bg-red-100 text-red-700' },
    [OvertimePlanStatus.HOAN_THANH]: { label: 'Hoàn thành', class: 'bg-green-100 text-green-700' },
    [OvertimePlanStatus.HUY]: { label: 'Hủy', class: 'bg-gray-100 text-gray-700' },
  };
  return badges[status as string] || badges[OvertimePlanStatus.CHO_DUYET];
}

function getPriorityBadge(priority: string) {
  const badges: Record<string, { label: string; class: string }> = {
    CAO: { label: 'Cao', class: 'bg-red-100 text-red-700' },
    TRUNG_BINH: { label: 'Trung bình', class: 'bg-yellow-100 text-yellow-700' },
    THAP: { label: 'Thấp', class: 'bg-gray-100 text-gray-700' },
    KHAN_CAP: { label: 'Khẩn cấp', class: 'bg-red-100 text-red-700' },
    // fallbacks for legacy lowercase / spaced values
    Cao: { label: 'Cao', class: 'bg-red-100 text-red-700' },
    'Trung bình': { label: 'Trung bình', class: 'bg-yellow-100 text-yellow-700' },
    'Trung binh': { label: 'Trung bình', class: 'bg-yellow-100 text-yellow-700' },
    Thap: { label: 'Thấp', class: 'bg-gray-100 text-gray-700' },
    Thấp: { label: 'Thấp', class: 'bg-gray-100 text-gray-700' },
  };
  return badges[priority as string] || badges.TRUNG_BINH;
}

function computeHours(start: string, end: string): number {
  const [sh, sm] = (start ?? '').split(':').map(Number);
  const [eh, em] = (end ?? '').split(':').map(Number);
  if ([sh, sm, eh, em].some(n => Number.isNaN(n))) return 0;
  return Math.max(0, (eh * 60 + em) - (sh * 60 + sm)) / 60;
}

type FileIconType = 'image' | 'spreadsheet' | 'code' | 'text';
function getFileType(filename: string): FileIconType {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  if (/^(jpg|jpeg|png|gif|webp)$/.test(ext)) return 'image';
  if (/^(xlsx|xls|csv)$/.test(ext)) return 'spreadsheet';
  if (/^(doc|docx)$/.test(ext)) return 'code';
  return 'text';
}
function friendlyName(filename: string): string {
  const base = filename.split('/').pop() ?? filename;
  return base.replace(/^\d+-/, '');
}
function FileCardIcon({ type }: { type: FileIconType }) {
  switch (type) {
    case 'image': return <FileImage className="w-5 h-5 text-blue-500 flex-shrink-0" />;
    case 'spreadsheet': return <FileSpreadsheet className="w-5 h-5 text-green-600 flex-shrink-0" />;
    case 'code': return <FileCode className="w-5 h-5 text-indigo-500 flex-shrink-0" />;
    default: return <FileText className="w-5 h-5 text-gray-500 flex-shrink-0" />;
  }
}
function FileCard({ file }: { file: string }) {
  const url = getFileUrl(file);
  const type = getFileType(file);
  const name = friendlyName(file);
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-colors text-sm text-blue-600 hover:text-blue-800">
      {type === 'image' && <img src={url} alt={name} className="w-20 h-20 object-cover rounded flex-shrink-0" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />}
      <FileCardIcon type={type} />
      <span className="break-all">{name}</span>
    </a>
  );
}

const OvertimePlanReviewTab: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [filterValues, setFilterValues] = useState<Record<string, string>>({ _search: '', noiDung: '', nguoiTao: '', trangThai: '', mucDoUuTien: '' });
  const [detailId, setDetailId] = useState<string | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const canApprove = !!user && hasSubModuleAccess('general', 'pricing', (user as any).department, (user as any).subDepartment, (user as any).role, (user as any).secondaryDepartments);

  const { data, isLoading } = useOvertimePlans({ page, limit } as any);
  const raw: any = data;
  const allRows: any[] = Array.isArray(raw) ? raw : (raw?.data ?? []);
  const getTrangThai = (r: any): string => String(r.trangThai ?? r.status ?? '').trim();
  const search = (filterValues._search || '').toLowerCase().trim();
  const filtered = allRows.filter((r: any) => {
    if (search && !((r.noiDung ?? '').toLowerCase().includes(search) || (r.ghiChu ?? '').toLowerCase().includes(search) || (r.nguoiTao ? `${r.nguoiTao.lastName ?? ''} ${r.nguoiTao.firstName ?? ''}`.toLowerCase().includes(search) : false))) return false;
    if (filterValues.noiDung && !(r.noiDung ?? '').toLowerCase().includes(filterValues.noiDung.toLowerCase())) return false;
    if (filterValues.nguoiTao) {
      const name = `${r.nguoiTao?.lastName ?? ''} ${r.nguoiTao?.firstName ?? ''}`.trim().toLowerCase();
      if (!name.includes(filterValues.nguoiTao.toLowerCase())) return false;
    }
    if (filterValues.trangThai && getTrangThai(r) !== filterValues.trangThai) return false;
    if (filterValues.mucDoUuTien && String(r.mucDoUuTien ?? '') !== filterValues.mucDoUuTien) return false;
    return true;
  });
  const total = filtered.length;
  const totalPages = Math.ceil(total / limit) || 1;
  const pageRows = filtered.slice((page - 1) * limit, page * limit);

  // Fetch full plan for detail modal (to ensure nguoiThamGia populated when list is partial)
  const detailQuery = useQuery({
    queryKey: overtimePlanKeys.detail(detailId ?? '__none__'),
    queryFn: () => overtimePlanService.getById(detailId!),
    enabled: !!detailId,
  });

  const filterFields: FilterField[] = [
    { key: 'noiDung', label: 'Nội dung', type: 'text' },
    { key: 'nguoiTao', label: 'Người tạo', type: 'text' },
    { key: 'trangThai', label: 'Trạng thái', type: 'select', options: [
      { value: OvertimePlanStatus.CHO_DUYET, label: 'Chờ duyệt' },
      { value: OvertimePlanStatus.DA_DUYET, label: 'Đã duyệt' },
      { value: OvertimePlanStatus.TU_CHOI, label: 'Từ chối' },
      { value: OvertimePlanStatus.HOAN_THANH, label: 'Hoàn thành' },
      { value: OvertimePlanStatus.HUY, label: 'Hủy' },
    ]},
    { key: 'mucDoUuTien', label: 'Ưu tiên', type: 'select', options: [
      { value: 'CAO', label: 'Cao' },
      { value: 'TRUNG_BINH', label: 'Trung bình' },
      { value: 'THAP', label: 'Thấp' },
      { value: 'KHAN_CAP', label: 'Khẩn cấp' },
    ]},
  ];

  const approveMut = useMutation({
    mutationFn: (id: string) => overtimePlanService.approvePlan(id, 'DA_DUYET'),
    onSuccess: () => {
      toast.success('Đã duyệt kế hoạch tăng ca');
      queryClient.invalidateQueries({ queryKey: overtimePlanKeys.lists() });
      queryClient.invalidateQueries({ queryKey: overtimePlanKeys.detail(detailId ?? '__none__') });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? err.message ?? 'Duyệt thất bại'),
  });
  const rejectMut = useMutation({
    mutationFn: ({ id, lyDoTuChoi }: { id: string; lyDoTuChoi?: string }) => overtimePlanService.approvePlan(id, 'TU_CHOI', lyDoTuChoi),
    onSuccess: () => {
      toast.success('Đã từ chối kế hoạch');
      queryClient.invalidateQueries({ queryKey: overtimePlanKeys.lists() });
      queryClient.invalidateQueries({ queryKey: overtimePlanKeys.detail(detailId ?? '__none__') });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? err.message ?? 'Từ chối thất bại'),
  });

  const handleExportFiltered = () => {
    const exportRows = filtered;
    if (exportRows.length === 0) { toast.error('Không có dữ liệu để xuất'); return; }
    try {
      const headers = ['STT', 'Ngay tao', 'Noi dung', 'Uu tien', 'Nguoi tao', 'So dong', 'Trang thai'];
      const csvRows = exportRows.map((r: any, idx: number) => {
        const priorityBadge = getPriorityBadge(String(r.mucDoUuTien ?? 'TRUNG_BINH'));
        const statusBadge = getStatusBadge(String(r.trangThai ?? r.status ?? 'CHO_DUYET') as any);
        const nguoiTao = r.nguoiTao ? `${r.nguoiTao.lastName ?? ''} ${r.nguoiTao.firstName ?? ''}`.trim() : '';
        const ngayTao = r.ngayTao ? new Date(r.ngayTao).toLocaleDateString('vi-VN') : '';
        return [idx + 1, ngayTao, (r.noiDung ?? '').replace(/\n/g, ' '), priorityBadge.label, nguoiTao, r.items?.length ?? 0, statusBadge.label];
      });
      const all = [headers, ...csvRows];
      const csv = all.map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url;
      a.download = `tang-ca-dang-loc-${new Date().toISOString().slice(0,10)}.csv`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
      toast.success(`Đã xuất ${exportRows.length} dòng (đang lọc) ra CSV`);
    } catch (e: any) { toast.error(e?.message ?? 'Xuất file thất bại'); }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h2 className="text-lg font-semibold flex items-center gap-2">Duyệt tăng ca<span className="text-sm font-normal text-gray-500">({total})</span></h2>
        <button type="button" onClick={handleExportFiltered} className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium bg-emerald-600 text-white rounded-md hover:bg-emerald-700 shadow-sm shrink-0" title="Xuất các dòng đang lọc (toàn bộ, không phân trang) ra CSV">Xuất Excel (đang lọc)</button>
      </div>

      <TableFilter
        filters={filterFields}
        values={filterValues}
        onChange={(vals) => { setFilterValues(vals); setPage(1); }}
        searchPlaceholder="Tìm nội dung, người tạo, ghi chú..."
      />

      {isLoading ? (
        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <div className="p-8 text-center text-sm text-gray-500">Đang tải...</div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">STT</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Ngày tạo</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Nội dung</th>
                <th className="px-3 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Ưu tiên</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Người tạo</th>
                <th className="px-3 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Số dòng</th>
                <th className="px-3 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Trạng thái</th>
                <th className="px-3 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pageRows.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-sm text-gray-500">Không có kế hoạch</td></tr>
              ) : pageRows.map((r: any, idx: number) => {
                const st = getTrangThai(r);
                const isPending = st === 'CHO_DUYET';
                const priorityBadge = getPriorityBadge(String(r.mucDoUuTien ?? 'TRUNG_BINH'));
                return (
                <tr
                  key={r.id}
                  onClick={() => setDetailId(r.id)}
                  className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 cursor-pointer transition-colors`}
                >
                  <td className="px-3 py-3 text-sm text-gray-600 whitespace-nowrap">{(page - 1) * limit + idx + 1}</td>
                  <td className="px-3 py-3 text-sm text-gray-600 whitespace-nowrap">{r.ngayTao ? new Date(r.ngayTao).toLocaleDateString('vi-VN') : '—'}</td>
                  <td className="px-3 py-3 text-sm max-w-[320px] truncate" title={r.noiDung}>{r.noiDung || '—'}</td>
                  <td className="px-3 py-3 text-center whitespace-nowrap">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${priorityBadge.class}`}>{priorityBadge.label}</span>
                  </td>
                  <td className="px-3 py-3 text-sm text-gray-600 whitespace-nowrap">{r.nguoiTao ? `${r.nguoiTao.lastName ?? ''} ${r.nguoiTao.firstName ?? ''}`.trim() || '—' : '—'}</td>
                  <td className="px-3 py-3 text-sm text-center"><span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">{r.items?.length ?? 0}</span></td>
                  <td className="px-3 py-3 text-center whitespace-nowrap">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(st as OvertimePlanStatus).class}`}>{getStatusBadge(st as OvertimePlanStatus).label}</span>
                  </td>
                  <td className="px-3 py-3 text-center whitespace-nowrap" onClick={e => e.stopPropagation()}>
                    <div className="inline-flex items-center gap-1">
                      <button onClick={() => setDetailId(r.id)} className="px-2 py-1.5 text-xs border border-gray-300 rounded-md hover:bg-white bg-gray-50" title="Xem chi tiết">Chi tiết</button>
                      {canApprove && isPending ? (
                        <>
                          <button disabled={approveMut.isPending} onClick={() => approveMut.mutate(r.id)} className="px-3 py-1.5 text-xs bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 shadow-sm">Duyệt</button>
                          <button disabled={rejectMut.isPending} onClick={() => setRejectId(r.id)} className="px-3 py-1.5 text-xs bg-white border border-red-300 text-red-600 rounded-md hover:bg-red-50 disabled:opacity-50">Từ chối</button>
                        </>
                      ) : <span className="text-xs text-gray-400 px-2">—</span>}
                    </div>
                  </td>
                </tr>
              );})}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-4 px-2">
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600">Hiển thị {(page - 1) * limit + 1}–{Math.min(page * limit, total)} / {total} mục</span>
            <select value={limit} onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }} className="text-sm border border-gray-300 rounded-md px-2 py-1 bg-white">
              {[10, 20, 50, 100].map(n => <option key={n} value={n}>{n}/trang</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">Trước</button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 2).map((p, idx, arr) => (
              <React.Fragment key={p}>
                {idx > 0 && arr[idx - 1] !== p - 1 && <span className="px-1 text-gray-400">...</span>}
                <button onClick={() => setPage(p)} className={`px-3 py-1.5 text-sm rounded-md ${p === page ? 'bg-blue-600 text-white shadow' : 'border border-gray-300 hover:bg-gray-50 bg-white'}`}>{p}</button>
              </React.Fragment>
            ))}
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">Sau</button>
          </div>
        </div>
      )}

      <Modal isOpen={!!detailId} onClose={() => setDetailId(null)} showBackdrop>
        <div className="bg-white rounded-lg shadow-xl w-full max-w-[900px] flex flex-col modal-viewport-h" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between px-6 py-4 border-b shrink-0 bg-gray-50 rounded-t-lg">
            <h3 className="text-lg font-semibold flex items-center gap-2"><Clock className="w-5 h-5 text-gray-600" /> Chi tiết kế hoạch tăng ca</h3>
            <button onClick={() => setDetailId(null)} className="text-gray-400 hover:text-gray-600 p-1 hover:bg-white rounded-md">✕</button>
          </div>
          <div className="overflow-y-auto flex-1 p-6 space-y-4 text-sm">
            {(() => {
              const fallbackRow = pageRows.find((x: any) => x.id === detailId) ?? allRows.find((x: any) => x.id === detailId);
              const detailed: any = detailQuery.data as any;
              // Prefer fetched detail if available, else fallback to list row
              const row: any = detailed ?? fallbackRow;
              if (!row) return <p className="text-gray-500 py-8 text-center">Không tìm thấy</p>;
              if (detailQuery.isLoading && !fallbackRow) return <p className="text-gray-500 py-8 text-center">Đang tải chi tiết...</p>;
              const st = getTrangThai(row);
              const statusBadge = getStatusBadge(st as OvertimePlanStatus);
              const priorityBadge = getPriorityBadge(String(row.mucDoUuTien ?? 'TRUNG_BINH'));
              const approverName = (() => {
                const nd: any = row.nguoiDuyet ?? row.approver ?? row.approvedBy;
                if (!nd) return null;
                if (typeof nd === 'string') return nd;
                if (typeof nd === 'object') {
                  const name = `${nd.lastName ?? ''} ${nd.firstName ?? ''}`.trim();
                  return name || nd.employeeCode || nd.name || null;
                }
                return null;
              })();
              const ngayDuyet = row.ngayDuyet ?? row.approvedAt ?? row.ngayDuyetStr ?? null;
              const lyDoTuChoi = row.lyDoTuChoi ?? row.reason ?? null;
              return (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Nội dung</p>
                      <p className="font-medium mt-1">{row.noiDung || '—'}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Ngày tạo</p>
                      <p className="font-medium mt-1">{row.ngayTao ? new Date(row.ngayTao).toLocaleDateString('vi-VN') : '—'}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <p className="text-xs text-blue-700 uppercase tracking-wide font-medium">Người tạo</p>
                      <p className="font-medium mt-1 text-blue-900">{row.nguoiTao ? `${row.nguoiTao.lastName ?? ''} ${row.nguoiTao.firstName ?? ''}`.trim() || '—' : '—'}</p>
                      <p className="text-xs text-blue-700 mt-0.5">{row.nguoiTao?.department || '—'}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Mức độ ưu tiên</p>
                      <span className={`inline-flex mt-2 px-2 py-0.5 rounded-full text-xs font-medium ${priorityBadge.class}`}>{priorityBadge.label}</span>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Trạng thái</p>
                      <span className={`inline-flex mt-2 px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge.class}`}>{statusBadge.label}</span>
                    </div>
                  </div>
                  {st === OvertimePlanStatus.DA_DUYET && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Người duyệt</p>
                        <p className="font-medium mt-1">{approverName ? `${approverName}` : '—'}</p>
                        {row.nguoiDuyet?.department && <p className="text-xs text-gray-500 mt-0.5">{row.nguoiDuyet.department}</p>}
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Ngày duyệt</p>
                        <p className="font-medium mt-1">{ngayDuyet ? new Date(ngayDuyet).toLocaleDateString('vi-VN') : '—'}</p>
                      </div>
                    </div>
                  )}
                  {st === OvertimePlanStatus.TU_CHOI && lyDoTuChoi && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <p className="text-xs text-red-700 uppercase tracking-wide font-medium">Lý do từ chối</p>
                      <p className="mt-1 text-red-800 whitespace-pre-wrap">{lyDoTuChoi}</p>
                    </div>
                  )}
                  {row.ghiChu && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                      <p className="text-xs text-yellow-700 uppercase tracking-wide font-medium">Ghi chú</p>
                      <p className="mt-1">{row.ghiChu}</p>
                    </div>
                  )}
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="font-medium mb-2">Các ngày tăng ca ({row.items?.length ?? 0})</p>
                    <div className="bg-white rounded-lg border overflow-hidden">
                      <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead className="bg-gray-100 sticky top-0"><tr className="text-gray-600"><th className="text-left px-3 py-2 font-medium">Ngày</th><th className="text-left px-3 py-2 font-medium">Ca</th><th className="text-left px-3 py-2 font-medium">Nhân sự</th><th className="text-left px-3 py-2 font-medium">Giờ bắt đầu</th><th className="text-left px-3 py-2 font-medium">Giờ kết thúc</th><th className="text-left px-3 py-2 font-medium">Tổng giờ</th></tr></thead>
                        <tbody className="divide-y divide-gray-100">
                          {(row.items ?? []).length === 0 ? (
                            <tr><td colSpan={6} className="text-center py-4 text-gray-400">Không có dòng</td></tr>
                          ) : (row.items ?? []).map((it: any) => {
                            const hours = computeHours(it.gioBatDau, it.gioKetThuc);
                            return (
                              <tr key={it.id} className="hover:bg-gray-50">
                                <td className="px-3 py-2 whitespace-nowrap font-medium">{it.ngayTangCa ? new Date(it.ngayTangCa).toLocaleDateString('vi-VN') : '—'}</td>
                                <td className="px-3 py-2 whitespace-nowrap text-gray-600">{it.workShiftName ?? it.ca ?? '—'}</td>
                                <td className="px-3 py-2">
                                  <div className="space-y-0.5">
                                    {(it.nguoiThamGia?.length > 0 ? it.nguoiThamGia : []).length > 0
                                      ? it.nguoiThamGia.map((p: any, idx: number) => (
                                          <p key={idx} className="text-xs text-gray-700">{p.lastName} {p.firstName}<span className="text-gray-400 ml-1">({p.employeeCode})</span></p>
                                        ))
                                      : <span className="text-xs text-gray-400">{(it.nguoiThamGiaIds ?? it.nguoiThamGia_ids ?? []).length ? `${(it.nguoiThamGiaIds ?? []).length} người` : '—'}</span>
                                    }
                                  </div>
                                </td>
                                <td className="px-3 py-2 whitespace-nowrap text-gray-700">{it.gioBatDau ?? '—'}</td>
                                <td className="px-3 py-2 whitespace-nowrap text-gray-700">{it.gioKetThuc ?? '—'}</td>
                                <td className="px-3 py-2 whitespace-nowrap font-medium">{hours ? `${hours.toFixed(1)}h` : '—'}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                      </div>
                    </div>
                  </div>
                  {row.files && row.files.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase mb-2">File đính kèm</p>
                      <div className="space-y-2">
                        {(row.files as string[]).map((file: string, idx: number) => (
                          <FileCard key={idx} file={file} />
                        ))}
                      </div>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
          <div className="flex justify-end gap-2 px-6 py-4 border-t shrink-0 bg-gray-50 rounded-b-lg">
            <div className="flex gap-2">
              {(() => {
                const row = (detailQuery.data as any) ?? allRows.find((x: any) => x.id === detailId);
                if (!row || !canApprove || getTrangThai(row) !== 'CHO_DUYET') return null;
                return (
                  <>
                    <button onClick={() => { setDetailId(null); setRejectId(row.id); }} className="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 text-sm">Từ chối</button>
                    <button disabled={approveMut.isPending} onClick={() => { approveMut.mutate(row.id); setDetailId(null); }} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm disabled:opacity-50">Duyệt ngay</button>
                  </>
                );
              })()}
              <button onClick={() => setDetailId(null)} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-white bg-white text-sm">Đóng</button>
            </div>
          </div>
        </div>
      </Modal>

      <Modal isOpen={!!rejectId} onClose={() => { setRejectId(null); setRejectReason(''); }} showBackdrop>
        <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 space-y-4" onClick={e => e.stopPropagation()}>
          <h3 className="text-base font-semibold">Từ chối kế hoạch</h3>
          <p className="text-sm text-gray-600">Nhập lý do từ chối:</p>
          <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} rows={3} placeholder="Lý do từ chối..." className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500" />
          <div className="flex justify-end gap-2">
            <button onClick={() => { setRejectId(null); setRejectReason(''); }} className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">Hủy</button>
            <button onClick={() => { if (rejectId) rejectMut.mutate({ id: rejectId, lyDoTuChoi: rejectReason || undefined }); setRejectId(null); setRejectReason(''); }} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700">Xác nhận từ chối</button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default OvertimePlanReviewTab;
