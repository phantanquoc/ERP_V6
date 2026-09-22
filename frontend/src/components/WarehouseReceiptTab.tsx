import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Plus, FileText, Eye, Pencil, Trash2, Printer, Ban, RotateCcw } from 'lucide-react';
import Modal from './Modal';
import CancelWithReasonModal from './common/CancelWithReasonModal';
import WarehouseSlipPrintView from './WarehouseSlipPrintView';
import { formatActualTotalByUnit } from '../utils/warehouseSlipTotals';
import EditWarehouseReceiptModal from './EditWarehouseReceiptModal';
import CreateWarehouseReceiptModal from './CreateWarehouseReceiptModal';
import { useQueryClient } from '@tanstack/react-query';
import warehouseReceiptService, { WarehouseReceipt } from '../services/warehouseReceiptService';
import TableFilter, { FilterField } from './TableFilter';
import { warehouseKeys, useWarehouses } from '../hooks';
import { getUniqueSlipField, getWarehouseSlipLines, normalizeWarehouseListResponse, displayMaHang, displayLoaiKho } from '../utils/warehouseSlipLines';
void getUniqueSlipField;
import { TINH_TRANG_OPTIONS, BO_PHAN_OPTIONS } from '../constants/warehouseCatalogs';
import { useEmployeesForAssignment } from '../hooks/useEmployeesForAssignment';
import { useUrlDetailId } from '../hooks/useUrlState';

interface WarehouseReceiptTabProps {
  month?: number;
  year?: number;
}

const ITEMS_PER_PAGE = 10;

