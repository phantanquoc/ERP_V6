import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import { Plus, Edit, Trash2, X, Download, Search, RefreshCw } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getFileUrl } from '../config/api';
import { can, isCachedPermissionsLoaded, isTechnicalUser, canDeleteTechnical } from '../utils/permissions';
import { formatVND } from '../utils/purchaseRequestBadges';
import { ApiError } from '../services/apiClient';
import { useSpareParts, useCreateSparePart, useUpdateSparePart, useDeleteSparePart } from '../hooks/useSpareParts';
import sparePartService from '../services/sparePartService';
import FileUpload from './FileUpload';
import Modal from './Modal';
import ResponsiveRowActions, { type RowAction } from './ResponsiveRowActions';
import UnitSelect from './common/UnitSelect';
import { StatusBadge, type BadgeTone } from './shared/StatusBadge';

// Optional columns are `Float?` / `String?` in Prisma, so the API returns null (not undefined)
interface SparePart {
  id: string;
  maLinhKien: string;
  tenLinhKien: string;
  loai: string;
  donVi: string;
  soLuongTon: number;
  giaNhap?: number | null;
  nhaCungCap?: string | null;
  trangThai: string;
  ngayMua?: string | null;
  fileDinhKem?: string | null;
  createdAt: string;
}

interface SparePartListResult {
  data?: SparePart[];
  pagination?: { total?: number; totalPages?: number };
}

const DATE_OPTS: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit', year: 'numeric' };

// The service rewraps errors, so the HTTP status may be gone — fall back to the backend message
const isForbiddenError = (err: unknown): boolean => {
  if (err instanceof ApiError) return err.statusCode === 403;
  const msg = err instanceof Error ? err.message : '';
  return /truy cập bị từ chối|không có quyền|forbidden|HTTP 403/i.test(msg);
};

const LOAI_OPTIONS = [
  { value: 'CK', label: 'Cơ khí' },
  { value: 'DT', label: 'Điện tử' },
  { value: 'D', label: 'Điện' },
  { value: 'TH', label: 'Tổng hợp' },
];

const TRANG_THAI_OPTIONS = ['Đang sử dụng', 'Chưa sử dụng', 'Hết hàng'];

const trangThaiTone = (tt: string): BadgeTone => {
  if (tt === 'Đang sử dụng') return 'blue';
  if (tt === 'Hết hàng') return 'red';
  return 'gray';
};

// Shared table cell styles (keep in sync with the other Technical tabs)
const TH = 'px-3 py-2.5 text-left text-xs font-semibold text-gray-500 whitespace-nowrap';
const TD = 'px-3 py-2.5 text-gray-700 align-top';
const STICKY_LEFT = 'sticky left-0 z-10 shadow-[1px_0_0_0_rgb(229_231_235)]';
const STICKY_RIGHT = 'sticky right-0 z-10 shadow-[-1px_0_0_0_rgb(229_231_235)]';
// Nhà cung cấp is hidden below xl, so the visible column count depends on the breakpoint.
// colSpan larger than the real column count is harmless, so use the max.
const COL_COUNT = 8;

