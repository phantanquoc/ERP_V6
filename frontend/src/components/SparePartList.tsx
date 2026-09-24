import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import { Plus, Edit, Trash2, X, Download, Search, ChevronDown } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getFileUrl } from '../config/api';
import { can, isCachedPermissionsLoaded } from '../utils/permissions';
import { UserRole } from '../types/auth';
import { useSpareParts, useCreateSparePart, useUpdateSparePart, useDeleteSparePart } from '../hooks/useSpareParts';
import sparePartService from '../services/sparePartService';
import FileUpload from './FileUpload';
import Modal from './Modal';
import ResponsiveRowActions, { type RowAction } from './ResponsiveRowActions';
import UnitSelect from './common/UnitSelect';

interface SparePart {
  id: string;
  maLinhKien: string;
  tenLinhKien: string;
  loai: string;
  donVi: string;
  soLuongTon: number;
  giaNhap?: number;
  nhaCungCap?: string;
  trangThai: string;
  ngayMua?: string;
  fileDinhKem?: string;
  createdAt: string;
}

const LOAI_OPTIONS = [
  { value: 'CK', label: 'Cơ khí' },
  { value: 'DT', label: 'Điện tử' },
  { value: 'D', label: 'Điện' },
  { value: 'TH', label: 'Tổng hợp' },
];

const TRANG_THAI_OPTIONS = ['Đang sử dụng', 'Chưa sử dụng', 'Hết hàng'];

const trangThaiBadge = (tt: string) => {
  if (tt === 'Đang sử dụng') return 'bg-blue-100 text-blue-700';
  if (tt === 'Hết hàng') return 'bg-red-100 text-red-700';
  return 'bg-gray-100 text-gray-600';
};

type SortBy = 'maLinhKien' | 'tenLinhKien' | 'soLuongTon' | 'createdAt';
type SortOrder = 'asc' | 'desc';