const WarehouseReceiptTab: React.FC<WarehouseReceiptTabProps> = ({ month, year }) => {
  const queryClient = useQueryClient();
  const [receipts, setReceipts] = useState<WarehouseReceipt[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<WarehouseReceipt | null>(null);
  const [showPrintView, setShowPrintView] = useState(false);
  const [printReceipt, setPrintReceipt] = useState<WarehouseReceipt | null>(null);
  const [editingReceipt, setEditingReceipt] = useState<WarehouseReceipt | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<WarehouseReceipt | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [voidTarget, setVoidTarget] = useState<WarehouseReceipt | null>(null);
  const [voiding, setVoiding] = useState(false);
  const [unvoidingId, setUnvoidingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [filterValues, setFilterValues] = useState<Record<string, string>>({ _search: '', maPhieuNhap: '', tenNhanVien: '', nguoiDeNghi: '', boPhan: '', warehouseId: '', tinhTrang: '', daIn: '', isVoided: '', fromNgay: '', toNgay: '' });
  const [sortKey, setSortKey] = useState<'ngayNhap' | 'maPhieuNhap'>('ngayNhap');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [showBulkConfirm, setShowBulkConfirm] = useState(false);
  const [bulkExporting, setBulkExporting] = useState(false);
  const reqIdRef = useRef(0);
  const detailSeqRef = useRef(0);
  const { id: urlReceiptId, open: openUrlReceipt, close: closeUrlReceipt, syncingRef: receiptSyncRef } = useUrlDetailId('receiptId');
  const { data: warehousesRaw } = useWarehouses();
  // useWarehouses returns the unwrapped body, whose shape the service leaves
  // untyped — normalize to an array the same way the sibling tabs do.
  const warehouseList = React.useMemo(() => {
    const raw = (warehousesRaw as any)?.data ?? warehousesRaw;
    return (Array.isArray(raw) ? raw : []) as { maKho?: string; tenKho?: string }[];
  }, [warehousesRaw]);

  const { data: employeeOptionsRaw } = useEmployeesForAssignment();
  const tenNhanVienOptions = React.useMemo(() => {
    const opts = (employeeOptionsRaw ?? []) as { name: string }[];
    if (opts.length > 0) return opts.map((e) => ({ value: e.name, label: e.name }));
    // Fallback: distinct from current page while employee directory loads
    const names = new Set<string>();
    receipts.forEach((r) => { if (r.tenNhanVien) names.add(r.tenNhanVien); });
    return [...names].sort((a, b) => a.localeCompare(b, 'vi')).map((n) => ({ value: n, label: n }));
  }, [employeeOptionsRaw, receipts]);

  const warehouseIdOptions = React.useMemo(
    () => warehouseList
      .filter((w: any) => !!(w as any).id)
      .map((w: any) => ({ value: w.id as string, label: `${w.tenKho} (${w.maKho})` })),
    [warehouseList]
  );

  const warehouseIdFromName = React.useMemo(() => {
    if (!filterValues.warehouseId) return undefined;
    // Already an id (select stores id), but keep fallback if someone stored tenKho
    return filterValues.warehouseId;
  }, [filterValues.warehouseId, warehousesRaw]);

  const receiptFilterFields: FilterField[] = [
    // keep fast client filters but move heavy paginable ones to server: search/warehouse/date/sort
    { key: 'maPhieuNhap', label: 'Mã phiếu', type: 'text' },
    { key: 'tenNhanVien', label: 'Nhân viên', type: 'select', options: tenNhanVienOptions },
    { key: 'nguoiDeNghi', label: 'Người đề nghị', type: 'text' },
    { key: 'boPhan', label: 'Bộ phận', type: 'select', options: [...BO_PHAN_OPTIONS] },
    { key: 'warehouseId', label: 'Kho', type: 'select', options: warehouseIdOptions },
    { key: 'tinhTrang', label: 'Tình trạng', type: 'select', options: [...TINH_TRANG_OPTIONS].map((o) => ({ value: o.value, label: o.label })) },
    { key: 'daIn', label: 'Đã in', type: 'select', options: [{ value: 'true', label: 'Đã in' }, { value: 'false', label: 'Chưa in' }] },
    { key: 'isVoided', label: 'Đã vô hiệu', type: 'select', options: [{ value: 'true', label: 'Đã vô hiệu' }, { value: 'false', label: 'Hoạt động' }] },
    { key: 'fromNgay', label: 'Từ ngày', type: 'date' },
    { key: 'toNgay', label: 'Đến ngày', type: 'date' },
  ];

  const dateRangeError = !!(filterValues.fromNgay && filterValues.toNgay && filterValues.fromNgay > filterValues.toNgay);

  const openReceiptDetail = useCallback(async (receipt: WarehouseReceipt) => {
    setSelectedReceipt(receipt);
    setShowDetailModal(true);
    const seq = ++detailSeqRef.current;
    try {
      const res = await warehouseReceiptService.getWarehouseReceiptById(receipt.id) as any;
      const fresh = res?.data?.data ?? res?.data ?? res;
      if (seq !== detailSeqRef.current) return;
      if (fresh?.id) setSelectedReceipt(fresh as WarehouseReceipt);
    } catch { /* keep stale */ }
  }, []);

  const handleViewDetail = useCallback(async (receipt: WarehouseReceipt) => {
    openUrlReceipt(receipt.id);
    await openReceiptDetail(receipt);
  }, [openUrlReceipt, openReceiptDetail]);

  const closeDetail = useCallback(() => {
    closeUrlReceipt();
    setShowDetailModal(false);
  }, [closeUrlReceipt]);

  // Deep-link / F5 / back-forward: ?receiptId=xxx → mở chi tiết
  useEffect(() => {
    if (receiptSyncRef.current) { receiptSyncRef.current = false; return; }
    if (!urlReceiptId) { if (showDetailModal) setShowDetailModal(false); return; }
    if (selectedReceipt?.id === urlReceiptId && showDetailModal) return;
    const local = receipts.find((r) => r.id === urlReceiptId);
    if (local) { void openReceiptDetail(local); return; }
    // Not on current page (pagination/filter): fetch directly
    (async () => {
      const seq = ++detailSeqRef.current;
      try {
        const res = await warehouseReceiptService.getWarehouseReceiptById(urlReceiptId) as any;
        const fresh = res?.data?.data ?? res?.data ?? res;
        if (seq !== detailSeqRef.current) return;
        if (fresh?.id) { setSelectedReceipt(fresh as WarehouseReceipt); setShowDetailModal(true); }
      } catch { /* invalid id — leave closed, don't loop */ }
    })();
  // openReceiptDetail stable; receipts needed for local hit
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlReceiptId, receipts]);

  const fetchReceipts = useCallback(async () => {
    const cur = ++reqIdRef.current;
    const _dateInvalid = !!(dateRangeError);
    setLoading(true);
    setLoadError(null);
    try {
      const response = await warehouseReceiptService.getAllWarehouseReceipts({
        page: currentPage,
        limit: ITEMS_PER_PAGE,
        search: filterValues._search || undefined,
        warehouseId: warehouseIdFromName || undefined,
        fromNgay: _dateInvalid ? undefined : (filterValues.fromNgay || undefined),
        toNgay: _dateInvalid ? undefined : (filterValues.toNgay || undefined),
        sortBy: sortKey,
        sortOrder: sortDir,
        maPhieu: filterValues.maPhieuNhap?.trim() || undefined,
        maPhieuNhap: filterValues.maPhieuNhap?.trim() || undefined,
        tenNhanVien: filterValues.tenNhanVien?.trim() || undefined,
        nguoiDeNghi: filterValues.nguoiDeNghi?.trim() || undefined,
        boPhan: filterValues.boPhan?.trim() || undefined,
        tinhTrang: filterValues.tinhTrang?.trim() || undefined,
        daIn: filterValues.daIn || undefined,
        isVoided: filterValues.isVoided || undefined,
      } as any) as any;
      if (cur !== reqIdRef.current) return;
      const payload = response?.data;
      const data = payload?.data ?? payload;
      const pagination = payload?.pagination;
      // Backward compat: backend may return bare array if pagination not triggered
      if (Array.isArray(payload)) {
        setReceipts(normalizeWarehouseListResponse<WarehouseReceipt>(payload));
        setTotal(payload.length);
        setTotalPages(Math.ceil(payload.length / ITEMS_PER_PAGE) || 1);
      } else {
        setReceipts(normalizeWarehouseListResponse<WarehouseReceipt>(data));
        setTotal(pagination?.total ?? (Array.isArray(data) ? data.length : 0));
        setTotalPages(pagination?.totalPages ?? Math.max(1, Math.ceil((pagination?.total ?? 0) / ITEMS_PER_PAGE)));
      }
    } catch (error: any) {
      if (cur !== reqIdRef.current) return;
      console.error('Error fetching receipts:', error);
      setLoadError(error.response?.data?.message || 'Không thể tải danh sách phiếu nhập kho');
    } finally {
      if (cur === reqIdRef.current) setLoading(false);
    }
  }, [currentPage, dateRangeError, filterValues._search, warehouseIdFromName, filterValues.fromNgay, filterValues.toNgay, filterValues.maPhieuNhap, filterValues.tenNhanVien, filterValues.nguoiDeNghi, filterValues.boPhan, filterValues.tinhTrang, filterValues.daIn, filterValues.isVoided, sortKey, sortDir, month, year]);

  /** Stock figures live in React Query; invalidating is enough to refresh them. */
  const refreshInventoryCaches = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: warehouseKeys.lists() });
    queryClient.invalidateQueries({ queryKey: warehouseKeys.lotProducts() });
    queryClient.invalidateQueries({ queryKey: warehouseKeys.receiptHistories() });
  }, [queryClient]);

  useEffect(() => {
    fetchReceipts();
  }, [fetchReceipts]);

  // Reset page when search/filter/sort changes (like InboundPlanTab)
  useEffect(() => {
    setCurrentPage(1);
  }, [filterValues._search, filterValues.warehouseId, filterValues.fromNgay, filterValues.toNgay, filterValues.maPhieuNhap, filterValues.tenNhanVien, filterValues.nguoiDeNghi, filterValues.boPhan, filterValues.tinhTrang, filterValues.daIn, filterValues.isVoided, sortKey, sortDir, month, year]);
  const handleDelete = async (lyDo: string) => {
    if (!deleteTarget) return;
    const deletedId = deleteTarget.id;
    const wasDetail = selectedReceipt?.id === deletedId;
    setDeleting(true);
    try {
      await warehouseReceiptService.deleteWarehouseReceipt(deletedId, { lyDo });
      toast.success('Xóa phiếu nhập kho thành công!');
      setDeleteTarget(null);
      if (wasDetail) closeDetail();
      fetchReceipts();
      refreshInventoryCaches();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Lỗi khi xóa phiếu nhập kho');
    } finally {
      setDeleting(false);
    }
  };
  const handleVoid = async (reason: string) => {
    if (!voidTarget) return;
    const targetId = voidTarget.id;
    setVoiding(true);
    try {
      const res: any = await warehouseReceiptService.voidWarehouseReceipt(targetId, { voidReason: reason });
      const updated = res?.data?.data ?? res?.data ?? null;
      toast.success('Đã vô hiệu phiếu nhập');
      setVoidTarget(null);
      if (selectedReceipt?.id === targetId && updated) setSelectedReceipt(updated as WarehouseReceipt);
      else if (selectedReceipt?.id === targetId) setSelectedReceipt((prev) => prev ? ({ ...prev, isVoided: true, voidReason: reason } as any) : prev);
      fetchReceipts();
      refreshInventoryCaches();
    } catch (e: any) { toast.error(e.response?.data?.message || 'Lỗi khi vô hiệu phiếu'); } finally { setVoiding(false); }
  };
  const handleUnvoid = async (id: string) => {
    if (unvoidingId) return;
    setUnvoidingId(id);
    try {
      const res: any = await warehouseReceiptService.unvoidWarehouseReceipt(id);
      const updated = res?.data?.data ?? res?.data ?? null;
      toast.success('Đã khôi phục phiếu');
      if (selectedReceipt?.id === id && updated) setSelectedReceipt(updated as WarehouseReceipt);
      else if (selectedReceipt?.id === id) setSelectedReceipt((prev) => prev ? ({ ...prev, isVoided: false, voidReason: null } as any) : prev);
      fetchReceipts(); refreshInventoryCaches();
    } catch (e: any) { toast.error(e.response?.data?.message || 'Lỗi khi khôi phục'); } finally { setUnvoidingId(null); }
  };

  // Server handles maPhieu/tenNhanVien/nguoiDeNghi/boPhan/tinhTrang/daIn — only month/year remains client-side.
  const refinedReceipts = useMemo(() => {
    if (!month && !year) return receipts;
    return receipts.filter((r) => {
      const date = new Date(r.ngayNhap);
      if (month && (date.getMonth() + 1) !== month) return false;
      if (year && date.getFullYear() !== year) return false;
      return true;
    });
  }, [receipts, month, year]);

  // Server already sorts/paginates; refinedReceipts is the display set for this page.
  const displayReceipts = refinedReceipts;

  // Sync selected detail when list refreshes (avoid stale detail after edit/void outside modal)
  useEffect(() => {
    if (!selectedReceipt) return;
    const fresh = receipts.find((r) => r.id === selectedReceipt.id);
    if (fresh) {
      const a = fresh.updatedAt ? new Date(fresh.updatedAt).getTime() : 0;
      const b = selectedReceipt.updatedAt ? new Date(selectedReceipt.updatedAt).getTime() : 0;
      if (a > b) setSelectedReceipt(fresh);
    }
  }, [receipts]);
  const selectedReceiptLines = selectedReceipt ? getWarehouseSlipLines(selectedReceipt) : [];

  useEffect(() => {
    setCurrentPage((page) => Math.min(Math.max(1, page), Math.max(1, totalPages)));
  }, [totalPages]);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Phiếu nhập kho</h2>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2 w-full sm:w-auto"
        >
          <Plus className="h-5 w-5" />
          Tạo phiếu nhập
        </button>
      </div>

      <TableFilter
        filters={receiptFilterFields}
        values={filterValues}
        onChange={(vals) => { setFilterValues(vals); setCurrentPage(1); }}
        searchPlaceholder="Tìm mã kiện, tên hàng, mã phiếu, nhân viên..."
        dateRangeInvalid={dateRangeError}
      />

      <div className="flex flex-wrap items-center gap-2 mb-3">
        <span className="text-xs text-gray-400">{total} phiếu — bấm tiêu đề Mã phiếu / Ngày nhập để sắp xếp</span>
        <button type="button" onClick={() => setShowBulkConfirm(true)} disabled={displayReceipts.length === 0} className="ml-auto px-3 py-1.5 min-h-[32px] text-xs border border-blue-300 text-blue-700 rounded hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed">Xuất tổng hợp (trang hiện tại)</button>
      </div>

      {loadError && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          <span>{loadError}</span>
          <button type="button" onClick={fetchReceipts} disabled={loading} className="rounded-md border border-red-300 px-3 py-1.5 font-medium hover:bg-red-100 disabled:opacity-50">
            {loading ? 'Đang tải...' : 'Thử lại'}
          </button>
        </div>
      )}
      {loading && receipts.length === 0 && <p className="mb-4 text-sm text-gray-500">Đang tải danh sách phiếu nhập kho...</p>}

      {/* Receipts Table — desktop */}
      <div className="hidden md:block bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full min-w-[1050px] border-collapse">
          <thead>
            <tr className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-300">
          <th scope="col" aria-sort={sortKey==='maPhieuNhap' ? (sortDir==='asc'?'ascending':'descending') : 'none'} className="px-4 py-3 text-left text-sm font-semibold text-gray-900 border-r border-gray-200"><button type="button" aria-label="Sắp xếp theo mã phiếu" onClick={()=>{ if(sortKey==='maPhieuNhap') setSortDir(d=>d==='asc'?'desc':'asc'); else {setSortKey('maPhieuNhap'); setSortDir('desc');} }} className="inline-flex items-center gap-1 hover:text-gray-700">Mã phiếu {sortKey==='maPhieuNhap' ? (sortDir==='asc' ? '↑' : '↓') : ''}</button></th>
              <th scope="col" aria-sort={sortKey==='ngayNhap' ? (sortDir==='asc'?'ascending':'descending') : 'none'} className="px-4 py-3 text-left text-sm font-semibold text-gray-900 border-r border-gray-200"><button type="button" aria-label="Sắp xếp theo ngày nhập" onClick={()=>{ if(sortKey==='ngayNhap') setSortDir(d=>d==='asc'?'desc':'asc'); else {setSortKey('ngayNhap'); setSortDir('desc');} }} className="inline-flex items-center gap-1 hover:text-gray-700">Ngày nhập {sortKey==='ngayNhap' ? (sortDir==='asc' ? '↑' : '↓') : ''}</button></th>
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
            {displayReceipts.length === 0 ? (
              (()=>{ const hasActiveFilter = !!(filterValues._search||filterValues.maPhieuNhap||filterValues.tenNhanVien||filterValues.nguoiDeNghi||filterValues.boPhan||filterValues.warehouseId||filterValues.tinhTrang||filterValues.daIn||filterValues.fromNgay||filterValues.toNgay); return (
              <tr>
                <td colSpan={10} className="px-6 py-4 text-center text-gray-500">
                  {hasActiveFilter ? (<span className="inline-flex items-center gap-2">Không khớp bộ lọc <button onClick={()=>setFilterValues({ _search:'',maPhieuNhap:'',tenNhanVien:'',nguoiDeNghi:'',boPhan:'',warehouseId:'',tinhTrang:'',daIn:'',isVoided:'',fromNgay:'',toNgay:'' })} className="px-2 py-1 text-xs border rounded hover:bg-gray-50">Xóa lọc</button></span>) : 'Chưa có phiếu nhập kho nào'}
                </td>
              </tr>
            );})()
            ) : (
              displayReceipts.map((receipt, receiptIndex) => {
                const lines = getWarehouseSlipLines(receipt);
                const slipBg = receiptIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50';
                const slipBorder = receiptIndex < displayReceipts.length - 1 ? 'border-b-2 border-gray-300' : '';
                return (
                  <React.Fragment key={receipt.id}>
                    {lines.map((line: any, lineIndex) => {
                      const isVoidedRow = (receipt as any).isVoided;
                      const isOver = line.soLuongYeuCau != null && line.soLuongThucTe != null && Math.abs(Number(line.soLuongYeuCau) - Number(line.soLuongThucTe)) > 1e-9;
                      const rowHl = isVoidedRow ? 'opacity-60 bg-gray-100' : isOver ? 'bg-amber-50 hover:bg-amber-100' : `${slipBg} hover:bg-blue-50`;
                      return (
                      <tr key={line.id ?? lineIndex} onClick={() => handleViewDetail(receipt)} className={`${rowHl} transition-colors cursor-pointer`}>
                        {lineIndex === 0 && (
                          <td rowSpan={lines.length} className={`px-4 py-3 whitespace-nowrap align-top text-sm font-medium text-gray-900 border-r border-gray-200 ${slipBorder}`}>
                            {receipt.maPhieuNhap}{(receipt as any).isVoided && <span className="ml-2 inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">Đã vô hiệu</span>}
                            {lines.length > 1 && (
                              <span className="ml-1 text-xs font-normal text-gray-400">({lines.length} dòng)</span>
                            )}
                          </td>
                        )}
                        {lineIndex === 0 && (
                          <td rowSpan={lines.length} className={`px-4 py-3 whitespace-nowrap align-top text-sm text-gray-500 border-r border-gray-200 ${slipBorder}`}>
                            {new Date(receipt.ngayNhap).toLocaleDateString('vi-VN')}
                          </td>
                        )}
                        {lineIndex === 0 && (
                          <td rowSpan={lines.length} className={`px-4 py-3 whitespace-nowrap align-top text-sm text-gray-500 border-r border-gray-200 ${slipBorder}`}>
                            {receipt.tenNhanVien}
                          </td>
                        )}
                        {lineIndex === 0 && (
                          <td rowSpan={lines.length} className={`px-4 py-3 whitespace-nowrap align-top text-sm text-gray-500 border-r border-gray-200 ${slipBorder}`}>
                            {(receipt as any).nguoiDeNghi || '—'}
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
                          {isOver && (
                            <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700" title={`KH ${line.soLuongYeuCau} → TT ${line.soLuongThucTe}`}>⚠ KH {line.soLuongYeuCau} → TT {line.soLuongThucTe}</span>
                          )}
                        </td>
                        {lineIndex === 0 && (
                          <td rowSpan={lines.length} className={`px-4 py-3 whitespace-nowrap align-top text-sm text-gray-500 ${slipBorder}`}>
                            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => handleViewDetail(receipt)}
                                aria-label="Xem chi tiết"
                                className="inline-flex items-center justify-center min-h-[32px] min-w-[32px] p-1.5 text-blue-600 hover:bg-blue-100 rounded-md transition-colors"
                                title="Xem chi tiết"
                              >
                                <Eye className="w-5 h-5" />
                              </button>
                              <button
                                onClick={() => { setPrintReceipt(receipt); setShowPrintView(true); }}
                                aria-label="In phiếu"
                                disabled={(receipt as any).isVoided}
                                className="inline-flex items-center justify-center min-h-[32px] min-w-[32px] p-1.5 text-green-600 hover:bg-green-100 rounded-md transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                title={(receipt as any).isVoided ? 'Phiếu đã vô hiệu — không thể in' : 'In phiếu'}
                              >
                                <Printer className="w-5 h-5" />
                              </button>
                              <button
                                onClick={async () => { try { await warehouseReceiptService.exportXlsx(receipt.id); } catch (e: any) { toast.error(e.message || 'Lỗi xuất Excel'); } }}
                                aria-label="Xuất Excel"
                                disabled={(receipt as any).isVoided}
                                className="inline-flex items-center justify-center min-h-[32px] min-w-[32px] p-1.5 text-blue-600 hover:bg-blue-100 rounded-md transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                title={(receipt as any).isVoided ? 'Phiếu đã vô hiệu' : 'Xuất Excel (BM01)'}
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" /></svg>
                              </button>
                              {(receipt as any).daIn && (
                                <span className="ml-1 inline-flex items-center rounded-full bg-green-100 px-2 py-1 text-xs text-green-700" title="Đã in/xuất">Đã in</span>
                              )}
                              {(receipt as any).isVoided ? (
                                <button onClick={() => handleUnvoid(receipt.id)} disabled={unvoidingId === receipt.id} className="inline-flex items-center justify-center min-h-[32px] min-w-[32px] p-1.5 text-green-600 hover:bg-green-100 rounded-md transition-colors disabled:opacity-50" title="Khôi phục"><RotateCcw className="w-5 h-5" /></button>
                              ) : (
                                <button onClick={() => setVoidTarget(receipt)} disabled={receipt.isLocked} className="inline-flex items-center justify-center min-h-[32px] min-w-[32px] p-1.5 text-red-600 hover:bg-red-100 rounded-md transition-colors disabled:opacity-30 disabled:cursor-not-allowed" title={receipt.isLocked ? 'Phiếu đã khóa — không thể vô hiệu' : 'Vô hiệu hóa'}><Ban className="w-5 h-5" /></button>
                              )}
                              {!receipt.isLocked && !((receipt as any).isVoided) && (
                                <>
                                  <button
                                    onClick={() => setEditingReceipt(receipt)}
                                    aria-label="Chỉnh sửa"
                                    className="inline-flex items-center justify-center min-h-[32px] min-w-[32px] p-1.5 text-amber-600 hover:bg-amber-100 rounded-md transition-colors"
                                    title="Chỉnh sửa"
                                  >
                                    <Pencil className="w-5 h-5" />
                                  </button>
                                  <button
                                    onClick={() => setDeleteTarget(receipt)}
                                    aria-label="Xóa"
                                    className="inline-flex items-center justify-center min-h-[32px] min-w-[32px] p-1.5 text-red-600 hover:bg-red-100 rounded-md transition-colors"
                                    title="Xóa"
                                  >
                                    <Trash2 className="w-5 h-5" />
                                  </button>
                                </>
                              )}
                              {receipt.isLocked && (
                                <span className="ml-1 inline-flex items-center rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-600" title="Phiếu đã khóa, không thể chỉnh sửa hoặc xóa">
                                  Đã khóa
                                </span>
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

      {/* Mobile: one card per slip — horizontal 10-col table is unusable on phones */}
      <div className="md:hidden space-y-3">
        {displayReceipts.length === 0 ? (
          (()=>{ const hasF2=!!(filterValues._search||filterValues.maPhieuNhap||filterValues.tenNhanVien||filterValues.nguoiDeNghi||filterValues.boPhan||filterValues.warehouseId||filterValues.tinhTrang||filterValues.daIn||filterValues.fromNgay||filterValues.toNgay); return hasF2 ? (<div className="flex flex-col items-center gap-2 rounded-lg border border-dashed bg-white px-4 py-6 text-center text-sm text-gray-500">Không khớp bộ lọc <button onClick={()=>setFilterValues({ _search:'',maPhieuNhap:'',tenNhanVien:'',nguoiDeNghi:'',boPhan:'',warehouseId:'',tinhTrang:'',daIn:'',isVoided:'',fromNgay:'',toNgay:'' })} className="px-3 py-1.5 text-xs border rounded hover:bg-gray-50">Xóa lọc</button></div>) : (<div className="rounded-lg border border-gray-200 bg-white px-4 py-6 text-center text-sm text-gray-500">Chưa có phiếu nhập kho nào</div>);})()
        ) : (
          displayReceipts.map((receipt) => {
            const lines = getWarehouseSlipLines(receipt);
            return (
              <div key={receipt.id} onClick={() => handleViewDetail(receipt)} className={`rounded-lg border p-3 shadow-sm cursor-pointer ${(receipt as any).isVoided ? "opacity-60 bg-gray-50 border-red-200" : "border-gray-200 bg-white"}`}>
                <div className="flex items-start justify-between gap-2">
                  <span className="font-mono text-sm font-semibold text-gray-900">{receipt.maPhieuNhap}{(receipt as any).isVoided && <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700">Đã vô hiệu</span>}{lines.length > 1 && <span className="ml-1 text-xs font-normal text-gray-400">· {lines.length} dòng</span>}</span>
                  {receipt.isLocked ? <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">Đã khóa</span> : (receipt as any).daIn ? <span className="shrink-0 rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">Đã in</span> : null}
                </div>
                <div className="mt-1 text-xs text-gray-500">{new Date(receipt.ngayNhap).toLocaleDateString('vi-VN')} · {receipt.tenNhanVien}{(receipt as any).nguoiDeNghi ? ` · ${(receipt as any).nguoiDeNghi}` : ''}</div>
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
                  <button onClick={() => handleViewDetail(receipt)} className="rounded border border-blue-200 px-2.5 py-1 text-xs text-blue-700">Chi tiết</button>
                  <button onClick={() => { setPrintReceipt(receipt); setShowPrintView(true); }} disabled={(receipt as any).isVoided} className="rounded border border-green-200 px-2.5 py-1 text-xs text-green-700 disabled:opacity-30 disabled:cursor-not-allowed" title={(receipt as any).isVoided ? 'Phiếu đã vô hiệu — không thể in' : 'In'}>In</button>
                  <button onClick={async () => { try { await warehouseReceiptService.exportXlsx(receipt.id); } catch (e: any) { toast.error(e.message || 'Lỗi xuất Excel'); } }} disabled={(receipt as any).isVoided} className="rounded border border-blue-200 px-2.5 py-1 text-xs text-blue-700 disabled:opacity-30 disabled:cursor-not-allowed" title={(receipt as any).isVoided ? 'Phiếu đã vô hiệu' : 'Excel'}>Excel</button>
                  {(receipt as any).isVoided ? <button onClick={() => handleUnvoid(receipt.id)} disabled={unvoidingId === receipt.id} className="inline-flex items-center gap-1 rounded border border-green-200 px-2.5 py-1 text-xs text-green-700 disabled:opacity-50"><RotateCcw className="w-3.5 h-3.5" /> Khôi phục</button> : <button onClick={() => setVoidTarget(receipt)} disabled={receipt.isLocked} className="inline-flex items-center gap-1 rounded border border-red-200 px-2.5 py-1 text-xs text-red-700 disabled:opacity-30 disabled:cursor-not-allowed" title={receipt.isLocked ? 'Phiếu đã khóa' : undefined}><Ban className="w-3.5 h-3.5" /> Vô hiệu</button>}
                  {!receipt.isLocked && !((receipt as any).isVoided) && (
                    <>
                      <button onClick={() => setEditingReceipt(receipt)} className="rounded border border-amber-200 px-2.5 py-1 text-xs text-amber-700">Sửa</button>
                      <button onClick={() => setDeleteTarget(receipt)} className="rounded border border-red-200 px-2.5 py-1 text-xs text-red-700">Xóa</button>
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {totalPages > 1 && (
        <nav aria-label="Phân trang phiếu nhập" className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-4 px-2">
          <span className="text-sm text-gray-600">
            Hiển thị {(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, total)} / {total} mục
          </span>
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            <button
              type="button"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 min-h-[32px] text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Trước
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(page => page === 1 || page === totalPages || Math.abs(page - currentPage) <= 2)
              .map((page, idx, arr) => (
                <React.Fragment key={page}>
                  {idx > 0 && arr[idx - 1] !== page - 1 && <span className="px-1 text-gray-400">...</span>}
                  <button
                    type="button"
                    aria-current={page === currentPage ? 'page' : undefined}
                    aria-label={`Trang ${page}`}
                    onClick={() => setCurrentPage(page)}
                    className={`px-3 py-1.5 min-h-[32px] min-w-[32px] text-sm rounded-md ${
                      page === currentPage ? 'bg-blue-600 text-white' : 'border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {page}
                  </button>
                </React.Fragment>
              ))}
            <button
              type="button"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 min-h-[32px] text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Sau
            </button>
          </div>
        </nav>
      )}

      {/* Detail Modal — deep-linked via ?receiptId= */}
      <Modal isOpen={showDetailModal && !!selectedReceipt} onClose={closeDetail} showBackdrop closeOnBackdrop={true}>
        <div className="bg-white rounded-lg shadow-xl w-[calc(100vw-1rem)] sm:max-w-[1100px] flex flex-col modal-viewport-h" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between border-b px-6 py-4 shrink-0">
              <h2 className="text-xl font-bold text-gray-900">Chi tiết phiếu nhập kho</h2>
              <button
                type="button"
                aria-label="Đóng chi tiết phiếu nhập"
                onClick={closeDetail}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          <div className="overflow-y-auto flex-1 p-6">
            {selectedReceipt && (<>

            {(selectedReceipt as any).isVoided && (
              <div className="mb-3 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
                <div className="font-semibold">Đã vô hiệu</div>
                <div>Lý do: {(selectedReceipt as any).voidReason || '—'}</div>
                <div className="text-xs text-red-600">{(selectedReceipt as any).voidedAt ? new Date((selectedReceipt as any).voidedAt).toLocaleString('vi-VN') : ''} {(selectedReceipt as any).voidedByName ? `· ${(selectedReceipt as any).voidedByName}` : (selectedReceipt as any).voidedBy ? `· ${(selectedReceipt as any).voidedBy}` : ''}</div>
              </div>
            )}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-2 text-blue-800 font-semibold text-lg">
                <FileText className="h-5 w-5" />
                {selectedReceipt.maPhieuNhap}{(selectedReceipt as any).isVoided && <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700">Đã vô hiệu</span>}
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <label className="text-xs text-gray-500 uppercase font-medium">Ngày nhập</label>
                  <p className="text-sm font-semibold text-gray-900 mt-1">
                    {new Date(selectedReceipt.ngayNhap).toLocaleDateString('vi-VN', {
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
                  <p className="text-sm font-semibold text-gray-900 mt-1">{selectedReceipt.tenNhanVien}</p>
                  <p className="text-xs text-gray-500">{selectedReceipt.maNhanVien}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <label className="text-xs text-gray-500 uppercase font-medium">Người đề nghị</label>
                  <p className="text-sm font-semibold text-gray-900 mt-1">{(selectedReceipt as any).nguoiDeNghi || '—'}</p>
                  {(selectedReceipt as any).boPhan && <p className="text-xs text-gray-500">{(selectedReceipt as any).boPhan}</p>}
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <label className="text-xs text-gray-500 uppercase font-medium">Bộ phận</label>
                  <p className="text-sm font-semibold text-gray-900 mt-1">{(selectedReceipt as any).boPhan || '—'}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <label className="text-xs text-gray-500 uppercase font-medium">Kho</label>
                  <p className="text-sm font-semibold text-gray-900 mt-1">
                    {[...new Set(selectedReceiptLines.map((item: any) => (item.maKho || item.tenKho)).filter(Boolean))].join(', ') || '-'}
                  </p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <label className="text-xs text-gray-500 uppercase font-medium">Lô hàng</label>
                  <p className="text-sm font-semibold text-gray-900 mt-1">
                    {[...new Set(selectedReceiptLines.map((item) => item.tenLo).filter(Boolean))].join(', ') || '-'}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4">
                <div className="bg-purple-50 border border-purple-200 p-3 rounded-lg">
                  <label className="text-xs text-purple-600 uppercase font-medium">Mục đích</label>
                  <p className="text-sm text-gray-700 mt-1">{(selectedReceipt as any).mucDich || '—'}</p>
                </div>
              </div>

                    {selectedReceiptLines.length > 0 ? (
                <div className="bg-gray-50 p-3 rounded-lg">
                  <label className="text-xs text-gray-500 uppercase font-medium mb-2 block">
                    Chi tiết hàng hóa ({selectedReceiptLines.length} dòng) — 14 cột BM01
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
                        {selectedReceiptLines.map((item: any, idx) => (
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
                            <td className="px-2 py-1.5 border text-right font-semibold text-green-600">{item.soLuongThucTe} {item.donViTinh || ''}</td>
                            <td className="px-2 py-1.5 border">{item.ghiChu || '-'}</td>
                            <td className="px-2 py-1.5 border text-right">{item.soLuongTruoc ?? '-'}</td>
                            <td className="px-2 py-1.5 border text-right">{item.soLuongSau ?? '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-gray-100 font-semibold">
                          <td colSpan={12} className="px-2 py-1.5 border text-right">Tổng cộng (SL TT):</td>
                          <td className="px-2 py-1.5 border text-right text-green-700">
                            {formatActualTotalByUnit(selectedReceiptLines)}
                          </td>
                          <td colSpan={3} className="px-2 py-1.5 border"></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                  {/* Mobile: card per line — 16-column table is unreadable on phones */}
                  <div className="md:hidden mt-3 space-y-3">
                    {selectedReceiptLines.map((item: any, idx) => (
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
                          <dt className="text-gray-500">SL TT</dt><dd className="text-right font-semibold text-green-600">{item.soLuongThucTe} {item.donViTinh || ''}</dd>
                          <dt className="text-gray-500">Tồn trước</dt><dd className="text-right">{item.soLuongTruoc ?? '-'}</dd>
                          <dt className="text-gray-500">Tồn sau</dt><dd className="text-right">{item.soLuongSau ?? '-'}</dd>
                        </dl>
                        {item.ghiChu && <div className="mt-2 text-xs text-gray-600"><span className="text-gray-500">Ghi chú:</span> {item.ghiChu}</div>}
                      </div>
                    ))}
                    <div className="rounded-lg bg-gray-100 px-3 py-2 text-right text-sm font-semibold text-green-700">Tổng cộng (SL TT): {formatActualTotalByUnit(selectedReceiptLines)}</div>
                  </div>
                </div>
              ) : (
                <div className="bg-gray-50 p-3 rounded-lg">
                  <label className="text-xs text-gray-500 uppercase font-medium">Hàng hóa</label>
                  <p className="text-sm font-semibold text-gray-900 mt-1">{selectedReceipt.tenSanPham ?? 'N/A'}</p>
                </div>
              )}

              {selectedReceipt.ghiChu && (
                <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg">
                  <label className="text-xs text-yellow-600 uppercase font-medium">Ghi chú phiếu</label>
                  <p className="text-sm text-gray-700 mt-1">{selectedReceipt.ghiChu}</p>
                </div>
              )}

              {(() => {
                const lyDo = (selectedReceipt as any).lyDoChenhLech ?? selectedReceipt.inboundPlan?.lyDoChenhLech ?? null;
                const hasLyDo = !!(lyDo && String(lyDo).trim());
                const hasDiff = (selectedReceipt.items ?? []).some((it: any) => it.soLuongYeuCau != null && Math.abs(Number(it.soLuongYeuCau) - Number(it.soLuongThucTe)) > 1e-9);
                if (!hasLyDo && !hasDiff) return null;
                return (
                  <div className={`p-3 rounded-lg border ${hasLyDo ? 'bg-amber-50 border-amber-300' : 'bg-red-50 border-red-200'}`}>
                    <label className={`text-xs uppercase font-medium ${hasLyDo ? 'text-amber-700' : 'text-red-600'}`}>Lý do chênh lệch {hasDiff ? '(thực tế khác kế hoạch)' : ''}</label>
                    <p className={`text-sm mt-1 ${hasLyDo ? 'text-gray-800' : 'text-red-700 italic'}`}>{hasLyDo ? String(lyDo) : 'Chưa ghi lý do — thực tế khác kế hoạch nhưng không có lý do chênh lệch.'}</p>
                  </div>
                );
              })()}

              {(selectedReceipt as any).daIn && (
                <div className="bg-green-50 border border-green-200 p-3 rounded-lg flex flex-wrap items-center gap-4 text-sm">
                  <span><span className="text-xs text-gray-500 uppercase font-medium">Người lập phiếu:</span> <span className="font-semibold text-gray-900 ml-1">{selectedReceipt.tenNhanVien}</span></span>
                  <span><span className="text-xs text-gray-500 uppercase font-medium">Ngày in (in lần đầu):</span> <span className="font-semibold text-gray-900 ml-1">{(selectedReceipt as any).inLanDauAt ? new Date((selectedReceipt as any).inLanDauAt).toLocaleString('vi-VN') : '—'}</span></span>
                  <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">Đã in</span>
                </div>
              )}

              <div className="text-xs text-gray-400 text-right">
                Tạo lúc: {new Date(selectedReceipt.createdAt).toLocaleString('vi-VN')}
              </div>
            </div>

            <div className="flex flex-wrap justify-end gap-2 mt-6">
              {(selectedReceipt as any).isVoided ? (
                <button
                  onClick={() => { if (selectedReceipt) handleUnvoid(selectedReceipt.id); }}
                  disabled={unvoidingId === selectedReceipt?.id}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 inline-flex items-center gap-1.5"
                >
                  <RotateCcw className="w-4 h-4" /> Khôi phục
                </button>
              ) : (
                <button
                  onClick={() => { if (selectedReceipt) setVoidTarget(selectedReceipt); }}
                  disabled={!!selectedReceipt?.isLocked}
                  title={selectedReceipt?.isLocked ? 'Phiếu đã khóa — không thể vô hiệu' : undefined}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
                >
                  <Ban className="w-4 h-4" /> Vô hiệu
                </button>
              )}
              {!selectedReceipt?.isLocked && !(selectedReceipt as any)?.isVoided && (
                <>
                  <button
                    onClick={() => { if (selectedReceipt) setEditingReceipt(selectedReceipt); }}
                    className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 inline-flex items-center gap-1.5"
                  >
                    <Pencil className="w-4 h-4" /> Sửa
                  </button>
                  <button
                    onClick={() => { if (selectedReceipt) setDeleteTarget(selectedReceipt); }}
                    className="px-4 py-2 bg-red-50 text-red-700 border border-red-200 rounded-lg hover:bg-red-100 inline-flex items-center gap-1.5"
                  >
                    <Trash2 className="w-4 h-4" /> Xóa
                  </button>
                </>
              )}
              <button
                onClick={() => { setPrintReceipt(selectedReceipt); setShowPrintView(true); }}
                disabled={(selectedReceipt as any)?.isVoided}
                title={(selectedReceipt as any)?.isVoided ? 'Phiếu đã vô hiệu — không thể in' : undefined}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                In phiếu
              </button>
              <button
                onClick={async () => { try { await warehouseReceiptService.exportXlsx(selectedReceipt!.id); } catch (e: any) { toast.error(e.message || 'Lỗi xuất Excel'); } }}
                disabled={(selectedReceipt as any)?.isVoided}
                title={(selectedReceipt as any)?.isVoided ? 'Phiếu đã vô hiệu' : undefined}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Xuất Excel
              </button>
              <button
                onClick={closeDetail}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Đóng
              </button>
            </div>
            </>)}
          </div>
        </div>
      </Modal>

      {/* Create receipt uses the standalone multi-line modal. */}
      <CreateWarehouseReceiptModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSuccess={() => {
          fetchReceipts();
          refreshInventoryCaches();
        }}
      />

      {showPrintView && printReceipt && (
        <WarehouseSlipPrintView
          type="receipt"
          maPhieu={printReceipt.maPhieuNhap}
          ngay={new Date(printReceipt.ngayNhap).toLocaleDateString('vi-VN')}
          tenNhanVien={printReceipt.tenNhanVien}
          maNhanVien={printReceipt.maNhanVien}
          ghiChu={printReceipt.ghiChu ?? undefined}
          mucDich={(printReceipt as any).mucDich ?? undefined}
          lyDoChenhLech={(printReceipt as any).lyDoChenhLech ?? printReceipt.inboundPlan?.lyDoChenhLech ?? undefined}
          nguoiDeNghi={(printReceipt as any).nguoiDeNghi ?? undefined}
          boPhan={(printReceipt as any).boPhan ?? undefined}
          isVoided={(printReceipt as any).isVoided}
          voidReason={(printReceipt as any).voidReason}
          items={getWarehouseSlipLines(printReceipt)}
          onClose={() => { setShowPrintView(false); setPrintReceipt(null); }}
          onMarkPrinted={() => { warehouseReceiptService.markPrinted(printReceipt.id).catch(()=>{}); }}
        />
      )}

      <EditWarehouseReceiptModal
        isOpen={!!editingReceipt}
        receipt={editingReceipt}
        onClose={() => setEditingReceipt(null)}
        onSuccess={async (updated?: WarehouseReceipt) => {
          const editedId = editingReceipt?.id ?? null;
          if (editedId && selectedReceipt?.id === editedId) {
            if (updated?.id) {
              setSelectedReceipt(updated);
            } else {
              try {
                const seq = ++detailSeqRef.current;
                const res = await warehouseReceiptService.getWarehouseReceiptById(editedId) as any;
                const fresh = res?.data?.data ?? res?.data ?? res;
                if (seq === detailSeqRef.current && fresh?.id) setSelectedReceipt(fresh as WarehouseReceipt);
              } catch { /* keep optimistic selected */ }
            }
          }
          fetchReceipts();
          refreshInventoryCaches();
        }}
      />

      <CancelWithReasonModal
        isOpen={!!voidTarget}
        onClose={() => setVoidTarget(null)}
        onConfirm={handleVoid}
        ticketLabel={`phiếu nhập ${voidTarget?.maPhieuNhap ?? ''}`}
        description="Vô hiệu sẽ hoàn tác tồn kho của phiếu. Nhập lý do để tiếp tục."
        loading={voiding}
      />
      <CancelWithReasonModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        ticketLabel={`phiếu nhập ${deleteTarget?.maPhieuNhap ?? ''}`}
        description="Hành động này sẽ xóa phiếu và hoàn tác số tồn liên quan. Không thể hoàn tác."
        loading={deleting}
      />
      <Modal isOpen={showBulkConfirm} onClose={()=>setShowBulkConfirm(false)} ariaLabel="Xác nhận xuất tổng hợp">
        <div className="bg-white rounded-lg shadow-xl w-[calc(100vw-1rem)] max-w-md p-6" onClick={e=>e.stopPropagation()}>
          <h3 className="font-semibold text-gray-900 mb-2">Xuất tổng hợp {displayReceipts.length} phiếu?</h3>
          <p className="text-sm text-gray-600 mb-4">Tải Excel cho từng phiếu đang hiển thị (trang hiện tại).</p>
          <div className="flex justify-end gap-2">
            <button onClick={()=>setShowBulkConfirm(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm">Hủy</button>
            <button disabled={bulkExporting} onClick={async()=>{
              setBulkExporting(true);
              let ok=0,fail=0;
              for(const r of displayReceipts){ try{ await warehouseReceiptService.exportXlsx(r.id); ok++; } catch{ fail++; } }
              setBulkExporting(false); setShowBulkConfirm(false);
              if(fail>0) toast.error(`Xuất xong ${ok}/${displayReceipts.length} phiếu, ${fail} lỗi`);
              else toast.success(`Đã xuất ${ok} phiếu`);
            }} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">{bulkExporting?'Đang xuất...':'Xác nhận'}</button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default WarehouseReceiptTab;