const SparePartList = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  // URL → state init
  const initQ = searchParams.get('q') ?? '';
  const initLoai = searchParams.get('loai') ?? '';
  const initTrangThai = searchParams.get('trangThai') ?? '';
  const initPage = Math.max(1, Number(searchParams.get('page') ?? '1') || 1);

  const itemsPerPage = 10;

  const [currentPage, setCurrentPage] = useState(initPage);
  const [search, setSearch] = useState(initQ);
  const [appliedSearch, setAppliedSearch] = useState(initQ);
  const [filterLoai, setFilterLoai] = useState(initLoai);
  const [filterTrangThai, setFilterTrangThai] = useState(initTrangThai);
  const [exporting, setExporting] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewMode, setIsViewMode] = useState(false);
  const [editingPart, setEditingPart] = useState<SparePart | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [formData, setFormData] = useState({
    tenLinhKien: '',
    loai: 'CK',
    donVi: 'Cái',
    soLuongTon: '0',
    giaNhap: '',
    nhaCungCap: '',
    trangThai: 'Chưa sử dụng',
    ngayMua: '',
  });

  // Technical membership (primary or secondary) is required for writes; the Rule Matrix can only narrow it further
  const rulesLoaded = isCachedPermissionsLoaded();
  const canWrite = isTechnicalUser(user) && (!rulesLoaded || can('spare-parts', 'CREATE', user?.role as string) || can('spare-parts', 'UPDATE', user?.role as string));
  const canDelete = canDeleteTechnical(user) && (!rulesLoaded || can('spare-parts', 'DELETE', user?.role as string));

  // URL sync helpers
  const syncingRef = useRef(false);

  const updateParams = useCallback((patch: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams);
    for (const [k, v] of Object.entries(patch)) {
      if (v === null || v === '') next.delete(k);
      else next.set(k, v);
    }
    syncingRef.current = true;
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  // URL → state sync (back/reload/share)
  useEffect(() => {
    if (syncingRef.current) { syncingRef.current = false; return; }
    const q = searchParams.get('q') ?? '';
    const loai = searchParams.get('loai') ?? '';
    const trangThai = searchParams.get('trangThai') ?? '';
    const page = Math.max(1, Number(searchParams.get('page') ?? '1') || 1);
    if (q !== appliedSearch) { setAppliedSearch(q); setSearch(q); }
    if (loai !== filterLoai) setFilterLoai(loai);
    if (trangThai !== filterTrangThai) setFilterTrangThai(trangThai);
    if (page !== currentPage) setCurrentPage(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Debounce search -> URL + appliedSearch
  useEffect(() => {
    if (search === appliedSearch) return;
    const t = setTimeout(() => {
      setAppliedSearch(search);
      setCurrentPage(1);
      updateParams({ q: search || null, page: null });
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const filters = useMemo(() => ({
    page: currentPage,
    limit: itemsPerPage,
    search: appliedSearch || undefined,
    loai: filterLoai || undefined,
    trangThai: filterTrangThai || undefined,
  }), [currentPage, appliedSearch, filterLoai, filterTrangThai]);

  const {
    data: queryResult,
    isLoading: loading,
    isError,
    error: listError,
    refetch,
    isFetching,
  } = useSpareParts(filters);
  const listResult = queryResult as SparePartListResult | SparePart[] | undefined;
  // The backend orders by createdAt desc and has no sortBy support, so the list is shown
  // in server order (a client-side sort would only reorder the current page).
  const parts: SparePart[] = useMemo(() => {
    if (Array.isArray(listResult)) return listResult;
    return Array.isArray(listResult?.data) ? listResult.data : [];
  }, [listResult]);
  const rawParts = parts;

  const pagination = Array.isArray(listResult) ? undefined : listResult?.pagination;
  const totalPages = pagination?.totalPages ?? 1;
  const total = pagination?.total ?? parts.length;
  const forbidden = isError && isForbiddenError(listError);

  // Deep-link ?partId -> open detail modal (fetch if not on current page)
  useEffect(() => {
    const partId = searchParams.get('partId');
    if (!partId) {
      // URL has no partId -> close modal if it was opened via deep-link
      if (isModalOpen && isViewMode && editingPart?.id && !rawParts.find(p => p.id === editingPart.id)) {
        // keep modal if user opened via row locally without URL? but spec says URL drives modal
      }
      return;
    }
    // Already open correct part
    if (isModalOpen && editingPart?.id === partId) return;
    const found = rawParts.find(p => p.id === partId);
    if (found) {
      setEditingPart(found);
      setIsViewMode(true);
      setIsModalOpen(true);
      return;
    }
    // Not on current page -> fetch by id
    let cancelled = false;
    sparePartService.getById(partId).then((res) => {
      if (cancelled) return;
      const wrapped = res as { data?: SparePart } | SparePart | undefined;
      const part = wrapped && 'data' in wrapped ? wrapped.data : (wrapped as SparePart | undefined);
      if (part?.id) {
        setEditingPart(part as SparePart);
        setIsViewMode(true);
        setIsModalOpen(true);
      }
    }).catch(() => {/* ignore invalid partId */});
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.get('partId'), rawParts]);

  const createMutation = useCreateSparePart();
  const updateMutation = useUpdateSparePart();
  const deleteMutation = useDeleteSparePart();

  const resetForm = () => setFormData({ tenLinhKien: '', loai: 'CK', donVi: 'Cái', soLuongTon: '0', giaNhap: '', nhaCungCap: '', trangThai: 'Chưa sử dụng', ngayMua: '' });

  const openCreateModal = () => {
    setEditingPart(null);
    setIsViewMode(false);
    setSelectedFile(null);
    resetForm();
    setIsModalOpen(true);
  };

  const openEditModal = (part: SparePart) => {
    setEditingPart(part);
    setIsViewMode(false);
    setSelectedFile(null);
    setFormData({
      tenLinhKien: part.tenLinhKien,
      loai: part.loai,
      donVi: part.donVi,
      soLuongTon: String(part.soLuongTon),
      giaNhap: part.giaNhap != null ? String(part.giaNhap) : '',
      nhaCungCap: part.nhaCungCap ?? '',
      trangThai: part.trangThai,
      ngayMua: part.ngayMua?.split('T')[0] ?? '',
    });
    setIsModalOpen(true);
  };

  const openViewModal = (part: SparePart) => {
    setEditingPart(part);
    setIsViewMode(true);
    setIsModalOpen(true);
    updateParams({ partId: part.id });
  };

  const closeModal = () => {
    setIsModalOpen(false);
    // Delay clearing editingPart to allow exit animation
    setTimeout(() => {
      setEditingPart(null);
      setIsViewMode(false);
    }, 100);
    if (searchParams.get('partId')) updateParams({ partId: null });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = {
        tenLinhKien: formData.tenLinhKien,
        loai: formData.loai,
        donVi: formData.donVi,
        soLuongTon: formData.soLuongTon ? Number(formData.soLuongTon) : undefined,
        giaNhap: formData.giaNhap ? Number(formData.giaNhap) : undefined,
        nhaCungCap: formData.nhaCungCap || undefined,
        trangThai: formData.trangThai,
        ngayMua: formData.ngayMua || undefined,
      };

      if (editingPart) {
        await updateMutation.mutateAsync({ id: editingPart.id, data, file: selectedFile ?? undefined });
      } else {
        await createMutation.mutateAsync({ data, file: selectedFile ?? undefined });
      }
      toast.success(editingPart ? 'Cập nhật linh kiện thành công' : 'Thêm linh kiện thành công');
      setIsModalOpen(false);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Có lỗi xảy ra');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa linh kiện này?')) return;
    try {
      await deleteMutation.mutateAsync(id);
      toast.success('Đã xóa linh kiện');
      if (searchParams.get('partId') === id) updateParams({ partId: null });
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Lỗi khi xóa');
    }
  };

  const handleExport = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const response = await sparePartService.exportExcel({
        search: appliedSearch || undefined,
        loai: filterLoai || undefined,
        trangThai: filterTrangThai || undefined,
      });
      const url = window.URL.createObjectURL(new Blob([response as unknown as BlobPart]));
      const link = document.createElement('a');
      link.href = url;
      link.download = `danh-sach-linh-kien-${Date.now()}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error: unknown) {
      toast.error(isForbiddenError(error) ? 'Bạn không có quyền xuất danh sách này' : 'Xuất Excel thất bại');
    } finally {
      setExporting(false);
    }
  };

  const loaiLabel = (v: string) => LOAI_OPTIONS.find(o => o.value === v)?.label ?? v;
  const formatDate = (v?: string | null) => (v ? new Date(v).toLocaleDateString('vi-VN', DATE_OPTS) : '—');

  const hasActiveFilter = Boolean(appliedSearch || filterLoai || filterTrangThai);
  const selectedPartId = searchParams.get('partId');
  const goToPage = (np: number) => { setCurrentPage(np); updateParams({ page: String(np) }); };
  const pageCount = Math.max(1, totalPages);
  const applySearch = () => { setCurrentPage(1); setAppliedSearch(search); updateParams({ q: search || null, page: null }); };

  // Init partId from URL on mount already handled via effect above; need to ensure deep-link works even before data loads
  // Also handle browser back closing modal
  useEffect(() => {
    if (!searchParams.get('partId') && isModalOpen && isViewMode) {
      setIsModalOpen(false);
    }
  }, [searchParams.get('partId')]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-800">Danh sách linh kiện</h2>
          <p className="text-sm text-gray-500 mt-0.5">{isError ? 'Không tải được dữ liệu' : `Tổng: ${Number(total).toLocaleString('vi-VN')} linh kiện · Mới nhất trước`}</p>
        </div>
        <div className="flex gap-2">
          {!forbidden && (
            <button type="button" onClick={handleExport} disabled={exporting} className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-60 disabled:cursor-not-allowed">
              <Download size={16} aria-hidden="true" /> {exporting ? 'Đang xuất…' : 'Xuất Excel'}
            </button>
          )}
          {canWrite && !forbidden && (
            <button onClick={openCreateModal} className="flex items-center gap-1.5 px-3 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700">
              <Plus size={16} /> Thêm linh kiện
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-1 min-w-[240px] gap-2">
          <input
            type="search"
            aria-label="Tìm linh kiện theo mã hoặc tên"
            placeholder="Tìm mã, tên linh kiện..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') applySearch(); }}
            className="flex-1 min-w-0 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="button"
            onClick={applySearch}
            title="Tìm kiếm"
            aria-label="Tìm kiếm"
            className="shrink-0 px-3 py-2 text-sm text-gray-600 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <Search size={16} aria-hidden="true" />
          </button>
        </div>
        <select aria-label="Lọc theo loại" value={filterLoai} onChange={e => { const v = e.target.value; setFilterLoai(v); setCurrentPage(1); updateParams({ loai: v || null, page: null }); }} className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">Tất cả loại</option>
          {LOAI_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select aria-label="Lọc theo trạng thái" value={filterTrangThai} onChange={e => { const v = e.target.value; setFilterTrangThai(v); setCurrentPage(1); updateParams({ trangThai: v || null, page: null }); }} className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">Tất cả trạng thái</option>
          {TRANG_THAI_OPTIONS.map(v => <option key={v} value={v}>{v}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm min-w-[640px]">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th scope="col" className={`${TH} ${STICKY_LEFT} bg-gray-50 w-[140px]`}>Mã linh kiện</th>
                <th scope="col" className={`${TH} min-w-[200px]`}>Tên linh kiện</th>
                <th scope="col" className={`${TH} w-[90px]`}>Loại</th>
                <th scope="col" className={`${TH} w-[100px] text-right`}>SL tồn</th>
                <th scope="col" className={`${TH} hidden xl:table-cell w-[120px] text-right`}>Giá nhập</th>
                <th scope="col" className={`${TH} hidden xl:table-cell w-[160px]`}>Nhà cung cấp</th>
                <th scope="col" className={`${TH} w-[120px]`}>Trạng thái</th>
                <th scope="col" className={`${TH} ${STICKY_RIGHT} bg-gray-50 w-[90px] text-right`}>Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isError ? (
                <tr>
                  <td colSpan={COL_COUNT} className="px-3 py-10 text-center">
                    <p role="alert" className="text-sm font-medium text-gray-700">
                      {forbidden ? 'Bạn không có quyền xem danh sách này' : 'Không tải được danh sách linh kiện'}
                    </p>
                    {!forbidden && (
                      <button
                        type="button"
                        onClick={() => { void refetch(); }}
                        disabled={isFetching}
                        className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-blue-600 hover:bg-gray-50 disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                      >
                        <RefreshCw size={14} aria-hidden="true" className={isFetching ? 'animate-spin' : ''} /> Thử lại
                      </button>
                    )}
                  </td>
                </tr>
              ) : loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={`sk-${i}`} aria-hidden="true">
                    {Array.from({ length: COL_COUNT }).map((__, j) => (
                      <td key={j} className={`px-3 py-3 ${j === 4 || j === 5 ? 'hidden xl:table-cell' : ''}`}>
                        <div className={`h-3.5 rounded bg-gray-200 animate-pulse ${j === 1 ? 'w-4/5' : 'w-2/3'}`} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : parts.length === 0 ? (
                <tr>
                  <td colSpan={COL_COUNT} className="px-3 py-10 text-center">
                    <p className="text-sm font-medium text-gray-600">
                      {hasActiveFilter ? 'Không có linh kiện nào khớp với bộ lọc hiện tại' : 'Chưa có linh kiện nào trong danh sách'}
                    </p>
                    <p className="mt-1 text-xs text-gray-400">
                      {hasActiveFilter ? 'Thử đổi từ khóa tìm kiếm, loại hoặc trạng thái.' : canWrite ? 'Bấm "Thêm linh kiện" để tạo linh kiện đầu tiên.' : 'Linh kiện sẽ hiển thị tại đây khi bộ phận Kỹ thuật thêm vào.'}
                    </p>
                  </td>
                </tr>
              ) : parts.map((part) => {
                const isSelected = selectedPartId === part.id;
                // Sticky cells need an explicit background that follows the row state
                const stickyBg = isSelected ? 'bg-blue-50' : 'bg-white group-hover:bg-gray-50';
                const loai = loaiLabel(part.loai);
                return (
                <tr
                  key={part.id}
                  onClick={() => openViewModal(part)}
                  className={`group cursor-pointer transition-colors ${isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                >
                  <td className={`${TD} ${STICKY_LEFT} ${stickyBg} whitespace-nowrap ${isSelected ? 'border-l-2 border-l-blue-600' : 'border-l-2 border-l-transparent'}`}>
                    <span className="font-mono text-xs font-medium text-blue-700">{part.maLinhKien}</span>
                  </td>
                  <td className={TD}>
                    <p className="max-w-[320px] line-clamp-2 font-medium text-gray-800" title={part.tenLinhKien}>{part.tenLinhKien}</p>
                  </td>
                  <td className={`${TD} whitespace-nowrap text-xs text-gray-600`}>{loai}</td>
                  <td className={`${TD} whitespace-nowrap text-right tabular-nums`}>
                    <span className={`font-medium ${Number(part.soLuongTon ?? 0) === 0 ? 'text-red-600' : 'text-gray-800'}`}>
                      {Number(part.soLuongTon ?? 0).toLocaleString('vi-VN')}
                    </span>
                    {part.donVi && <span className="ml-1 text-xs text-gray-500">{part.donVi}</span>}
                    {Number(part.soLuongTon ?? 0) === 0 && (
                      <span className="ml-1.5 rounded bg-red-50 px-1 py-0.5 text-[10px] font-medium text-red-700">Hết</span>
                    )}
                  </td>
                  <td className={`${TD} hidden xl:table-cell whitespace-nowrap text-right tabular-nums text-xs text-gray-700`}>
                    {part.giaNhap != null ? formatVND(part.giaNhap) : <span className="text-gray-400">—</span>}
                  </td>
                  <td className={`${TD} hidden xl:table-cell text-xs text-gray-600`}>
                    {part.nhaCungCap
                      ? <p className="max-w-[160px] truncate" title={part.nhaCungCap}>{part.nhaCungCap}</p>
                      : <span className="text-gray-400">—</span>}
                  </td>
                  <td className={`${TD} whitespace-nowrap`}>
                    <StatusBadge label={part.trangThai} tone={trangThaiTone(part.trangThai)} />
                  </td>
                  <td className={`px-3 py-1.5 align-middle ${STICKY_RIGHT} ${stickyBg}`} onClick={(e) => e.stopPropagation()}>
                    <ResponsiveRowActions
                      actions={[
                        ...(canWrite ? [{ key: 'edit', label: 'Sửa linh kiện', icon: <Edit size={14} />, onClick: () => openEditModal(part), tone: 'success' } satisfies RowAction] : []),
                        ...(canDelete ? [{ key: 'delete', label: 'Xóa linh kiện', icon: <Trash2 size={14} />, onClick: () => handleDelete(part.id), tone: 'danger' } satisfies RowAction] : []),
                      ]}
                    />
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!loading && !isError && parts.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-t border-gray-200">
            <p className="text-sm text-gray-500">
              Trang {currentPage}/{pageCount}
            </p>
            <div className="flex gap-1">
              <button type="button" disabled={currentPage <= 1} onClick={() => goToPage(currentPage - 1)} className="px-3 py-1 text-sm text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">Trước</button>
              <button type="button" disabled={currentPage >= pageCount} onClick={() => goToPage(currentPage + 1)} className="px-3 py-1 text-sm text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">Sau</button>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      <Modal isOpen={isModalOpen} onClose={closeModal} showBackdrop>
        <div className="bg-white rounded-xl shadow-xl w-full max-w-lg flex flex-col modal-viewport-h" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between p-5 border-b shrink-0">
            <h3 className="font-semibold text-gray-800">
              {isViewMode ? 'Chi tiết linh kiện' : editingPart ? 'Chỉnh sửa linh kiện' : 'Thêm linh kiện mới'}
            </h3>
            <button type="button" onClick={closeModal} title="Đóng" aria-label="Đóng" className="p-1.5 hover:bg-gray-100 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"><X size={18} aria-hidden="true" /></button>
          </div>

          <div className="overflow-y-auto flex-1">
          {isViewMode && editingPart ? (
              <div className="p-5 space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div><span className="text-gray-500">Mã linh kiện:</span><p className="font-mono font-medium text-blue-700">{editingPart.maLinhKien}</p></div>
                  <div><span className="text-gray-500">Loại:</span><p>{loaiLabel(editingPart.loai)}</p></div>
                  <div className="col-span-2"><span className="text-gray-500">Tên linh kiện:</span><p className="font-medium">{editingPart.tenLinhKien}</p></div>
                  <div><span className="text-gray-500">Đơn vị:</span><p>{editingPart.donVi || '—'}</p></div>
                  <div><span className="text-gray-500">Số lượng tồn:</span><p className="font-medium">{Number(editingPart.soLuongTon ?? 0).toLocaleString('vi-VN')}</p></div>
                  <div><span className="text-gray-500">Giá nhập:</span><p>{editingPart.giaNhap != null ? formatVND(editingPart.giaNhap) : '—'}</p></div>
                  <div><span className="text-gray-500">Nhà cung cấp:</span><p>{editingPart.nhaCungCap || '—'}</p></div>
                  <div><span className="text-gray-500">Trạng thái:</span>
                    <p className="mt-1"><StatusBadge label={editingPart.trangThai} tone={trangThaiTone(editingPart.trangThai)} /></p>
                  </div>
                  <div><span className="text-gray-500">Ngày mua:</span><p>{formatDate(editingPart.ngayMua)}</p></div>
                </div>
                {editingPart.fileDinhKem && (
                  <div><span className="text-gray-500">File đính kèm:</span>
                    <a href={getFileUrl(editingPart.fileDinhKem)} target="_blank" rel="noreferrer" className="ml-2 text-blue-600 hover:underline">Xem file</a>
                  </div>
                )}
                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={closeModal} className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">Đóng</button>
                  {canWrite && (
                    <button type="button" onClick={() => openEditModal(editingPart)} className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700">Chỉnh sửa</button>
                  )}
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="p-5 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tên linh kiện <span className="text-red-500">*</span></label>
                  <input required type="text" value={formData.tenLinhKien} onChange={e => setFormData(f => ({ ...f, tenLinhKien: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Nhập tên linh kiện" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Loại <span className="text-red-500">*</span></label>
                    <select required value={formData.loai} onChange={e => setFormData(f => ({ ...f, loai: e.target.value }))} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg">
                      {LOAI_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Đơn vị <span className="text-red-500">*</span></label>
                    <UnitSelect
                      required
                      value={formData.donVi}
                      onChange={(val) => setFormData(f => ({ ...f, donVi: val }))}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Số lượng tồn</label>
                    <input type="number" min="0" value={formData.soLuongTon} onChange={e => setFormData(f => ({ ...f, soLuongTon: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Giá nhập (đ)</label>
                    <input type="number" min="0" value={formData.giaNhap} onChange={e => setFormData(f => ({ ...f, giaNhap: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none" placeholder="0" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nhà cung cấp</label>
                  <input type="text" value={formData.nhaCungCap} onChange={e => setFormData(f => ({ ...f, nhaCungCap: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Trạng thái</label>
                    <select value={formData.trangThai} onChange={e => setFormData(f => ({ ...f, trangThai: e.target.value }))} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg">
                      {TRANG_THAI_OPTIONS.map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ngày mua</label>
                    <input type="date" value={formData.ngayMua} onChange={e => setFormData(f => ({ ...f, ngayMua: e.target.value }))} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">File đính kèm</label>
                  <FileUpload
                    files={selectedFile ? [selectedFile] : []}
                    onChange={(files) => setSelectedFile(files[0] ?? null)}
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={closeModal} className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">Hủy</button>
                  <button type="submit" className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700">{editingPart ? 'Cập nhật' : 'Thêm mới'}</button>
                </div>
              </form>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default SparePartList;
