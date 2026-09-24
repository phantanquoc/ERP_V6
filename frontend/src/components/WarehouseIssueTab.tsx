import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Plus, FileText, Eye, Pencil, Trash2, Printer, Ban, RotateCcw } from 'lucide-react';
import TableFilter, { FilterField } from './TableFilter';
import PaginationBar from './common/PaginationBar';
import Modal from './Modal';
import CancelWithReasonModal from './common/CancelWithReasonModal';
import WarehouseSlipPrintView from './WarehouseSlipPrintView';
import { formatActualTotalByUnit } from '../utils/warehouseSlipTotals';
import CreateWarehouseIssueModal from './CreateWarehouseIssueModal';
import EditWarehouseIssueModal from './EditWarehouseIssueModal';
import { useQueryClient } from '@tanstack/react-query';
import warehouseIssueService, { WarehouseIssue } from '../services/warehouseIssueService';
import { displayLoaiKho, displayMaHang, getUniqueSlipField, getWarehouseSlipLines, normalizeWarehouseListResponse } from '../utils/warehouseSlipLines';
import { warehouseKeys, useWarehouses } from '../hooks';
import { useEmployeesForAssignment } from '../hooks/useEmployeesForAssignment';
import { TINH_TRANG_OPTIONS, BO_PHAN_OPTIONS } from '../constants/warehouseCatalogs';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types/auth';
import { useUrlDetailId, useUrlFilters } from '../hooks/useUrlState';

interface WarehouseIssueTabProps {
  month?: number;
  year?: number;
}

