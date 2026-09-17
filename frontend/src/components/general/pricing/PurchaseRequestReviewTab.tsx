import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Eye, Check, XCircle } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { hasSubModuleAccess, can } from '../../../utils/permissions';
import purchaseRequestService from '../../../services/purchaseRequestService';
import apiClient from '../../../services/apiClient';
import { labelForPurchaseRequest } from '../../../utils/purchaseRequestLabel';
import TableFilter, { FilterField } from '../../TableFilter';
import Modal from '../../Modal';
import ConfirmDialog from '../../common/ConfirmDialog';
import { getPricingPriorityBadge as getPriorityBadge, getPricingStatusBadge as getStatusBadge } from './pricingBadge';

const PurchaseRequestReviewTab: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [filterValues, setFilterValues] = useState<Record<string, string>>({ _search: '', maYeuCau: '', tenNhanVien: '', mucDichYeuCau: '', mucDoUuTien: '' });
  const [sortKey, setSortKey] = useState<'tongTien' | 'ngayYeuCau' | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [detailId, setDetailId] = useState<string | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [approveId, setApproveId] = useState<string | null>(null);

  const canApprove = !!user && hasSubModuleAccess('general', 'pricing', (user as any).department, (user as any).subDepartment, (user as any).role, (user as any).secondaryDepartments);
  const canApprovePurchaseRequests = can('purchase-requests', 'APPROVE', (user as any)?.role);
  const canUpdatePurchaseRequests = can('purchase-requests', 'UPDATE', (user as any)?.role);

  const { data, isLoading } = useQuery({
    queryKey: ['purchase-requests', 'pricing-review', page, limit, filterValues._search, filterValues.maYeuCau, filterValues.tenNhanVien, filterValues.mucDichYeuCau, filterValues.mucDoUuTien],
    queryFn: async () => {
      const res: any = await (purchaseRequestService as any).getAllPurchaseRequests(page, limit, filterValues._search || filterValues.maYeuCau || undefined);
      return res;
    },
  });
  const raw: any = (data as any)?.data ?? data;
  const allRows: any[] = Array.isArray(raw) ? raw : (raw?.data ?? raw?.items ?? []);
  const search = (filterValues._search || '').toLowerCase().trim();
  const getTrangThai = (r: any): string => String(r.trangThai ?? r.status ?? '').trim();
  const getTongTien = (r: any): number => (r.items ?? []).reduce((s: number, it: any) => s + ((Number(it.giaDuKien) || 0) * (Number(it.soLuong) || 0)), 0);
  // Server pagination — getAllPurchaseRequests returns ApiResponse { data, pagination } so
  // the React Query `data` is that envelope. Handle both flat and nested shapes for safety.
  const serverPagination: { page: number; limit: number; total: number; totalPages: number } | null =
    (data as any)?.pagination ??
    (raw as any)?.pagination ??
    (data as any)?.data?.pagination ??
    null;
  const serverTotal: number | null = serverPagination?.total ?? null;
  const filtered = allRows.filter((r: any) => {
    if (search && !((r.maYeuCau ?? '').toLowerCase().includes(search) || (r.tenNhanVien ?? '').toLowerCase().includes(search) || (r.mucDichYeuCau ?? '').toLowerCase().includes(search))) return false;
    if (filterValues.maYeuCau && !(r.maYeuCau ?? '').toLowerCase().includes(filterValues.maYeuCau.toLowerCase())) return false;
    if (filterValues.tenNhanVien && !(r.tenNhanVien ?? '').toLowerCase().includes(filterValues.tenNhanVien.toLowerCase())) return false;
    if (filterValues.mucDichYeuCau && !(r.mucDichYeuCau ?? '').toLowerCase().includes(filterValues.mucDichYeuCau.toLowerCase())) return false;
    if (filterValues.mucDoUuTien && (r.mucDoUuTien ?? '') !== filterValues.mucDoUuTien) return false;
    return true;
  });
  const sorted = [...filtered].sort((a: any, b: any) => {
    if (!sortKey) return 0;
    if (sortKey === 'tongTien') {
      const ta = getTongTien(a);
      const tb = getTongTien(b);
      return sortDir === 'asc' ? ta - tb : tb - ta;
    }
    if (sortKey === 'ngayYeuCau') {
      const da = a.ngayYeuCau ? new Date(a.ngayYeuCau).getTime() : 0;
      const db = b.ngayYeuCau ? new Date(b.ngayYeuCau).getTime() : 0;
      return sortDir === 'asc' ? da - db : db - da;
    }
    return 0;
  });
  // Client-side search/mucDoUuTien filters run on the current server page only.
  // When any filter is active, fall back to filtered length as total (spec requirement);
  // otherwise use the server-side total so pagination reflects the full dataset.
  const hasActiveFilter = !!search || !!filterValues.maYeuCau || !!filterValues.tenNhanVien || !!filterValues.mucDichYeuCau || !!filterValues.mucDoUuTien;
  const clientTotal = sorted.length;
  const total = hasActiveFilter ? clientTotal : (serverTotal ?? clientTotal);
  const totalPages = hasActiveFilter
    ? (Math.ceil(clientTotal / limit) || 1)
    : ((serverPagination?.totalPages ?? Math.ceil(total / limit)) || 1);
  // Server already paginates when no client filter is active; only slice client-side when filtering.
  const pageRows = hasActiveFilter ? sorted.slice((page - 1) * limit, page * limit) : sorted;
  // Display range for footer: e.g. "Hiển thị 1–20 / 46 sản phẩm"
  const rangeFrom = total === 0 ? 0 : (hasActiveFilter ? (page - 1) * limit + 1 : (serverPagination ? (serverPagination.page - 1) * serverPagination.limit + 1 : (page - 1) * limit + 1));
  const rangeTo = hasActiveFilter ? Math.min(page * limit, total) : (serverPagination ? Math.min(serverPagination.page * serverPagination.limit, total) : Math.min(page * limit, total));

  const toggleSort = (key: 'tongTien' | 'ngayYeuCau') => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const sortIndicator = (key: 'tongTien' | 'ngayYeuCau') => {
    if (sortKey !== key) return '↕';
    return sortDir === 'asc' ? '▲' : '▼';
  };

  const handleExportFiltered = async () => {
    const exportRows = sorted;
    if (exportRows.length === 0) {
      toast.error('Không có dữ liệu để xuất');
      return;
    }
    // Try server-side export if search filter is active and service supports it
    // Fallback to client-side CSV for full filtered context (mucDoUuTien, sorting, etc.)
    const useServerExport = false; // keep client CSV to preserve mucDoUuTien + sort
    if (useServerExport && typeof (purchaseRequestService as any).exportToExcel === 'function') {
      try {
        await (purchaseRequestService as any).exportToExcel({ search: filterValues._search || filterValues.maYeuCau || undefined });
        toast.success('Đã xuất Excel');
        return;
      } catch {
        // fall through to client CSV
      }
    }
    try {
      const headers = ['STT', 'Mã yêu cầu', 'Ngày yêu cầu', 'Nhân viên', 'Sản phẩm', 'Tổng tiền', 'Ưu tiên', 'Trạng thái', 'Người duyệt', 'Ngày duyệt'];
      const csvRows = exportRows.map((r: any, idx: number) => {
        const items = r.items ?? [];
        const productNames = items.map((it: any) => it.tenHangHoa).filter(Boolean).join('; ');
        const tongTien = getTongTien(r);
        const ngayYeuCau = r.ngayYeuCau ? new Date(r.ngayYeuCau).toLocaleDateString('vi-VN') : '';
        const ngayDuyet = r.ngayDuyet ? new Date(r.ngayDuyet).toLocaleDateString('vi-VN') : '';
        const stt = (page - 1) * limit + idx + 1;
        return [
          stt,
          r.maYeuCau ?? '',
          ngayYeuCau,
          r.tenNhanVien ?? r.maNhanVien ?? '',
          productNames,
          tongTien,
          r.mucDoUuTien ?? '',
          r.trangThai ?? '',
          r.nguoiDuyet ?? '',
          ngayDuyet,
        ];
      });
      const allRowsCsv = [headers, ...csvRows];
      const csvContent = allRowsCsv.map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
      const blob = new Blob(['﻿' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `yeu-cau-mua-hang-dang-loc-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success(`Đã xuất ${exportRows.length} dòng (đang lọc) ra CSV`);
    } catch (e: any) {
      // Placeholder fallback: download filtered data as JSON if CSV fails
      try {
        const blob = new Blob([JSON.stringify(exportRows, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `yeu-cau-mua-hang-dang-loc-${Date.now()}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        toast.success('CSV lỗi, đã xuất JSON thay thế');
      } catch {
        toast.error(e?.message ?? 'Xuất file thất bại');
      }
    }
  };

  const filterFields: FilterField[] = [
    { key: 'maYeuCau', label: 'Mã YC', type: 'text' },
    { key: 'tenNhanVien', label: 'Nhân viên', type: 'text' },
    { key: 'mucDichYeuCau', label: 'Mục đích', type: 'text' },
    { key: 'mucDoUuTien', label: 'Ưu tiên', type: 'select', options: [{ value: 'Cao', label: 'Cao' }, { value: 'Trung bình', label: 'Trung bình' }, { value: 'Thấp', label: 'Thấp' }] },
  ];

  const doApprove = async (id: string) => {
    try {
      await apiClient.put(`/purchase-requests/${id}`, { trangThai: 'Đã duyệt' });
      toast.success('Đã duyệt yêu cầu mua hàng');
      queryClient.invalidateQueries({ queryKey: ['purchase-requests'] });
      queryClient.invalidateQueries({ queryKey: ['pricingOverview'] });
    } catch (err: any) { toast.error(err?.response?.data?.message ?? err.message ?? 'Duyệt thất bại'); }
  };
  const doReject = async (id: string, lyDo?: string) => {
    try {
      await apiClient.put(`/purchase-requests/${id}`, { trangThai: 'Từ chối', ...(lyDo ? { ghiChuMuaHang: lyDo } : {}) });
      toast.success('Đã từ chối yêu cầu');
      queryClient.invalidateQueries({ queryKey: ['purchase-requests'] });
      queryClient.invalidateQueries({ queryKey: ['pricingOverview'] });
    } catch (err: any) { toast.error(err?.response?.data?.message ?? err.message ?? 'Từ chối thất bại'); }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h2 className="text-lg font-semibold flex items-center gap-2">Duyệt mua hàng<span className="text-sm font-normal text-gray-500">({total})</span></h2>
        <button
          type="button"
          onClick={handleExportFiltered}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium bg-emerald-600 text-white rounded-md hover:bg-emerald-700 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          title="Xuất toàn bộ dòng đang lọc/sắp xếp (không phân trang) ra CSV — nếu lỗi sẽ fallback JSON"
        >
          Xuất Excel (đang lọc)
        </button>
      </div>

      <div className="flex flex-col gap-3">
        <TableFilter
          filters={filterFields}
          values={filterValues}
          onChange={(vals) => { setFilterValues(vals); setPage(1); }}
          searchPlaceholder="Tìm mã YC, nhân viên, mục đích..."
        />
      </div>

      {isLoading ? (
        <div className="bg-white rounded-lg shadow divide-y divide-gray-200 overflow-hidden"><div className="p-8 text-center text-sm text-gray-500">Đang tải...</div></div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">STT</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Mã yêu cầu</th>
                <th
                  className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer select-none hover:text-blue-600 hover:bg-gray-100"
                  onClick={() => toggleSort('ngayYeuCau')}
                  title="Nhấp để sắp xếp theo Ngày yêu cầu"
                >
                  Ngày yêu cầu <span className="inline-block ml-1 text-[10px]">{sortIndicator('ngayYeuCau')}</span>
                </th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Nhân viên</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Sản phẩm</th>
                <th
                  className="px-3 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer select-none hover:text-blue-600 hover:bg-gray-100"
                  onClick={() => toggleSort('tongTien')}
                  title="Nhấp để sắp xếp theo Tổng tiền"
                >
                  Tổng tiền <span className="inline-block ml-1 text-[10px]">{sortIndicator('tongTien')}</span>
                </th>
                <th className="px-3 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Ưu tiên</th>
                <th className="px-3 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Trạng thái</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Người duyệt</th>
                <th className="px-3 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Hành động</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {pageRows.length === 0 ? (
                <tr><td colSpan={10} className="px-4 py-8 text-center text-sm text-gray-500">Không có yêu cầu</td></tr>
              ) : pageRows.map((r: any, idx: number) => {
                const items = r.items ?? [];
                const productNames = items.map((it: any) => it.tenHangHoa).filter(Boolean) as string[];
                const productDisplay = productNames.length <= 3 ? productNames.join(', ') : `${productNames.slice(0, 3).join(', ')}...`;
                const totalAmount = items.reduce((s: number, it: any) => s + ((Number(it.giaDuKien) || 0) * (Number(it.soLuong) || 0)), 0);
                const st = getTrangThai(r);
                const isPending = st === 'Chờ duyệt';
                const stt = (page - 1) * limit + idx + 1;
                return (
                <tr
                  key={r.id}
                  onClick={() => setDetailId(r.id)}
                  className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 cursor-pointer transition-colors`}
                >
                  <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-600">{stt}</td>
                  <td className="px-3 py-3 whitespace-nowrap text-sm font-medium text-blue-600">{r.maYeuCau}</td>
                  <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-600">{r.ngayYeuCau ? new Date(r.ngayYeuCau).toLocaleDateString('vi-VN') : '—'}</td>
                  <td className="px-3 py-3 whitespace-nowrap text-sm">{r.tenNhanVien ?? r.maNhanVien ?? '—'}</td>
                  <td className="px-3 py-3 text-sm max-w-[220px] truncate" title={productNames.join(', ')}>{productDisplay || '—'}</td>
                  <td className="px-3 py-3 whitespace-nowrap text-sm text-right font-medium">{totalAmount > 0 ? `${totalAmount.toLocaleString('vi-VN')}đ` : '—'}</td>
                  <td className="px-3 py-3 whitespace-nowrap text-center">
                    {(() => { const b = getPriorityBadge(String(r.mucDoUuTien ?? '')); return <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${b.class}`}>{r.mucDoUuTien ? b.label : '—'}</span>; })()}
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap text-center">
                    {(() => { const b = getStatusBadge(String(r.trangThai ?? '')); return <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${b.class}`}>{b.label}</span>; })()}
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-600">{r.nguoiDuyet || '—'}</td>
                  <td className="px-3 py-3 text-center whitespace-nowrap" onClick={e => e.stopPropagation()}>
                    <div className="inline-flex items-center gap-1">
                      <button
                        onClick={() => setDetailId(r.id)}
                        className="p-1.5 rounded-md text-blue-600 hover:bg-blue-100"
                        title="Xem chi tiết"
                        aria-label="Xem chi tiết"
                      >
                        <Eye size={16} />
                      </button>
                      {isPending ? (
                        canApprove ? (
                          <>
                            <button
                              onClick={() => setApproveId(r.id)}
                              disabled={!canApprovePurchaseRequests}
                              title={!canApprovePurchaseRequests ? 'Bạn không có quyền duyệt' : 'Duyệt'}
                              aria-label="Duyệt"
                              className="p-1.5 rounded-md text-green-600 hover:bg-green-100 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <Check size={16} />
                            </button>
                            <button
                              onClick={() => setRejectId(r.id)}
                              disabled={!canUpdatePurchaseRequests}
                              title={!canUpdatePurchaseRequests ? 'Bạn không có quyền duyệt' : 'Từ chối'}
                              aria-label="Từ chối"
                              className="p-1.5 rounded-md text-red-600 hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <XCircle size={16} />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              disabled
                              title="Bạn không có quyền duyệt"
                              aria-label="Duyệt"
                              className="p-1.5 rounded-md text-gray-400 opacity-50 cursor-not-allowed"
                            >
                              <Check size={16} />
                            </button>
                            <button
                              disabled
                              title="Bạn không có quyền duyệt"
                              aria-label="Từ chối"
                              className="p-1.5 rounded-md text-gray-400 opacity-50 cursor-not-allowed"
                            >
                              <XCircle size={16} />
                            </button>
                          </>
                        )
                      ) : null}
                    </div>
                  </td>
                </tr>
              );})}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {total > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-4 px-2">
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600">Hiển thị {rangeFrom}–{rangeTo} / {total} yêu cầu</span>
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
        <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl flex flex-col modal-viewport-h" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between px-6 py-4 border-b shrink-0 bg-gray-50 rounded-t-lg">
            <h3 className="text-lg font-semibold">Chi tiết {(() => { const r = allRows.find((x: any) => x.id === detailId) as any; return r ? labelForPurchaseRequest(r) : 'yêu cầu'; })()}: {(allRows.find((x: any) => x.id === detailId) as any)?.maYeuCau ?? '—'}</h3>
            <button onClick={() => setDetailId(null)} className="text-gray-400 hover:text-gray-600 p-1 hover:bg-white rounded-md">✕</button>
          </div>
          <div className="overflow-y-auto flex-1 p-6 space-y-4">
            {(() => {
              const row = pageRows.find((x: any) => x.id === detailId) ?? allRows.find((x: any) => x.id === detailId);
              if (!row) return <p className="text-gray-500 py-8 text-center">Không tìm thấy</p>;
              const items = row.items ?? [];
              const totalAmount = items.reduce((s: number, it: any) => s + ((Number(it.giaDuKien) || 0) * (Number(it.soLuong) || 0)), 0);
              return (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                    <div><p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Mã yêu cầu</p><p className="font-semibold text-blue-600 mt-1">{row.maYeuCau}</p></div>
                    <div><p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Ngày yêu cầu</p><p className="font-medium mt-1">{row.ngayYeuCau ? new Date(row.ngayYeuCau).toLocaleDateString('vi-VN') : '—'}</p></div>
                    <div><p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Nhân viên</p><p className="font-medium mt-1">{row.tenNhanVien ?? row.maNhanVien ?? '—'}</p></div>
                    <div><p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Mã nhân viên</p><p className="font-medium mt-1">{row.maNhanVien ?? '—'}</p></div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Ưu tiên</p>
                      {(() => { const b = getPriorityBadge(String(row.mucDoUuTien ?? '')); return <span className={`inline-flex mt-1 px-2 py-1 rounded-full text-xs font-medium ${b.class}`}>{row.mucDoUuTien ? b.label : '—'}</span>; })()}
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Trạng thái</p>
                      {(() => { const b = getStatusBadge(String(row.trangThai ?? '')); return <span className={`inline-flex mt-1 px-2 py-1 rounded-full text-xs font-medium ${b.class}`}>{b.label}</span>; })()}
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Người duyệt</p>
                      <p className="font-medium mt-1">{row.nguoiDuyet || '—'}</p>
                      {row.ngayDuyet && <p className="text-xs text-gray-500">{new Date(row.ngayDuyet).toLocaleDateString('vi-VN')}</p>}
                    </div>
                  </div>
                  {row.mucDichYeuCau && (
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Mục đích yêu cầu</p>
                      <p className="text-sm mt-1">{row.mucDichYeuCau}</p>
                    </div>
                  )}
                  {row.ghiChu && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                      <p className="text-xs text-yellow-700 uppercase tracking-wide font-medium">Ghi chú</p>
                      <p className="text-sm mt-1">{row.ghiChu}</p>
                    </div>
                  )}
                  <div>
                    <p className="font-medium mb-2">Danh sách hàng hóa ({items.length})</p>
                    <div className="bg-white rounded-lg border overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead className="bg-gray-50 sticky top-0 z-10"><tr className="text-gray-600"><th className="text-left px-3 py-2 font-medium">Tên hàng hóa</th><th className="text-right px-3 py-2 font-medium">SL</th><th className="text-left px-3 py-2 font-medium">ĐV</th><th className="text-left px-3 py-2 font-medium">Loại</th><th className="text-right px-3 py-2 font-medium">Giá DK</th></tr></thead>
                        <tbody className="divide-y divide-gray-100">
                          {items.length === 0 ? (
                            <tr><td colSpan={5} className="text-center py-4 text-gray-400">Không có mặt hàng</td></tr>
                          ) : items.map((it: any) => (
                            <tr key={it.id} className="hover:bg-gray-50"><td className="px-3 py-2">{it.tenHangHoa}</td><td className="px-3 py-2 text-right">{it.soLuong}</td><td className="px-3 py-2">{it.donViTinh}</td><td className="px-3 py-2">{it.phanLoai ?? '—'}</td><td className="px-3 py-2 text-right">{it.giaDuKien ? Number(it.giaDuKien).toLocaleString('vi-VN') + 'đ' : '—'}</td></tr>
                          ))}
                        </tbody>
                        {items.length > 0 && (
                          <tfoot className="bg-gray-50 font-medium"><tr><td colSpan={4} className="px-3 py-2 text-right">Tổng tiền:</td><td className="px-3 py-2 text-right text-blue-600">{totalAmount.toLocaleString('vi-VN')}đ</td></tr></tfoot>
                        )}
                      </table>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
          <div className="flex justify-end gap-2 px-6 py-4 border-t shrink-0 bg-gray-50 rounded-b-lg">
            <div className="flex gap-2">
              {(() => {
                const row = allRows.find((x: any) => x.id === detailId);
                if (!row || !canApprove || getTrangThai(row) !== 'Chờ duyệt') return null;
                return (
                  <>
                    <button onClick={() => { setDetailId(null); setRejectId(row.id); }} disabled={!canUpdatePurchaseRequests} title={!canUpdatePurchaseRequests ? 'Bạn không có quyền từ chối' : undefined} className="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 text-sm disabled:opacity-50 disabled:cursor-not-allowed">Từ chối</button>
                    <button onClick={() => { setDetailId(null); setApproveId(row.id); }} disabled={!canApprovePurchaseRequests} title={!canApprovePurchaseRequests ? 'Bạn không có quyền duyệt' : undefined} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm disabled:opacity-50 disabled:cursor-not-allowed">Duyệt ngay</button>
                  </>
                );
              })()}
              <button onClick={() => setDetailId(null)} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-white bg-white text-sm">Đóng</button>
            </div>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!rejectId}
        onClose={() => { setRejectId(null); setRejectReason(''); }}
        onConfirm={() => { if (rejectId) doReject(rejectId, rejectReason || undefined); setRejectId(null); setRejectReason(''); }}
        title="Từ chối yêu cầu"
        message="Nhập lý do từ chối:"
        confirmText="Xác nhận từ chối"
        cancelText="Hủy"
        variant="danger"
      >
        <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} rows={3} placeholder="Lý do từ chối..." className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-3 focus:ring-2 focus:ring-red-500 focus:border-red-500" />
      </ConfirmDialog>

      <ConfirmDialog
        isOpen={!!approveId}
        onClose={() => setApproveId(null)}
        onConfirm={() => { if (approveId) doApprove(approveId); setApproveId(null); }}
        title="Xác nhận duyệt yêu cầu"
        message="Bạn có chắc muốn duyệt yêu cầu này?"
        confirmText="Xác nhận"
        cancelText="Hủy"
        variant="primary"
      >
        {(() => {
          const approveRow: any = allRows.find((x: any) => x.id === approveId);
          if (!approveRow) return <p className="text-sm text-gray-500">Không tìm thấy yêu cầu.</p>;
          const approveItems: any[] = approveRow.items ?? [];
          const approveTotal = getTongTien(approveRow);
          return (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Mã yêu cầu</p><p className="font-semibold text-blue-600 mt-0.5">{approveRow.maYeuCau ?? '—'}</p></div>
                <div><p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Ngày yêu cầu</p><p className="mt-0.5">{approveRow.ngayYeuCau ? new Date(approveRow.ngayYeuCau).toLocaleDateString('vi-VN') : '—'}</p></div>
                <div><p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Nhân viên</p><p className="mt-0.5">{approveRow.tenNhanVien ? `${approveRow.tenNhanVien}${approveRow.maNhanVien ? ` (${approveRow.maNhanVien})` : ''}` : (approveRow.maNhanVien ?? '—')}</p></div>
                <div><p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Ưu tiên</p>{(() => { const b = getPriorityBadge(String(approveRow.mucDoUuTien ?? '')); return <span className={`inline-flex mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${b.class}`}>{approveRow.mucDoUuTien ? b.label : '—'}</span>; })()}</div>
              </div>
              {approveRow.mucDichYeuCau && (
                <div className="bg-gray-50 rounded-lg p-2.5">
                  <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Mục đích</p>
                  <p className="mt-1 text-sm">{approveRow.mucDichYeuCau}</p>
                </div>
              )}
              <div className="flex items-center justify-between bg-blue-50 rounded-lg px-3 py-2">
                <span className="text-xs text-gray-600 font-medium">Tổng tiền</span>
                <span className="font-semibold text-blue-700">{approveTotal > 0 ? `${approveTotal.toLocaleString('vi-VN')}đ` : '—'}</span>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-1.5">Hàng hóa ({approveItems.length})</p>
                {approveItems.length === 0 ? (
                  <p className="text-xs text-gray-400 py-2 text-center border rounded-lg">Không có mặt hàng</p>
                ) : (
                  <div className="border rounded-lg overflow-hidden max-h-64 overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50 sticky top-0"><tr className="text-gray-600"><th className="text-left px-2.5 py-1.5 font-medium">Tên hàng hóa</th><th className="text-right px-2.5 py-1.5 font-medium">SL</th><th className="text-left px-2.5 py-1.5 font-medium">ĐVT</th><th className="text-right px-2.5 py-1.5 font-medium">Giá DK</th></tr></thead>
                      <tbody className="divide-y divide-gray-100">
                        {approveItems.map((it: any) => (
                          <tr key={it.id} className="hover:bg-gray-50"><td className="px-2.5 py-1.5">{it.tenHangHoa ?? '—'}</td><td className="px-2.5 py-1.5 text-right">{it.soLuong ?? '—'}</td><td className="px-2.5 py-1.5">{it.donViTinh ?? '—'}</td><td className="px-2.5 py-1.5 text-right">{it.giaDuKien != null && it.giaDuKien !== '' ? `${Number(it.giaDuKien).toLocaleString('vi-VN')}đ` : '—'}</td></tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          );
        })()}
      </ConfirmDialog>
    </div>
  );
};

export default PurchaseRequestReviewTab;