const SparePartList = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  // URL → state init
  const initQ = searchParams.get('q') ?? '';
  const initLoai = searchParams.get('loai') ?? '';
  const initTrangThai = searchParams.get('trangThai') ?? '';
  const initPage = Math.max(1, Number(searchParams.get('page') ?? '1') || 1);
  const initSortBy = (searchParams.get('sortBy') as SortBy) ?? '' as SortBy | '';
  const initSortOrder = (searchParams.get('sortOrder') as SortOrder) ?? 'asc';
  const initPartId = searchParams.get('partId');

  const itemsPerPage = 10;

  const [currentPage, setCurrentPage] = useState(initPage);
  const [search, setSearch] = useState(initQ);
  const [appliedSearch, setAppliedSearch] = useState(initQ);
  const [filterLoai, setFilterLoai] = useState(initLoai);
  const [filterTrangThai, setFilterTrangThai] = useState(initTrangThai);
  const [sortBy, setSortBy] = useState<SortBy | ''>(initSortBy as SortBy | '');
  const [sortOrder, setSortOrder] = useState<SortOrder>(initSortOrder as SortOrder);

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

  const isTechnical = user?.department === 'technical' ||
    user?.secondaryDepartments?.some(d => d.departmentCode === 'technical');
  const _baseWrite = user?.role === UserRole.ADMIN || isTechnical;
  const canWrite = isCachedPermissionsLoaded() ? can('spare-parts', 'CREATE', user?.role as string) || can('spare-parts', 'UPDATE', user?.role as string) : _baseWrite;
  const canDelete = isCachedPermissionsLoaded() ? can('spare-parts', 'DELETE', user?.role as string) : (user?.role === UserRole.ADMIN || isTechnical);

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
    const sb = (searchParams.get('sortBy') as SortBy) ?? '';
    const so = (searchParams.get('sortOrder') as SortOrder) ?? 'asc';
    if (q !== appliedSearch) { setAppliedSearch(q); setSearch(q); }
    if (loai !== filterLoai) setFilterLoai(loai);
    if (trangThai !== filterTrangThai) setFilterTrangThai(trangThai);
    if (page !== currentPage) setCurrentPage(page);
    if ((sb as string) !== (sortBy as string)) setSortBy(sb as SortBy | '');
    if (so !== sortOrder) setSortOrder(so);
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

  const { data: queryResult, isLoading: loading } = useSpareParts(filters);
  const rawParts: SparePart[] = useMemo(() => {
    const result = queryResult as any;
    return Array.isArray(result?.data) ? result.data : Array.isArray(result) ? result : [];
  }, [queryResult]);

  // Client sort (backend may ignore sortBy/sortOrder)
  const parts: SparePart[] = useMemo(() => {
    if (!sortBy) return rawParts;
    const sorted = [...rawParts].sort((a: any, b: any) => {
      const av = a[sortBy];
      const bv = b[sortBy];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === 'number' && typeof bv === 'number') return av - bv;
      return String(av).localeCompare(String(bv), 'vi');
    });
    return sortOrder === 'desc' ? sorted.reverse() : sorted;
  }, [rawParts, sortBy, sortOrder]);

  const totalPages = (queryResult as any)?.pagination?.totalPages ?? 1;
  const total = (queryResult as any)?.pagination?.total ?? parts.length;

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
    sparePartService.getById(partId).then((res: any) => {
      if (cancelled) return;
      const part = res?.data ?? res;
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
      giaNhap: part.giaNhap !== undefined ? String(part.giaNhap) : '',
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

  const handleSort = (field: SortBy) => {
    const nextOrder: SortOrder = sortBy === field && sortOrder === 'asc' ? 'desc' : 'asc';
    const nextBy: SortBy | '' = field;
    setSortBy(nextBy);
    setSortOrder(nextOrder);
    updateParams({ sortBy: field, sortOrder: nextOrder });
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
    } catch (error: any) {
      toast.error(error instanceof Error ? error.message : 'Có lỗi xảy ra');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa linh kiện này?')) return;
    try {
      await deleteMutation.mutateAsync(id);
      toast.success('Đã xóa linh kiện');
      if (searchParams.get('partId') === id) updateParams({ partId: null });
    } catch (error: any) {
      toast.error(error instanceof Error ? error.message : 'Lỗi khi xóa');
    }
  };

  const handleExport = async () => {
    try {
      const response = await sparePartService.exportExcel({
        search: appliedSearch || undefined,
        loai: filterLoai || undefined,
        trangThai: filterTrangThai || undefined,
      }) as any;
      const url = window.URL.createObjectURL(new Blob([response]));
      const link = document.createElement('a');
      link.href = url;
      link.download = `danh-sach-linh-kien-${Date.now()}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export error:', error);
    }
  };

  const loaiLabel = (v: string) => LOAI_OPTIONS.find(o => o.value === v)?.label ?? v;

  const SortIcon = ({ field }: { field: SortBy }) => {
    if (sortBy !== field) return <ChevronDown size={12} className="opacity-30" />;
    return <span className="text-blue-600 text-xs">{sortOrder === 'asc' ? '▲' : '▼'}</span>;
  };

  // Init partId from URL on mount already handled via effect above; need to ensure deep-link works even before data loads
  // Also handle browser back closing modal
  useEffect(() => {
    if (!searchParams.get('partId') && isModalOpen && isViewMode) {
      setIsModalOpen(false);
    }
  }, [searchParams.get('partId')]);

  // Suppress unused var warning for initPartId (used to seed state)
  void initPartId;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-800">Danh sách linh kiện</h2>
          <p className="text-sm text-gray-500 mt-0.5">Tổng: {total} linh kiện</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExport} className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
            <Download size={16} /> Xuất Excel
          </button>
          {canWrite && (
            <button onClick={openCreateModal} className="flex items-center gap-1.5 px-3 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700">
              <Plus size={16} /> Thêm linh kiện
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="flex-1 min-w-[200px] flex gap-2">
          <input
            type="text"
            placeholder="Tìm mã, tên linh kiện..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && (setCurrentPage(1), setAppliedSearch(search), updateParams({ q: search || null, page: null }))}
            className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button onClick={() => { setCurrentPage(1); setAppliedSearch(search); updateParams({ q: search || null, page: null }); }} className="px-3 py-2 text-sm bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200">
            <Search size={16} />
          </button>
        </div>
        <select value={filterLoai} onChange={e => { const v = e.target.value; setFilterLoai(v); setCurrentPage(1); updateParams({ loai: v || null, page: null }); }} className="px-3 py-2 text-sm border border-gray-300 rounded-lg">
          <option value="">Tất cả loại</option>
          {LOAI_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select value={filterTrangThai} onChange={e => { const v = e.target.value; setFilterTrangThai(v); setCurrentPage(1); updateParams({ trangThai: v || null, page: null }); }} className="px-3 py-2 text-sm border border-gray-300 rounded-lg">
          <option value="">Tất cả trạng thái</option>
          {TRANG_THAI_OPTIONS.map(v => <option key={v} value={v}>{v}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th onClick={() => handleSort('maLinhKien')} className="px-3 py-2.5 text-left font-medium text-gray-500 text-xs sticky left-0 bg-gray-50 z-10 min-w-[100px] cursor-pointer select-none hover:text-gray-700">Mã linh kiện <SortIcon field="maLinhKien" /></th>
                <th onClick={() => handleSort('tenLinhKien')} className="px-3 py-2.5 text-left font-medium text-gray-500 text-xs min-w-[150px] cursor-pointer select-none hover:text-gray-700">Tên linh kiện <SortIcon field="tenLinhKien" /></th>
                <th className="px-3 py-2.5 text-left font-medium text-gray-500 text-xs min-w-[80px]">Loại</th>
                <th className="px-3 py-2.5 text-left font-medium text-gray-500 text-xs min-w-[60px]">Đơn vị</th>
                <th onClick={() => handleSort('soLuongTon')} className="px-3 py-2.5 text-left font-medium text-gray-500 text-xs min-w-[60px] cursor-pointer select-none hover:text-gray-700">SL tồn <SortIcon field="soLuongTon" /></th>
                <th className="px-3 py-2.5 text-left font-medium text-gray-500 text-xs min-w-[120px]">Nhà cung cấp</th>
                <th className="px-3 py-2.5 text-left font-medium text-gray-500 text-xs min-w-[100px]">Trạng thái</th>
                <th className="px-3 py-2.5 text-right font-medium text-gray-500 text-xs sticky right-0 bg-gray-50 z-10 min-w-[90px]">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={8} className="px-3 py-8 text-center text-gray-400">Đang tải...</td></tr>
              ) : parts.length === 0 ? (
                <tr><td colSpan={8} className="px-3 py-8 text-center text-gray-400">Không có dữ liệu</td></tr>
              ) : parts.map((part) => (
                <tr key={part.id} onClick={() => openViewModal(part)} className={`border-l-2 cursor-pointer transition-all ${searchParams.get('partId') === part.id ? 'bg-blue-50 border-l-blue-600' : 'border-l-transparent hover:bg-blue-100 hover:border-l-blue-500'}`}>
                  <td className="px-3 py-2.5 sticky left-0 bg-white z-10 font-mono text-xs text-blue-700 font-medium">{part.maLinhKien}</td>
                  <td className="px-3 py-2.5 font-medium text-gray-800">{part.tenLinhKien}</td>
                  <td className="px-3 py-2.5 text-gray-600 text-xs">{loaiLabel(part.loai)}</td>
                  <td className="px-3 py-2.5 text-gray-600 text-xs">{part.donVi}</td>
                  <td className="px-3 py-2.5 font-medium">{part.soLuongTon}</td>
                  <td className="px-3 py-2.5 text-gray-600 text-xs">{part.nhaCungCap ?? '—'}</td>
                  <td className="px-3 py-2.5">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${trangThaiBadge(part.trangThai)}`}>
                      {part.trangThai}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 sticky right-0 bg-white z-10" onClick={(e) => e.stopPropagation()}>
                    <ResponsiveRowActions
                      actions={[
                        ...(canWrite ? [{ key: 'edit', label: 'Sửa linh kiện', icon: <Edit size={14} />, onClick: () => openEditModal(part), tone: 'success' } satisfies RowAction] : []),
                        ...(canDelete ? [{ key: 'delete', label: 'Xóa linh kiện', icon: <Trash2 size={14} />, onClick: () => handleDelete(part.id), tone: 'danger' } satisfies RowAction] : []),
                      ]}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
            <p className="text-sm text-gray-500">Trang {currentPage} / {totalPages}</p>
            <div className="flex gap-1">
              <button disabled={currentPage === 1} onClick={() => { const np = currentPage - 1; setCurrentPage(np); updateParams({ page: String(np) }); }} className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-40">Trước</button>
              <button disabled={currentPage === totalPages} onClick={() => { const np = currentPage + 1; setCurrentPage(np); updateParams({ page: String(np) }); }} className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-40">Sau</button>
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
            <button onClick={closeModal} className="p-1.5 hover:bg-gray-100 rounded"><X size={18} /></button>
          </div>

          <div className="overflow-y-auto flex-1">
          {isViewMode && editingPart ? (
              <div className="p-5 space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div><span className="text-gray-500">Mã linh kiện:</span><p className="font-mono font-medium text-blue-700">{editingPart.maLinhKien}</p></div>
                  <div><span className="text-gray-500">Loại:</span><p>{loaiLabel(editingPart.loai)}</p></div>
                  <div className="col-span-2"><span className="text-gray-500">Tên linh kiện:</span><p className="font-medium">{editingPart.tenLinhKien}</p></div>
                  <div><span className="text-gray-500">Đơn vị:</span><p>{editingPart.donVi}</p></div>
                  <div><span className="text-gray-500">Số lượng tồn:</span><p className="font-medium">{editingPart.soLuongTon}</p></div>
                  <div><span className="text-gray-500">Giá nhập:</span><p>{editingPart.giaNhap !== undefined ? editingPart.giaNhap.toLocaleString('vi-VN') + ' đ' : '—'}</p></div>
                  <div><span className="text-gray-500">Nhà cung cấp:</span><p>{editingPart.nhaCungCap ?? '—'}</p></div>
                  <div><span className="text-gray-500">Trạng thái:</span>
                    <p><span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium mt-1 ${trangThaiBadge(editingPart.trangThai)}`}>{editingPart.trangThai}</span></p>
                  </div>
                  <div><span className="text-gray-500">Ngày mua:</span><p>{editingPart.ngayMua ? new Date(editingPart.ngayMua).toLocaleDateString('vi-VN') : '—'}</p></div>
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