const WarehouseIssueTab: React.FC<WarehouseIssueTabProps> = ({ month, year }) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isAdmin = user?.role === UserRole.ADMIN;
  const [issues, setIssues] = useState<WarehouseIssue[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState<WarehouseIssue | null>(null);
  const [showPrintView, setShowPrintView] = useState(false);
  const [printIssue, setPrintIssue] = useState<WarehouseIssue | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingIssue, setEditingIssue] = useState<WarehouseIssue | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<WarehouseIssue | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [voidTarget, setVoidTarget] = useState<WarehouseIssue | null>(null);
  const [voiding, setVoiding] = useState(false);
  const [unvoidingId, setUnvoidingId] = useState<string | null>(null);
  const reqIdRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const detailSeqRef = useRef(0);
  // TODO: URL sync for _search + page (?search=&page=) — skipped as optional/complex; add useSearchParams sync to preserve filters on F5 if needed.
  const { id: urlIssueId, open: openUrlIssue, close: closeUrlIssue, syncingRef: issueSyncRef } = useUrlDetailId('issueId');
  const ITEMS_PER_PAGE = 10;
  const [pageSize, setPageSize] = useState<number>(ITEMS_PER_PAGE);
  const [urlF2, setUrlF2] = useUrlFilters({ _search: '', maPhieuXuat: '', tenNhanVien: '', nguoiDeNghi: '', boPhan: '', warehouseId: '', tinhTrang: '', daIn: '', isVoided: '', fromNgay: '', toNgay: '', page: '1', sortBy: 'ngayXuat', sortOrder: 'desc' }, { prefix: 'out_' });
  const currentPage = Math.max(1, parseInt(urlF2.page || '1', 10) || 1);
  const setCurrentPage = (v: number | ((p:number)=>number)) => { const n = typeof v === 'function' ? (v as (p:number)=>number)(currentPage) : v; setUrlF2({ page: String(n) }); };
  const filterValues: Record<string, string> = { _search: urlF2._search, maPhieuXuat: urlF2.maPhieuXuat, tenNhanVien: urlF2.tenNhanVien, nguoiDeNghi: urlF2.nguoiDeNghi, boPhan: urlF2.boPhan, warehouseId: urlF2.warehouseId, tinhTrang: urlF2.tinhTrang, daIn: urlF2.daIn, isVoided: urlF2.isVoided, fromNgay: urlF2.fromNgay, toNgay: urlF2.toNgay };
  const setFilterValues = (vals: Record<string, string>) => setUrlF2({ _search: vals._search ?? '', maPhieuXuat: vals.maPhieuXuat ?? '', tenNhanVien: vals.tenNhanVien ?? '', nguoiDeNghi: vals.nguoiDeNghi ?? '', boPhan: vals.boPhan ?? '', warehouseId: vals.warehouseId ?? '', tinhTrang: vals.tinhTrang ?? '', daIn: vals.daIn ?? '', isVoided: vals.isVoided ?? '', fromNgay: vals.fromNgay ?? '', toNgay: vals.toNgay ?? '', page: '1' });
  const sortKey = (urlF2.sortBy as 'ngayXuat' | 'maPhieuXuat') || 'ngayXuat';
  const sortDir = (urlF2.sortOrder as 'asc' | 'desc') || 'desc';
  const setSortKey = (k: 'ngayXuat' | 'maPhieuXuat') => setUrlF2({ sortBy: k });
  const setSortDir = (d: 'asc' | 'desc') => setUrlF2({ sortOrder: d });
  const [showBulkConfirm, setShowBulkConfirm] = useState(false);
  const [bulkExporting, setBulkExporting] = useState(false);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const { data: warehousesRaw } = useWarehouses();
  const warehouseOptions = useMemo(() => {
    const raw = (warehousesRaw as any)?.data ?? warehousesRaw;
    const list = Array.isArray(raw) ? raw : [];
    return list.map((w: any) => ({ value: w.id as string, label: `${w.tenKho} (${w.maKho})` }));
  }, [warehousesRaw]);

  const { data: employeeOptionsRaw } = useEmployeesForAssignment();
  const employeeOptions = useMemo(() => {
    const opts = (employeeOptionsRaw ?? []) as { name: string }[];
    if (opts.length > 0) return opts.map((e) => ({ value: e.name, label: e.name }));
    const names = new Set<string>();
    issues.forEach((issue) => { if (issue.tenNhanVien) names.add(issue.tenNhanVien); });
    return Array.from(names).sort((a, b) => a.localeCompare(b, 'vi')).map((name) => ({ value: name, label: name }));
  }, [employeeOptionsRaw, issues]);

  const issueFilterFields: FilterField[] = [
    { key: 'maPhieuXuat', label: 'Mã phiếu', type: 'text' },
    { key: 'tenNhanVien', label: 'Nhân viên', type: 'combobox', options: employeeOptions, placeholder: 'Tất cả' },
    { key: 'nguoiDeNghi', label: 'Người đề nghị', type: 'text' },
    { key: 'boPhan', label: 'Bộ phận', type: 'select', options: [...BO_PHAN_OPTIONS] },
    { key: 'warehouseId', label: 'Kho', type: 'select', options: warehouseOptions },
    { key: 'tinhTrang', label: 'Tình trạng', type: 'select', options: [...TINH_TRANG_OPTIONS.map((o) => ({ value: o.value, label: o.label }))] },
    { key: 'daIn', label: 'Đã in', type: 'select', options: [{ value: 'true', label: 'Đã in' }, { value: 'false', label: 'Chưa in' }] },
    { key: 'isVoided', label: 'Đã vô hiệu', type: 'select', options: [{ value: 'true', label: 'Đã vô hiệu' }, { value: 'false', label: 'Hoạt động' }] },
    { key: 'fromNgay', label: 'Từ ngày', type: 'date' },
    { key: 'toNgay', label: 'Đến ngày', type: 'date' },
  ];

  const dateRangeInvalid = !!(filterValues.fromNgay && filterValues.toNgay && filterValues.fromNgay > filterValues.toNgay);

  const openIssueDetail = useCallback(async (issue: WarehouseIssue) => {
    setSelectedIssue(issue);
    setShowDetailModal(true);
    const seq = ++detailSeqRef.current;
    try {
      const res = await warehouseIssueService.getWarehouseIssueById(issue.id) as any;
      const fresh = res?.data?.data ?? res?.data ?? res;
      if (seq !== detailSeqRef.current) return;
      if (fresh?.id) setSelectedIssue(fresh as WarehouseIssue);
    } catch { /* keep stale */ }
  }, []);

  const handleViewDetail = useCallback(async (issue: WarehouseIssue) => {
    openUrlIssue(issue.id);
    await openIssueDetail(issue);
  }, [openUrlIssue, openIssueDetail]);

  const closeDetail = useCallback(() => {
    closeUrlIssue();
    setShowDetailModal(false);
  }, [closeUrlIssue]);

  // Deep-link / F5 / back-forward: ?issueId=xxx
  useEffect(() => {
    if (issueSyncRef.current) { issueSyncRef.current = false; return; }
    if (!urlIssueId) { if (showDetailModal) setShowDetailModal(false); return; }
    if (selectedIssue?.id === urlIssueId && showDetailModal) return;
    const local = issues.find((r) => r.id === urlIssueId);
    if (local) { void openIssueDetail(local); return; }
    (async () => {
      const seq = ++detailSeqRef.current;
      try {
        const res = await warehouseIssueService.getWarehouseIssueById(urlIssueId) as any;
        const fresh = res?.data?.data ?? res?.data ?? res;
        if (seq !== detailSeqRef.current) return;
        if (fresh?.id) { setSelectedIssue(fresh as WarehouseIssue); setShowDetailModal(true); }
      } catch { /* invalid id */ }
    })();
  // openIssueDetail stable; issues needed for local hit
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlIssueId, issues]);

  const fetchIssues = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const cur = ++reqIdRef.current;
    // Period filter from page header (month/year) — push to server so pagination stays accurate.
    let periodFromNgay: string | undefined;
    let periodToNgay: string | undefined;
    if (filterValues.fromNgay || filterValues.toNgay) {
      // Explicit date range wins
    } else if (month && year) {
      const pad = (n: number) => String(n).padStart(2, '0');
      const lastDay = new Date(year, month, 0).getDate();
      periodFromNgay = `${year}-${pad(month)}-01`;
      periodToNgay = `${year}-${pad(month)}-${pad(lastDay)}`;
    } else if (year && !month) {
      periodFromNgay = `${year}-01-01`;
      periodToNgay = `${year}-12-31`;
    } else if (month && !year) {
      // Month-only cannot map to a single server range — keep client filter
    }
    const effectiveFromNgay = filterValues.fromNgay || periodFromNgay;
    const effectiveToNgay = filterValues.toNgay || periodToNgay;
    const effectiveDateInvalid = !!(effectiveFromNgay && effectiveToNgay && effectiveFromNgay > effectiveToNgay);
    setLoading(true);
    setLoadError(null);
    try {
      const response = await warehouseIssueService.getAllWarehouseIssues({
        page: currentPage,
        limit: pageSize,
        search: filterValues._search || undefined,
        warehouseId: filterValues.warehouseId || undefined,
        fromNgay: effectiveDateInvalid ? undefined : (effectiveFromNgay || undefined),
        toNgay: effectiveDateInvalid ? undefined : (effectiveToNgay || undefined),
        sortBy: sortKey,
        sortOrder: sortDir,
        maPhieu: filterValues.maPhieuXuat?.trim() || undefined,
        maPhieuXuat: filterValues.maPhieuXuat?.trim() || undefined,
        tenNhanVien: filterValues.tenNhanVien?.trim() || undefined,
        nguoiDeNghi: filterValues.nguoiDeNghi?.trim() || undefined,
        boPhan: filterValues.boPhan?.trim() || undefined,
        tinhTrang: filterValues.tinhTrang?.trim() || undefined,
        daIn: filterValues.daIn || undefined,
        isVoided: filterValues.isVoided || undefined,
      } as any, { signal: controller.signal }) as any;
      if (cur !== reqIdRef.current) return;
      const raw: any = response as any;
      const payload = raw?.data;
      const data = payload?.data ?? payload;
      const pagination = raw?.pagination ?? (payload as any)?.pagination;
      if (Array.isArray(payload) && !pagination) {
        setIssues(normalizeWarehouseListResponse<WarehouseIssue>(payload));
        setTotal(payload.length);
        setTotalPages(Math.ceil(payload.length / pageSize) || 1);
      } else {
        setIssues(normalizeWarehouseListResponse<WarehouseIssue>(data));
        setTotal(pagination?.total ?? (Array.isArray(data) ? data.length : 0));
        setTotalPages(pagination?.totalPages ?? Math.max(1, Math.ceil((pagination?.total ?? 0) / pageSize)));
      }
    } catch (error: any) {
      if ((error as any)?.name === 'CanceledError' || (error as any)?.code === 'ERR_CANCELED' || controller.signal.aborted) return;
      if (cur !== reqIdRef.current) return;
      console.error('Error fetching issues:', error);
      setLoadError(error.response?.data?.message || 'Không thể tải danh sách phiếu xuất kho');
    } finally {
      if (cur === reqIdRef.current) setLoading(false);
    }
  }, [currentPage, pageSize, dateRangeInvalid, filterValues._search, filterValues.warehouseId, filterValues.fromNgay, filterValues.toNgay, filterValues.maPhieuXuat, filterValues.tenNhanVien, filterValues.nguoiDeNghi, filterValues.boPhan, filterValues.tinhTrang, filterValues.daIn, filterValues.isVoided, sortKey, sortDir, month, year]);

  useEffect(() => { fetchIssues(); }, [fetchIssues]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const handleDelete = async (lyDo: string) => {
    if (!deleteTarget) return;
    const deletedId = deleteTarget.id;
    const wasDetail = selectedIssue?.id === deletedId;
    setDeleting(true);
    try {
      await warehouseIssueService.deleteWarehouseIssue(deletedId, { lyDo });
      toast.success('Xóa phiếu xuất kho thành công!');
      setDeleteTarget(null);
      if (wasDetail) closeDetail();
      fetchIssues();
      queryClient.invalidateQueries({ queryKey: warehouseKeys.lists() });
      queryClient.invalidateQueries({ queryKey: warehouseKeys.lotProducts() });
      queryClient.invalidateQueries({ queryKey: warehouseKeys.receiptHistories() });
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Lỗi khi xóa phiếu xuất kho');
    } finally {
      setDeleting(false);
    }
  };
  const handleVoid = async (reason: string) => {
    if (!voidTarget) return;
    const targetId = voidTarget.id;
    setVoiding(true);
    try {
      const res: any = await warehouseIssueService.voidWarehouseIssue(targetId, { voidReason: reason });
      const updated = res?.data?.data ?? res?.data ?? null;
      toast.success('Đã vô hiệu phiếu xuất'); setVoidTarget(null);
      if (selectedIssue?.id === targetId && updated) setSelectedIssue(updated as WarehouseIssue);
      else if (selectedIssue?.id === targetId) setSelectedIssue((prev) => prev ? ({ ...prev, isVoided: true, voidReason: reason } as any) : prev);
      fetchIssues(); queryClient.invalidateQueries({ queryKey: warehouseKeys.lists() }); queryClient.invalidateQueries({ queryKey: warehouseKeys.lotProducts() });
    } catch (e: any) { toast.error(e.response?.data?.message || 'Lỗi khi vô hiệu phiếu'); } finally { setVoiding(false); }
  };
  const handleUnvoid = async (id: string) => {
    if (unvoidingId) return; setUnvoidingId(id);
    try {
      const res: any = await warehouseIssueService.unvoidWarehouseIssue(id);
      const updated = res?.data?.data ?? res?.data ?? null;
      toast.success('Đã khôi phục phiếu');
      if (selectedIssue?.id === id && updated) setSelectedIssue(updated as WarehouseIssue);
      else if (selectedIssue?.id === id) setSelectedIssue((prev) => prev ? ({ ...prev, isVoided: false, voidReason: null } as any) : prev);
      fetchIssues(); queryClient.invalidateQueries({ queryKey: warehouseKeys.lists() });
    } catch (e: any) { toast.error(e.response?.data?.message || 'Lỗi khi khôi phục'); } finally { setUnvoidingId(null); }
  };

  // Month/year period is now pushed to server as fromNgay/toNgay (except month-only which has no single range).
  const refinedIssues = React.useMemo(() => {
    if (month && !year) {
      return issues.filter((issue) => (new Date(issue.ngayXuat).getMonth() + 1) === month);
    }
    return issues;
  }, [issues, month, year]);
  const displayIssues = refinedIssues;

  // Sync selected detail when list refreshes
  useEffect(() => {
    if (!selectedIssue) return;
    const fresh = issues.find((x) => x.id === selectedIssue.id);
    if (fresh) {
      const a = (fresh as any).updatedAt ? new Date((fresh as any).updatedAt).getTime() : 0;
      const b = (selectedIssue as any).updatedAt ? new Date((selectedIssue as any).updatedAt).getTime() : 0;
      if (a > b) setSelectedIssue(fresh);
    }
  }, [issues]);

  useEffect(() => {
    setCurrentPage((page) => Math.min(Math.max(1, page), Math.max(1, totalPages)));
  }, [totalPages]);

  const selectedIssueLines = selectedIssue ? getWarehouseSlipLines(selectedIssue) : [];

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Phiếu xuất kho</h2>
        <button
          aria-label="Tạo phiếu xuất kho"
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2 w-full sm:w-auto"
        >
          <Plus className="h-5 w-5" />
          Tạo phiếu xuất
        </button>
      </div>

      <TableFilter
        filters={issueFilterFields}
        values={filterValues}
        onChange={(vals) => { setFilterValues(vals); setCurrentPage(1); }}
        searchPlaceholder="Tìm mã kiện, tên hàng, mã phiếu, nhân viên..."
        dateRangeInvalid={dateRangeInvalid}
      />

      <div className="flex flex-wrap items-center gap-2 mb-3">
        <span className="text-xs text-gray-400">{total} phiếu — bấm tiêu đề Mã phiếu / Ngày xuất để sắp xếp</span>
        <button type="button" onClick={() => setShowBulkConfirm(true)} disabled={displayIssues.length===0} className="ml-auto px-3 py-1.5 min-h-[32px] text-xs border border-blue-300 text-blue-700 rounded hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed">Xuất tổng hợp (trang hiện tại)</button>
      </div>

      {loadError && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          <span>{loadError}</span>
          <button type="button" onClick={fetchIssues} disabled={loading} className="rounded-md border border-red-300 px-3 py-1.5 font-medium hover:bg-red-100 disabled:opacity-50">
            {loading ? 'Đang tải...' : 'Thử lại'}
          </button>
        </div>
      )}
      {loading && issues.length === 0 && <p className="mb-4 text-sm text-gray-500">Đang tải danh sách phiếu xuất kho...</p>}

      {/* Issues Table — desktop */}
      <div className="hidden md:block bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full min-w-[1050px] border-collapse">
          <thead>
            <tr className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-300">
              <th scope="col" aria-sort={sortKey==='maPhieuXuat' ? (sortDir==='asc'?'ascending':'descending'):'none'} className="px-4 py-3 text-left text-sm font-semibold text-gray-900 border-r border-gray-200"><button type="button" aria-label="Sắp xếp theo mã phiếu" onClick={()=>{ if(sortKey==='maPhieuXuat') setSortDir(sortDir==='asc'?'desc':'asc'); else {setSortKey('maPhieuXuat'); setSortDir('desc');} setCurrentPage(1); }} className="inline-flex items-center gap-1 hover:text-gray-700">Mã phiếu {sortKey==='maPhieuXuat'?(sortDir==='asc'?'↑':'↓'):''}</button></th>
              <th scope="col" aria-sort={sortKey==='ngayXuat' ? (sortDir==='asc'?'ascending':'descending'):'none'} className="px-4 py-3 text-left text-sm font-semibold text-gray-900 border-r border-gray-200"><button type="button" aria-label="Sắp xếp theo ngày xuất" onClick={()=>{ if(sortKey==='ngayXuat') setSortDir(sortDir==='asc'?'desc':'asc'); else {setSortKey('ngayXuat'); setSortDir('desc');} setCurrentPage(1); }} className="inline-flex items-center gap-1 hover:text-gray-700">Ngày xuất {sortKey==='ngayXuat'?(sortDir==='asc'?'↑':'↓'):''}</button></th>
              <th scope="col" className="px-4 py-3 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Nhân viên</th>
              <th scope="col" className="px-4 py-3 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Người đề nghị</th>
              <th scope="col" className="px-4 py-3 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Kho</th>
              <th scope="col" className="px-4 py-3 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Lô</th>
              <th scope="col" className="px-4 py-3 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Mã kiện</th>
              <th scope="col" className="px-4 py-3 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Hàng hóa</th>
              <th scope="col" className="px-4 py-3 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Số lượng</th>
              <th scope="col" className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {displayIssues.length === 0 ? (
              (()=>{ const hasF = !!(filterValues._search||filterValues.maPhieuXuat||filterValues.tenNhanVien||filterValues.nguoiDeNghi||filterValues.boPhan||filterValues.warehouseId||filterValues.tinhTrang||filterValues.daIn||filterValues.isVoided||filterValues.fromNgay||filterValues.toNgay); return (
              <tr>
                <td colSpan={10} className="px-6 py-4 text-center text-gray-500">
                  {hasF ? (<span className="inline-flex items-center gap-2">Không khớp bộ lọc <button onClick={()=>setFilterValues({ _search:'',maPhieuXuat:'',tenNhanVien:'',nguoiDeNghi:'',boPhan:'',warehouseId:'',tinhTrang:'',daIn:'',isVoided:'',fromNgay:'',toNgay:'' })} className="px-2 py-1 text-xs border rounded hover:bg-gray-50">Xóa lọc</button></span>) : 'Chưa có phiếu xuất kho nào'}
                </td>
              </tr>
            );})()
            ) : (
              displayIssues.map((issue, issueIndex) => {
                const lines = getWarehouseSlipLines(issue);
                const slipBg = issueIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50';
                const slipBorder = issueIndex < displayIssues.length - 1 ? 'border-b-2 border-gray-300' : '';
                return (
                  <React.Fragment key={issue.id}>
                    {lines.map((line: any, lineIndex) => {
                      const isVoidedRow = (issue as any).isVoided;
                      const isOver = line.soLuongYeuCau != null && line.soLuongThucTe != null && Math.abs(Number(line.soLuongYeuCau) - Number(line.soLuongThucTe)) > 1e-9;
                      const rowHl = isVoidedRow ? 'opacity-60 bg-gray-100' : isOver ? 'bg-amber-50 hover:bg-amber-100' : `${slipBg} hover:bg-blue-50`;
                      return (
                      <tr key={line.id ?? lineIndex} onClick={() => handleViewDetail(issue)} className={`${rowHl} transition-colors cursor-pointer`}>
                        {lineIndex === 0 && (
                          <td rowSpan={lines.length} className={`px-4 py-3 whitespace-nowrap align-top text-sm font-medium text-gray-900 border-r border-gray-200 ${slipBorder}`}>
                            {issue.maPhieuXuat}{(issue as any).isVoided && <span className="ml-2 inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-gray-700">Đã vô hiệu</span>}
                            {issue.isLocked && (
                              <span className="ml-2 inline-flex items-center rounded-full bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-700" title={issue.supplyRequestId ? 'Phiếu liên kết yêu cầu cấp vật tư' : 'Phiếu đã khóa, không thể chỉnh sửa hoặc xóa'}>
                                {issue.supplyRequestId ? 'Đã khóa — yêu cầu cấp vật tư' : 'Đã khóa — chỉ xem/in'}
                              </span>
                            )}
                            {lines.length > 1 && (
                              <span className="ml-1 text-xs font-normal text-gray-400">({lines.length} dòng)</span>
                            )}
                          </td>
                        )}
                        {lineIndex === 0 && (
                          <td rowSpan={lines.length} className={`px-4 py-3 whitespace-nowrap align-top text-sm text-gray-500 border-r border-gray-200 ${slipBorder}`}>
                            {new Date(issue.ngayXuat).toLocaleDateString('vi-VN')}
                          </td>
                        )}
                        {lineIndex === 0 && (
                          <td rowSpan={lines.length} className={`px-4 py-3 whitespace-nowrap align-top text-sm text-gray-500 border-r border-gray-200 ${slipBorder}`}>
                            {issue.tenNhanVien}
                          </td>
                        )}
                        {lineIndex === 0 && (
                          <td rowSpan={lines.length} className={`px-4 py-3 whitespace-nowrap align-top text-sm text-gray-500 border-r border-gray-200 ${slipBorder}`}>
                            {(issue as any).nguoiDeNghi || '—'}
                          </td>
                        )}
                        <td className={`px-4 py-3 whitespace-nowrap text-sm text-gray-500 border-r border-gray-200 ${slipBorder}`}>
                          {line.tenKho || '-'}
                        </td>
                        <td className={`px-4 py-3 whitespace-nowrap text-sm text-gray-500 border-r border-gray-200 ${slipBorder}`}>
                          {line.tenLo || '-'}
                        </td>
                        <td className={`px-4 py-3 whitespace-nowrap text-sm text-gray-500 border-r border-gray-200 ${slipBorder}`}>
                          <span className="font-mono font-medium text-blue-700">{line.maKien || '-'}</span>
                        </td>
                        <td className={`px-4 py-3 whitespace-nowrap text-sm text-gray-500 border-r border-gray-200 ${slipBorder}`}>
                          {line.tenSanPham || '-'}
                        </td>
                        <td className={`px-4 py-3 whitespace-nowrap text-sm text-gray-500 border-r border-gray-200 ${slipBorder}`}>
                          <span>{line.soLuongThucTe} {line.donViTinh || ''}</span>
                          {isOver && <span className="ml-2 inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700" title={`KH ${line.soLuongYeuCau} → TT ${line.soLuongThucTe}`}>⚠ KH {line.soLuongYeuCau} → TT {line.soLuongThucTe}</span>}
                        </td>
                        {lineIndex === 0 && (
                          <td rowSpan={lines.length} className={`px-4 py-3 whitespace-nowrap align-top text-sm text-gray-500 ${slipBorder}`}>
                            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
              <button
                aria-label="Xem chi tiết phiếu xuất"
                onClick={() => handleViewDetail(issue)}
                                className="inline-flex items-center justify-center min-h-[32px] min-w-[32px] p-1.5 text-blue-600 hover:bg-blue-100 rounded-md transition-colors"
                                title="Xem chi tiết"
                              >
                                <Eye className="w-5 h-5" />
                              </button>
                              <button
                                aria-label="In phiếu xuất"
                                onClick={() => { setPrintIssue(issue); setShowPrintView(true); }}
                                disabled={(issue as any).isVoided}
                                className="inline-flex items-center justify-center min-h-[32px] min-w-[32px] p-1.5 text-green-600 hover:bg-green-100 rounded-md transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                title={(issue as any).isVoided ? 'Phiếu đã vô hiệu — không thể in' : 'In phiếu'}
                              >
                                <Printer className="w-5 h-5" />
                              </button>
                              <button
                                onClick={async () => { try { await warehouseIssueService.exportXlsx(issue.id); } catch (e: any) { toast.error(e.message || 'Lỗi xuất Excel'); } }}
                                aria-label="Xuất Excel"
                                disabled={(issue as any).isVoided}
                                className="inline-flex items-center justify-center min-h-[32px] min-w-[32px] p-1.5 text-blue-600 hover:bg-blue-100 rounded-md transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                title={(issue as any).isVoided ? 'Phiếu đã vô hiệu' : 'Xuất Excel (BM03)'}
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" /></svg>
                              </button>
                              {(issue as any).daIn && (
                                <span className="ml-1 inline-flex items-center rounded-full bg-green-100 px-2 py-1 text-xs text-green-700" title="Đã in/xuất">Đã in</span>
                              )}
                              {(issue as any).isVoided ? <button onClick={() => handleUnvoid(issue.id)} disabled={unvoidingId === issue.id} className="inline-flex items-center justify-center min-h-[32px] min-w-[32px] p-1.5 text-green-600 hover:bg-green-100 rounded-md transition-colors disabled:opacity-50" title="Khôi phục"><RotateCcw className="w-5 h-5" /></button> : <button onClick={() => setVoidTarget(issue)} disabled={issue.isLocked && !isAdmin} className="inline-flex items-center justify-center min-h-[32px] min-w-[32px] p-1.5 text-red-600 hover:bg-red-100 rounded-md transition-colors disabled:opacity-30 disabled:cursor-not-allowed" title={issue.isLocked ? (isAdmin ? 'ADMIN: Phiếu đã khóa nhưng bạn có thể vô hiệu (sẽ gỡ liên kết YCC)' : 'Phiếu đã khóa — không thể vô hiệu') : 'Vô hiệu hóa'}><Ban className="w-5 h-5" /></button>}
                              {!issue.isLocked && !((issue as any).isVoided) && (
                                <>
                                  <button
                                    aria-label="Chỉnh sửa phiếu xuất"
                                    onClick={() => setEditingIssue(issue)}
                                    className="inline-flex items-center justify-center min-h-[32px] min-w-[32px] p-1.5 text-amber-600 hover:bg-amber-100 rounded-md transition-colors"
                                    title="Chỉnh sửa"
                                  >
                                    <Pencil className="w-5 h-5" />
                                  </button>
                                  <button
                                    aria-label="Xóa phiếu xuất"
                                    onClick={() => setDeleteTarget(issue)}
                                    className="inline-flex items-center justify-center min-h-[32px] min-w-[32px] p-1.5 text-red-600 hover:bg-red-100 rounded-md transition-colors"
                                    title="Xóa"
                                  >
                                    <Trash2 className="w-5 h-5" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    );})}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
        </div>
      </div>

      {/* Mobile: one card per slip */}
      <div className="md:hidden space-y-3">
        {displayIssues.length === 0 ? (
          (()=>{ const hasF2=!!(filterValues._search||filterValues.maPhieuXuat||filterValues.tenNhanVien||filterValues.nguoiDeNghi||filterValues.boPhan||filterValues.warehouseId||filterValues.tinhTrang||filterValues.daIn||filterValues.isVoided||filterValues.fromNgay||filterValues.toNgay); return hasF2 ? (<div className="flex flex-col items-center gap-2 rounded-lg border border-dashed bg-white px-4 py-6 text-center text-sm text-gray-500">Không khớp bộ lọc <button onClick={()=>setFilterValues({ _search:'',maPhieuXuat:'',tenNhanVien:'',nguoiDeNghi:'',boPhan:'',warehouseId:'',tinhTrang:'',daIn:'',isVoided:'',fromNgay:'',toNgay:'' })} className="px-3 py-1.5 text-xs border rounded hover:bg-gray-50">Xóa lọc</button></div>) : (<div className="rounded-lg border border-gray-200 bg-white px-4 py-6 text-center text-sm text-gray-500">Chưa có phiếu xuất kho nào</div>);})()
        ) : (
          displayIssues.map((issue) => {
            const lines = getWarehouseSlipLines(issue);
            return (
              <div key={issue.id} onClick={() => handleViewDetail(issue)} className={`rounded-lg border p-3 shadow-sm cursor-pointer ${(issue as any).isVoided ? "opacity-60 bg-gray-50 border-red-200" : "border-gray-200 bg-white"}`}>
                <div className="flex items-start justify-between gap-2">
                  <span className="font-mono text-sm font-semibold text-gray-900">{issue.maPhieuXuat}{(issue as any).isVoided && <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700">Đã vô hiệu</span>}{lines.length > 1 && <span className="ml-1 text-xs font-normal text-gray-400">· {lines.length} dòng</span>}</span>
                  {issue.isLocked ? <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">Đã khóa</span> : (issue as any).daIn ? <span className="shrink-0 rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">Đã in</span> : null}
                </div>
                <div className="mt-1 text-xs text-gray-500">{new Date(issue.ngayXuat).toLocaleDateString('vi-VN')} · {issue.tenNhanVien}{(issue as any).nguoiDeNghi ? ` · ${(issue as any).nguoiDeNghi}` : ''}</div>
                <div className="mt-2 space-y-2">
                  {lines.map((line: any, li) => {
                    const isOver = line.soLuongYeuCau != null && line.soLuongThucTe != null && Math.abs(Number(line.soLuongYeuCau) - Number(line.soLuongThucTe)) > 1e-9;
                    return (
                    <div key={line.id ?? li} className={`rounded border px-2.5 py-2 ${isOver ? 'border-amber-200 bg-amber-50' : 'border-gray-100 bg-gray-50'}`}>
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs font-semibold text-blue-700 break-words">{displayMaHang(line)}</span>
                        <span className="rounded bg-white px-1.5 py-0.5 text-xs text-gray-600 shrink-0">{displayLoaiKho(line)}</span>
                      </div>
                      <div className="text-sm font-medium text-gray-900 line-clamp-2 break-words">{line.tenSanPham || '-'}</div>
                      <div className="text-xs text-gray-500 break-words">{line.tenKho ? `Kho ${line.tenKho} · ` : ''}{line.tenLo ? `Lô ${line.tenLo}` : ''}{line.maKien ? ` · Kiện ${line.maKien}` : ''} · {line.soLuongThucTe} {line.donViTinh || ''}</div>
                      {(line.tinhTrang || line.quyCach) && (
                        <div className="mt-1 flex flex-wrap gap-1.5 text-xs">
                          {line.tinhTrang && <span className="rounded bg-white px-1.5 py-0.5 text-gray-600 border border-gray-200 break-words">{line.tinhTrang}</span>}
                          {line.quyCach && <span className="rounded bg-white px-1.5 py-0.5 text-gray-600 border border-gray-200 break-words">{line.quyCach}</span>}
                        </div>
                      )}
                      {isOver && <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">⚠ KH {line.soLuongYeuCau} → TT {line.soLuongThucTe}</div>}
                    </div>
                    );})}
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5" onClick={(e) => e.stopPropagation()}>
                  <button onClick={() => handleViewDetail(issue)} className="rounded border border-blue-200 px-2.5 py-1 text-xs text-blue-700">Chi tiết</button>
                  <button onClick={() => { setPrintIssue(issue); setShowPrintView(true); }} disabled={(issue as any).isVoided} className="rounded border border-green-200 px-2.5 py-1 text-xs text-green-700 disabled:opacity-30 disabled:cursor-not-allowed" title={(issue as any).isVoided ? 'Phiếu đã vô hiệu — không thể in' : 'In'}>In</button>
                  <button onClick={async () => { try { await warehouseIssueService.exportXlsx(issue.id); } catch (e: any) { toast.error(e.message || 'Lỗi xuất Excel'); } }} disabled={(issue as any).isVoided} className="rounded border border-blue-200 px-2.5 py-1 text-xs text-blue-700 disabled:opacity-30 disabled:cursor-not-allowed" title={(issue as any).isVoided ? 'Phiếu đã vô hiệu' : 'Excel'}>Excel</button>
                  {(issue as any).isVoided ? <button onClick={() => handleUnvoid(issue.id)} disabled={unvoidingId === issue.id} className="inline-flex items-center gap-1 rounded border border-green-200 px-2.5 py-1 text-xs text-green-700 disabled:opacity-50"><RotateCcw className="w-3.5 h-3.5" /> Khôi phục</button> : <button onClick={() => setVoidTarget(issue)} disabled={issue.isLocked && !isAdmin} className="inline-flex items-center gap-1 rounded border border-red-200 px-2.5 py-1 text-xs text-red-700 disabled:opacity-30 disabled:cursor-not-allowed" title={issue.isLocked ? 'Phiếu đã khóa' : undefined}><Ban className="w-3.5 h-3.5" /> Vô hiệu</button>}
                  {!issue.isLocked && !((issue as any).isVoided) && (
                    <>
                      <button onClick={() => setEditingIssue(issue)} className="rounded border border-amber-200 px-2.5 py-1 text-xs text-amber-700">Sửa</button>
                      <button onClick={() => setDeleteTarget(issue)} className="rounded border border-red-200 px-2.5 py-1 text-xs text-red-700">Xóa</button>
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      <PaginationBar
        page={currentPage}
        limit={pageSize}
        total={total}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        onLimitChange={(limit) => { setPageSize(limit); setCurrentPage(1); }}
        label="phiếu"
        ariaLabel="Phân trang phiếu xuất"
      />

      {/* Detail Modal — deep-linked via ?issueId= */}
      <Modal isOpen={showDetailModal && !!selectedIssue} onClose={closeDetail} showBackdrop closeOnBackdrop={true}>
        <div className="bg-white rounded-lg shadow-xl w-[calc(100vw-1rem)] sm:max-w-[1100px] flex flex-col modal-viewport-h" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
            <h2 className="text-xl font-bold text-gray-900">Chi tiết phiếu xuất kho</h2>
            <button
              aria-label="Đóng chi tiết phiếu xuất"
              onClick={closeDetail}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {selectedIssue && (
            <div className="overflow-y-auto flex-1 p-6">
            {(selectedIssue as any).isVoided && (
              <div className="mb-3 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700"><div className="font-semibold">Đã vô hiệu</div><div>Lý do: {(selectedIssue as any).voidReason || '—'}</div><div className="text-xs text-red-600">{(selectedIssue as any).voidedAt ? new Date((selectedIssue as any).voidedAt).toLocaleString('vi-VN') : ''} {(selectedIssue as any).voidedByName ? `· ${(selectedIssue as any).voidedByName}` : (selectedIssue as any).voidedBy ? `· ${(selectedIssue as any).voidedBy}` : ''}</div></div>
            )}
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-2 text-red-800 font-semibold text-lg">
                <FileText className="h-5 w-5" />
                {selectedIssue.maPhieuXuat}
                {selectedIssue.isLocked && (
                  <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-700" title={selectedIssue.supplyRequestId ? 'Phiếu liên kết yêu cầu cấp vật tư' : 'Phiếu đã khóa bởi quy trình kho'}>
                    Đã khóa — chỉ xem/in
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <label className="text-xs text-gray-500 uppercase font-medium">Ngày xuất</label>
                  <p className="text-sm font-semibold text-gray-900 mt-1">
                    {new Date(selectedIssue.ngayXuat).toLocaleDateString('vi-VN', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <label className="text-xs text-gray-500 uppercase font-medium">Nhân viên thực hiện</label>
                  <p className="text-sm font-semibold text-gray-900 mt-1">{selectedIssue.tenNhanVien}</p>
                  <p className="text-xs text-gray-500">{selectedIssue.maNhanVien}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <label className="text-xs text-gray-500 uppercase font-medium">Người đề nghị</label>
                  <p className="text-sm font-semibold text-gray-900 mt-1">{(selectedIssue as any).nguoiDeNghi || '—'}</p>
                  {(selectedIssue as any).boPhan && <p className="text-xs text-gray-500">{(selectedIssue as any).boPhan}</p>}
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <label className="text-xs text-gray-500 uppercase font-medium">Bộ phận</label>
                  <p className="text-sm font-semibold text-gray-900 mt-1">{(selectedIssue as any).boPhan || '—'}</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <label className="text-xs text-gray-500 uppercase font-medium">Kho</label>
                  <p className="text-sm font-semibold text-gray-900 mt-1">{[...new Set(selectedIssueLines.map((item: any) => (item.maKho || item.tenKho)).filter(Boolean))].join(', ') || '-'}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <label className="text-xs text-gray-500 uppercase font-medium">Lô hàng</label>
                  <p className="text-sm font-semibold text-gray-900 mt-1">{getUniqueSlipField(selectedIssueLines, 'tenLo')}</p>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4">
                <div className="bg-orange-50 border border-orange-200 p-3 rounded-lg">
                  <label className="text-xs text-orange-600 uppercase font-medium">Lý do xuất</label>
                  <p className="text-sm text-gray-700 mt-1">{(selectedIssue as any).lyDoXuatKho || '—'}</p>
                </div>
              </div>

              {selectedIssueLines.length > 0 ? (
                <div className="bg-gray-50 p-3 rounded-lg">
                  <label className="text-xs text-gray-500 uppercase font-medium mb-2 block">
                    Chi tiết hàng hóa ({selectedIssueLines.length} dòng) — 14 cột BM03
                  </label>
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full min-w-[1100px] text-sm border-collapse">
                      <thead>
                        <tr className="bg-gray-100">
                          <th scope="col" className="px-2 py-1.5 text-center text-xs font-medium text-gray-600 border">TT</th>
                          <th scope="col" className="px-2 py-1.5 text-left text-xs font-medium text-gray-600 border">Mã hàng</th>
                          <th scope="col" className="px-2 py-1.5 text-left text-xs font-medium text-gray-600 border">Loại Kho</th>
                          <th scope="col" className="px-2 py-1.5 text-left text-xs font-medium text-gray-600 border">Tên hàng</th>
                          <th scope="col" className="px-2 py-1.5 text-center text-xs font-medium text-gray-600 border">Số lô KH</th>
                          <th scope="col" className="px-2 py-1.5 text-center text-xs font-medium text-gray-600 border">Số lô TT</th>
                          <th scope="col" className="px-2 py-1.5 text-center text-xs font-medium text-gray-600 border">Số kiện KH</th>
                          <th scope="col" className="px-2 py-1.5 text-center text-xs font-medium text-gray-600 border">Số kiện TT</th>
                          <th scope="col" className="px-2 py-1.5 text-left text-xs font-medium text-gray-600 border">Tình trạng</th>
                          <th scope="col" className="px-2 py-1.5 text-left text-xs font-medium text-gray-600 border">Quy cách</th>
                          <th scope="col" className="px-2 py-1.5 text-center text-xs font-medium text-gray-600 border">ĐV</th>
                          <th scope="col" className="px-2 py-1.5 text-right text-xs font-medium text-gray-600 border">SL KH</th>
                          <th scope="col" className="px-2 py-1.5 text-right text-xs font-medium text-gray-600 border">SL TT</th>
                          <th scope="col" className="px-2 py-1.5 text-left text-xs font-medium text-gray-600 border">Ghi chú</th>
                          <th scope="col" className="px-2 py-1.5 text-right text-xs font-medium text-gray-600 border">Tồn trước</th>
                          <th scope="col" className="px-2 py-1.5 text-right text-xs font-medium text-gray-600 border">Tồn sau</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedIssueLines.map((item: any, idx) => (
                          <tr key={item.id || idx} className="hover:bg-gray-100">
                            <td className="px-2 py-1.5 border text-center">{item.stt || idx + 1}</td>
                            <td className="px-2 py-1.5 border font-mono text-xs">{displayMaHang(item)}</td>
                            <td className="px-2 py-1.5 border">{displayLoaiKho(item)}</td>
                            <td className="px-2 py-1.5 border">{item.tenSanPham || '-'}</td>
                            <td className="px-2 py-1.5 border text-center">{item.soLoKeHoach ?? '-'}</td>
                            <td className="px-2 py-1.5 border text-center">{item.soLoThucTe ?? item.tenLo ?? '-'}</td>
                            <td className="px-2 py-1.5 border font-mono text-xs">{(() => { try { const a = JSON.parse(item.soKienKeHoach); if (Array.isArray(a)) return a.join(', '); } catch { void 0; } return item.soKienKeHoach ?? '-'; })()}</td>
                            <td className="px-2 py-1.5 border font-mono text-xs">{(() => { try { const a = JSON.parse(item.soKienThucTe); if (Array.isArray(a)) return a.join(', '); } catch { void 0; } return item.soKienThucTe ?? item.maKien ?? '-'; })()}</td>
                            <td className="px-2 py-1.5 border">{item.tinhTrang ?? '-'}</td>
                            <td className="px-2 py-1.5 border">{item.quyCach ?? '-'}</td>
                            <td className="px-2 py-1.5 border text-center">{item.donViTinh || '-'}</td>
                            <td className="px-2 py-1.5 border text-right">{item.soLuongYeuCau ?? item.soLuongThucTe}</td>
                            <td className="px-2 py-1.5 border text-right font-semibold text-red-600">{item.soLuongThucTe} {item.donViTinh || ''}</td>
                            <td className="px-2 py-1.5 border">{item.ghiChu || '-'}</td>
                            <td className="px-2 py-1.5 border text-right">{item.soLuongTruoc ?? '-'}</td>
                            <td className="px-2 py-1.5 border text-right">{item.soLuongSau ?? '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-gray-100 font-semibold">
                          <td colSpan={12} className="px-2 py-1.5 border text-right">Tổng cộng (SL TT):</td>
                          <td className="px-2 py-1.5 border text-right text-red-700">
                            {formatActualTotalByUnit(selectedIssueLines)}
                          </td>
                          <td colSpan={3} className="px-2 py-1.5 border"></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                  {/* Mobile: card per line — 16-column table is unreadable on phones */}
                  <div className="md:hidden mt-3 space-y-3">
                    {selectedIssueLines.map((item: any, idx) => (
                      <div key={item.id || idx} className="rounded-lg border border-gray-200 bg-white p-3 text-sm">
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-mono text-xs font-semibold text-blue-700">{displayMaHang(item)}</span>
                          <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">{displayLoaiKho(item)}</span>
                        </div>
                        <div className="mt-1 font-medium text-gray-900">{item.tenSanPham || '-'}</div>
                        <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                          <dt className="text-gray-500">Số lô KH</dt><dd className="text-right">{item.soLoKeHoach ?? '-'}</dd>
                          <dt className="text-gray-500">Số lô TT</dt><dd className="text-right">{item.soLoThucTe ?? item.tenLo ?? '-'}</dd>
                          <dt className="text-gray-500">Số kiện KH</dt><dd className="text-right font-mono text-xs">{(() => { try { const a = JSON.parse(item.soKienKeHoach); if (Array.isArray(a)) return a.join(', '); } catch { void 0; } return item.soKienKeHoach ?? '-'; })()}</dd>
                          <dt className="text-gray-500">Số kiện TT</dt><dd className="text-right font-mono text-xs">{(() => { try { const a = JSON.parse(item.soKienThucTe); if (Array.isArray(a)) return a.join(', '); } catch { void 0; } return item.soKienThucTe ?? item.maKien ?? '-'; })()}</dd>
                          <dt className="text-gray-500">Tình trạng</dt><dd className="text-right">{item.tinhTrang ?? '-'}</dd>
                          <dt className="text-gray-500">Quy cách</dt><dd className="text-right">{item.quyCach ?? '-'}</dd>
                          <dt className="text-gray-500">ĐV</dt><dd className="text-right">{item.donViTinh || '-'}</dd>
                          <dt className="text-gray-500">SL KH</dt><dd className="text-right">{item.soLuongYeuCau ?? item.soLuongThucTe}</dd>
                          <dt className="text-gray-500">SL TT</dt><dd className="text-right font-semibold text-red-600">{item.soLuongThucTe} {item.donViTinh || ''}</dd>
                          <dt className="text-gray-500">Tồn trước</dt><dd className="text-right">{item.soLuongTruoc ?? '-'}</dd>
                          <dt className="text-gray-500">Tồn sau</dt><dd className="text-right">{item.soLuongSau ?? '-'}</dd>
                        </dl>
                        {item.ghiChu && <div className="mt-2 text-xs text-gray-600"><span className="text-gray-500">Ghi chú:</span> {item.ghiChu}</div>}
                      </div>
                    ))}
                    <div className="rounded-lg bg-gray-100 px-3 py-2 text-right text-sm font-semibold text-red-700">Tổng cộng (SL TT): {formatActualTotalByUnit(selectedIssueLines)}</div>
                  </div>
                </div>
              ) : (
                <div className="bg-gray-50 p-3 rounded-lg">
                  <label className="text-xs text-gray-500 uppercase font-medium">Hàng hóa</label>
                  <p className="text-sm font-semibold text-gray-900 mt-1">{selectedIssue.tenSanPham ?? 'N/A'}</p>
                </div>
              )}

              {selectedIssue.ghiChu && (
                <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg">
                  <label className="text-xs text-yellow-600 uppercase font-medium">Ghi chú phiếu</label>
                  <p className="text-sm text-gray-700 mt-1">{selectedIssue.ghiChu}</p>
                </div>
              )}

              {(() => {
                const lyDo = (selectedIssue as any).lyDoChenhLech ?? (selectedIssue as any).outboundPlan?.lyDoChenhLech ?? null;
                const hasLyDo = !!(lyDo && String(lyDo).trim());
                const hasDiff = (selectedIssue.items ?? []).some((it: any) => it.soLuongYeuCau != null && Math.abs(Number(it.soLuongYeuCau) - Number(it.soLuongThucTe)) > 1e-9);
                if (!hasLyDo && !hasDiff) return null;
                return (
                  <div className={`p-3 rounded-lg border ${hasLyDo ? 'bg-amber-50 border-amber-300' : 'bg-red-50 border-red-200'}`}>
                    <label className={`text-xs uppercase font-medium ${hasLyDo ? 'text-amber-700' : 'text-red-600'}`}>Lý do chênh lệch {hasDiff ? '(thực tế khác kế hoạch)' : ''}</label>
                    <p className={`text-sm mt-1 ${hasLyDo ? 'text-gray-800' : 'text-red-700 italic'}`}>{hasLyDo ? String(lyDo) : 'Chưa ghi lý do — thực tế khác kế hoạch nhưng không có lý do chênh lệch.'}</p>
                  </div>
                );
              })()}

              {(selectedIssue as any).daIn && (
                <div className="bg-green-50 border border-green-200 p-3 rounded-lg flex flex-wrap items-center gap-4 text-sm">
                  <span><span className="text-xs text-gray-500 uppercase font-medium">Người lập phiếu:</span> <span className="font-semibold text-gray-900 ml-1">{selectedIssue.tenNhanVien}</span></span>
                  <span><span className="text-xs text-gray-500 uppercase font-medium">Ngày in (in lần đầu):</span> <span className="font-semibold text-gray-900 ml-1">{(selectedIssue as any).inLanDauAt ? new Date((selectedIssue as any).inLanDauAt).toLocaleString('vi-VN') : '—'}</span></span>
                  <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">Đã in</span>
                </div>
              )}

              <div className="text-xs text-gray-400 text-right">
                Tạo lúc: {new Date(selectedIssue.createdAt).toLocaleString('vi-VN')}
              </div>
            </div>
            </div>
          )}

          <div className="flex flex-wrap justify-end gap-2 px-6 py-4 border-t border-gray-200 shrink-0">
            {(selectedIssue as any)?.isVoided ? (
              <button
                onClick={() => { if (selectedIssue) handleUnvoid(selectedIssue.id); }}
                disabled={unvoidingId === selectedIssue?.id}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 inline-flex items-center gap-1.5"
              >
                <RotateCcw className="w-4 h-4" /> Khôi phục
              </button>
            ) : (
              <button
                onClick={() => { if (selectedIssue) setVoidTarget(selectedIssue); }}
                disabled={!!selectedIssue?.isLocked && !isAdmin}
                title={selectedIssue?.isLocked ? (isAdmin ? 'ADMIN: Phiếu đã khóa nhưng bạn có thể vô hiệu' : 'Phiếu đã khóa — không thể vô hiệu') : undefined}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
              >
                <Ban className="w-4 h-4" /> Vô hiệu
              </button>
            )}
            {!selectedIssue?.isLocked && !(selectedIssue as any)?.isVoided && (
              <>
                <button
                  onClick={() => { if (selectedIssue) setEditingIssue(selectedIssue); }}
                  className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 inline-flex items-center gap-1.5"
                >
                  <Pencil className="w-4 h-4" /> Sửa
                </button>
                <button
                  onClick={() => { if (selectedIssue) setDeleteTarget(selectedIssue); }}
                  className="px-4 py-2 bg-red-50 text-red-700 border border-red-200 rounded-lg hover:bg-red-100 inline-flex items-center gap-1.5"
                >
                  <Trash2 className="w-4 h-4" /> Xóa
                </button>
              </>
            )}
            <button
              onClick={() => { setPrintIssue(selectedIssue); setShowPrintView(true); }}
              disabled={(selectedIssue as any)?.isVoided}
              title={(selectedIssue as any)?.isVoided ? 'Phiếu đã vô hiệu — không thể in' : undefined}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              In phiếu
            </button>
            <button
              onClick={async () => { try { await warehouseIssueService.exportXlsx(selectedIssue!.id); } catch (e: any) { toast.error(e.message || 'Lỗi xuất Excel'); } }}
              disabled={(selectedIssue as any)?.isVoided}
              title={(selectedIssue as any)?.isVoided ? 'Phiếu đã vô hiệu' : undefined}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Xuất Excel
            </button>
            <button
              aria-label="Đóng chi tiết phiếu xuất"
              onClick={closeDetail}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
            >
              Đóng
            </button>
          </div>
        </div>
      </Modal>

      {showPrintView && printIssue && (
        <WarehouseSlipPrintView
          type="issue"
          maPhieu={printIssue.maPhieuXuat}
          ngay={new Date(printIssue.ngayXuat).toLocaleDateString('vi-VN')}
          tenNhanVien={printIssue.tenNhanVien}
          maNhanVien={printIssue.maNhanVien}
          ghiChu={printIssue.ghiChu ?? undefined}
          lyDoXuatKho={(printIssue as any).lyDoXuatKho ?? undefined}
          lyDoChenhLech={(printIssue as any).lyDoChenhLech ?? (printIssue as any).outboundPlan?.lyDoChenhLech ?? undefined}
          nguoiDeNghi={(printIssue as any).nguoiDeNghi ?? undefined}
          boPhan={(printIssue as any).boPhan ?? undefined}
          isVoided={(printIssue as any).isVoided}
          voidReason={(printIssue as any).voidReason}
          items={getWarehouseSlipLines(printIssue)}
          onClose={() => { setShowPrintView(false); setPrintIssue(null); }}
          onMarkPrinted={() => { warehouseIssueService.markPrinted(printIssue.id).catch(()=>{}); }}
        />
      )}

      <CreateWarehouseIssueModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {
          fetchIssues();
          queryClient.invalidateQueries({ queryKey: warehouseKeys.lists() });
        }}
      />

      <EditWarehouseIssueModal
        isOpen={!!editingIssue}
        issue={editingIssue}
        onClose={() => setEditingIssue(null)}
        onSuccess={async (updated?: WarehouseIssue) => {
          const editedId = editingIssue?.id ?? null;
          if (editedId && selectedIssue?.id === editedId) {
            if (updated?.id) {
              setSelectedIssue(updated);
            } else {
              try {
                const seq = ++detailSeqRef.current;
                const res = await warehouseIssueService.getWarehouseIssueById(editedId) as any;
                const fresh = res?.data?.data ?? res?.data ?? res;
                if (seq === detailSeqRef.current && fresh?.id) setSelectedIssue(fresh as WarehouseIssue);
              } catch { /* keep optimistic selected */ }
            }
          }
          fetchIssues();
          queryClient.invalidateQueries({ queryKey: warehouseKeys.lists() });
        }}
      />

      <CancelWithReasonModal
        isOpen={!!voidTarget}
        onClose={() => setVoidTarget(null)}
        onConfirm={handleVoid}
        ticketLabel={`phiếu xuất ${voidTarget?.maPhieuXuat ?? ''}`}
        description="Vô hiệu sẽ hoàn tác tồn kho của phiếu. Nhập lý do để tiếp tục."
        loading={voiding}
      />
      <CancelWithReasonModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        ticketLabel={`phiếu xuất ${deleteTarget?.maPhieuXuat ?? ''}`}
        description="Hành động này sẽ xóa phiếu và hoàn tác số tồn liên quan. Không thể hoàn tác."
        loading={deleting}
      />
      <Modal isOpen={showBulkConfirm} onClose={()=>setShowBulkConfirm(false)} ariaLabel="Xác nhận xuất tổng hợp">
        <div className="bg-white rounded-lg shadow-xl w-[calc(100vw-1rem)] max-w-md p-6" onClick={e=>e.stopPropagation()}>
          <h3 className="font-semibold text-gray-900 mb-2">Xuất tổng hợp {displayIssues.length} phiếu?</h3>
          <p className="text-sm text-gray-600 mb-4">Tải Excel cho từng phiếu đang hiển thị (trang hiện tại).</p>
          <div className="flex justify-end gap-2">
            <button onClick={()=>setShowBulkConfirm(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm">Hủy</button>
            <button disabled={bulkExporting} onClick={async()=>{
              setBulkExporting(true);
              let ok=0,fail=0;
              for(const r of displayIssues){ try{ await warehouseIssueService.exportXlsx((r as any).id); ok++; } catch{ fail++; } }
              setBulkExporting(false); setShowBulkConfirm(false);
              if(fail>0) toast.error(`Xuất xong ${ok}/${displayIssues.length} phiếu, ${fail} lỗi`);
              else toast.success(`Đã xuất ${ok} phiếu`);
            }} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">{bulkExporting?'Đang xuất...':'Xác nhận'}</button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default WarehouseIssueTab;