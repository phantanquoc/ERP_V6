import { useState, useEffect, useCallback } from 'react';
import { Search, Download, Plus, Edit, Trash2, Phone, Globe, X, Mail, MapPin, Building2, Tag, Copy, Check, ExternalLink, User, Calendar, Shield } from 'lucide-react';
import { supplierService, Supplier, CreateSupplierData, UpdateSupplierData } from '../../services/supplierService';
import { useAuth } from '../../contexts/AuthContext';
import { useDebounce } from '../../hooks/useDebounce';
import PaginationBar from '../common/PaginationBar';
import Modal from '../Modal';

type PhanLoaiNCC = 'NVL' | 'Thiết bị';

interface SupplierTabPanelProps {
  phanLoaiNCC: PhanLoaiNCC;
  accent?: 'blue' | 'purple';
}

const accentMap = {
  blue: {
    ring: 'focus:ring-blue-500',
    btn: 'bg-blue-600 hover:bg-blue-700',
    code: 'text-blue-600',
    codeBg: 'bg-blue-50 text-blue-700 border-blue-200',
    badgeLoaiSx: 'bg-blue-100 text-blue-800',
    badgeLoaiTm: 'bg-purple-100 text-purple-800',
    tabActive: 'text-blue-600 border-blue-600',
  },
  purple: {
    ring: 'focus:ring-purple-500',
    btn: 'bg-purple-600 hover:bg-purple-700',
    code: 'text-purple-600',
    codeBg: 'bg-purple-50 text-purple-700 border-purple-200',
    badgeLoaiSx: 'bg-purple-100 text-purple-800',
    badgeLoaiTm: 'bg-indigo-100 text-indigo-800',
    tabActive: 'text-purple-600 border-purple-600',
  },
} as const;

function fmtDate(v?: string | null) {
  if (!v) return '—';
  try { return new Date(v).toLocaleDateString('vi-VN'); } catch { return '—'; }
}
function fmtMoney(v?: number | null) {
  if (!v) return '—';
  return `${Number(v).toLocaleString('vi-VN')} VNĐ`;
}

export default function SupplierTabPanel({ phanLoaiNCC, accent }: SupplierTabPanelProps) {
  const resolvedAccent = accent ?? (phanLoaiNCC === 'Thiết bị' ? 'purple' : 'blue');
  const ac = accentMap[resolvedAccent];

  const { user } = useAuth();

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 350);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState<number>(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // modals
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [addForm, setAddForm] = useState<Partial<CreateSupplierData>>({});
  const [editForm, setEditForm] = useState<Partial<CreateSupplierData>>({});
  const [formLoading, setFormLoading] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // detail
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Supplier | null>(null);
  const [historyStats, setHistoryStats] = useState<{ totalOrders: number; totalSpend: number; pendingOrders: number; lastOrderAt: string | null } | null>(null);
  const [historyOrders, setHistoryOrders] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyDetailTab, setHistoryDetailTab] = useState<'info' | 'history'>('info');
  const [copied, setCopied] = useState(false);

  const fetchSuppliers = useCallback(async () => {
    try {
      setLoading(true);
      const res: any = await supplierService.getAllSuppliers(page, limit, debouncedSearch || undefined, phanLoaiNCC);
      const data: Supplier[] = Array.isArray(res.data) ? res.data : Array.isArray(res.data?.data) ? res.data.data : [];
      setSuppliers(data);
      const pag: any = res.pagination ?? ((res as any).total !== undefined ? (res as any) : (res as any).data?.pagination);
      setTotal(pag?.total ?? data.length);
      setTotalPages(pag?.totalPages ?? 1);
    } catch (e) {
      console.error('Error fetching suppliers:', e);
    } finally {
      setLoading(false);
    }
  }, [page, limit, debouncedSearch, phanLoaiNCC]);

  useEffect(() => { fetchSuppliers(); }, [fetchSuppliers]);
  useEffect(() => { setPage(1); }, [debouncedSearch]);
  const handleLimitChange = (v: number) => { setLimit(v); setPage(1); };

  const openDetail = useCallback((item: Supplier) => { setSelectedItem(item); setDetailOpen(true); setCopied(false); }, []);
  const closeDetail = useCallback(() => { setDetailOpen(false); setSelectedItem(null); }, []);

  useEffect(() => {
    if (detailOpen && selectedItem?.id) {
      setHistoryDetailTab('info');
      setHistoryLoading(true);
      setHistoryStats(null);
      setHistoryOrders([]);
      Promise.all([
        supplierService.getPurchaseStats(selectedItem.id).then((r: any) => r?.data ?? r).catch(() => null),
        supplierService.getPurchaseRequestsBySupplier(selectedItem.id, 1, 5).then((r: any) => r?.data ?? r?.data ?? []).catch(() => []),
      ]).then(([stats, orders]) => {
        if (stats) setHistoryStats({ totalOrders: stats.totalOrders ?? 0, totalSpend: stats.totalSpend ?? 0, pendingOrders: stats.pendingOrders ?? 0, lastOrderAt: stats.lastOrderAt ?? null });
        let arr: any[] = [];
        if (Array.isArray(orders)) arr = orders;
        else if (Array.isArray(orders?.data)) arr = orders.data;
        setHistoryOrders(arr);
      }).finally(() => setHistoryLoading(false));
    }
  }, [detailOpen, selectedItem?.id]);

  const openAddModal = async () => {
    if (!user?.employeeId) { alert('Không tìm thấy thông tin nhân viên. Vui lòng đăng nhập lại.'); return; }
    try {
      const codeRes: any = await supplierService.generateCode(phanLoaiNCC);
      const code = codeRes.data?.code || codeRes.code;
      setAddForm({
        maNhaCungCap: code, tenNhaCungCap: '', loaiCungCap: '', quocGia: 'Việt Nam', website: '', nguoiLienHe: '', soDienThoai: '', emailLienHe: '', diaChi: '', khaNang: '', loaiHinh: 'Sản xuất', trangThai: 'Đang cung cấp', phanLoaiNCC, employeeId: user.employeeId,
      });
      setIsAddOpen(true);
    } catch (e) { console.error('Error generating code:', e); }
  };

  const openEditModal = (s: Supplier) => {
    setEditingSupplier(s);
    setEditForm({ tenNhaCungCap: s.tenNhaCungCap, loaiCungCap: s.loaiCungCap, quocGia: s.quocGia ?? undefined, website: s.website || '', nguoiLienHe: s.nguoiLienHe, soDienThoai: s.soDienThoai, emailLienHe: s.emailLienHe ?? undefined, diaChi: s.diaChi, khaNang: s.khaNang || '', loaiHinh: s.loaiHinh, trangThai: s.trangThai });
    setIsEditOpen(true);
  };

  const handleAdd = async () => {
    try { setFormLoading(true); await supplierService.createSupplier(addForm as CreateSupplierData); setIsAddOpen(false); fetchSuppliers(); } catch (e) { console.error('Error creating supplier:', e); alert((e as Error).message || 'Đã xảy ra lỗi'); } finally { setFormLoading(false); }
  };
  const handleEdit = async () => {
    if (!editingSupplier) return;
    try { setFormLoading(true); await supplierService.updateSupplier(editingSupplier.id, editForm as UpdateSupplierData); setIsEditOpen(false); setEditingSupplier(null); fetchSuppliers(); } catch (e) { console.error('Error updating supplier:', e); alert((e as Error).message || 'Đã xảy ra lỗi'); } finally { setFormLoading(false); }
  };
  const handleDelete = async (id: string) => {
    try { await supplierService.deleteSupplier(id); setDeleteConfirmId(null); fetchSuppliers(); if (selectedItem?.id === id) closeDetail(); } catch (e) { console.error('Error deleting:', e); alert('Lỗi khi xóa nhà cung cấp'); }
  };
  const handleExport = async () => {
    try { await supplierService.exportToExcel({ search: debouncedSearch || undefined, phanLoaiNCC }); } catch (e) { console.error(e); alert('Lỗi khi xuất Excel'); }
  };
  const copyCode = async () => {
    if (!selectedItem?.maNhaCungCap) return;
    try { await navigator.clipboard.writeText(selectedItem.maNhaCungCap); setCopied(true); setTimeout(() => setCopied(false), 1400); } catch {}
  };

  return (
    <div>
      {/* Toolbar */}
      <div className="mb-6 flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4 sm:items-center justify-between">
        <div className="relative w-full sm:w-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
          <input type="text" placeholder="Tìm kiếm nhà cung cấp..." value={search} onChange={(e) => setSearch(e.target.value)} className={`pl-10 pr-4 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 ${ac.ring} w-full sm:w-64`} />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"><Download className="h-4 w-4" /> Xuất Excel</button>
          <button onClick={openAddModal} className={`flex items-center gap-2 px-4 py-2 text-white rounded-md ${ac.btn}`}><Plus className="h-4 w-4" /> Thêm nhà cung cấp</button>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-8"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-400 mx-auto" /><p className="mt-4 text-gray-600">Đang tải dữ liệu...</p></div>
      ) : suppliers.length === 0 ? (
        <div className="text-center py-8"><p className="text-gray-500">Chưa có nhà cung cấp nào</p></div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px]">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">STT</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mã NCC</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tên NCC</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Loại cung cấp</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quốc gia</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Liên hệ</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Loại hình</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trạng thái</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Doanh chi</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">NV tạo</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hoạt động</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {suppliers.map((item, index) => (
                <tr key={item.id} onClick={() => openDetail(item)} className="hover:bg-gray-50 cursor-pointer">
                  <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-900">{(page - 1) * limit + index + 1}</td>
                  <td className={`px-3 py-3 whitespace-nowrap text-sm font-medium ${ac.code}`}>{item.maNhaCungCap}</td>
                  <td className="px-3 py-3 text-sm text-gray-900 max-w-xs truncate" title={item.tenNhaCungCap}>{item.tenNhaCungCap}</td>
                  <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-900">{item.loaiCungCap}</td>
                  <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-900"><div className="flex items-center"><Globe className="w-3 h-3 mr-1 text-gray-400" />{item.quocGia}</div></td>
                  <td className="px-3 py-3 text-sm text-gray-900"><div><div className="font-medium">{item.nguoiLienHe}</div><div className="text-xs text-gray-500 flex items-center"><Phone className="w-3 h-3 mr-1" />{item.soDienThoai}</div></div></td>
                  <td className="px-3 py-3 whitespace-nowrap text-sm"><span className={`px-2 py-1 rounded-full text-xs font-medium ${item.loaiHinh === 'Sản xuất' ? ac.badgeLoaiSx : ac.badgeLoaiTm}`}>{item.loaiHinh}</span></td>
                  <td className="px-3 py-3 whitespace-nowrap text-sm"><span className={`px-2 py-1 rounded-full text-xs font-medium ${item.trangThai === 'Đang cung cấp' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{item.trangThai}</span></td>
                  <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-900">{item.doanhChi ? `${(item.doanhChi / 1000000).toFixed(0)}M` : '-'}</td>
                  <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-900">{item.employee?.user ? `${item.employee.user.lastName} ${item.employee.user.firstName}` : '-'}</td>
                  <td className="px-3 py-3 whitespace-nowrap text-sm"><div className="flex items-center gap-2"><button onClick={(e) => { e.stopPropagation(); openEditModal(item); }} className="text-green-600 hover:text-green-800" title="Sửa"><Edit className="w-4 h-4" /></button><button onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(item.id); }} className="text-red-600 hover:text-red-800" title="Xóa"><Trash2 className="w-4 h-4" /></button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <PaginationBar page={page} limit={limit} total={total} totalPages={totalPages} onPageChange={setPage} onLimitChange={handleLimitChange} label="nhà cung cấp" ariaLabel="Phân trang nhà cung cấp" />

      {/* Detail modal — redesigned */}
      <Modal isOpen={detailOpen} onClose={closeDetail} closeOnBackdrop ariaLabel="Chi tiết nhà cung cấp">
        {selectedItem && (
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[88vh] flex flex-col overflow-hidden">
            {/* Header — sticky */}
            <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-5 sm:px-6 py-4 flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${ac.codeBg}`}>
                    <Tag className="w-3 h-3" /> {selectedItem.maNhaCungCap}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${selectedItem.trangThai === 'Đang cung cấp' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{selectedItem.trangThai}</span>
                  <span className={`px-1.5 py-0.5 rounded text-[11px] font-medium border ${selectedItem.phanLoaiNCC === 'Thiết bị' ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>{selectedItem.phanLoaiNCC ?? 'NVL'}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs ${selectedItem.loaiHinh === 'Sản xuất' ? ac.badgeLoaiSx : ac.badgeLoaiTm}`}>{selectedItem.loaiHinh}</span>
                </div>
                <h2 className="mt-2 text-lg font-semibold text-gray-900 leading-tight truncate" title={selectedItem.tenNhaCungCap}>{selectedItem.tenNhaCungCap}</h2>
                <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1.5"><Tag className="w-3 h-3" />{selectedItem.loaiCungCap} · <Globe className="w-3 h-3" />{selectedItem.quocGia || 'Việt Nam'}</p>
              </div>
              <button onClick={closeDetail} aria-label="Đóng" className="shrink-0 p-1.5 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100"><X className="w-5 h-5" /></button>
            </div>

            {/* Body — scrollable */}
            <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-5 space-y-5">
              {/* Primary facts — compact 2-col, no card-per-field */}
              <div className="rounded-lg border border-gray-200 overflow-hidden">
                <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-gray-200">
                  {/* Left: contact */}
                  <div className="p-4 space-y-3">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5"><User className="w-3.5 h-3.5" /> Liên hệ</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-start justify-between gap-3">
                        <span className="text-gray-500 text-xs">Người liên hệ</span>
                        <span className="font-medium text-gray-900 text-right">{selectedItem.nguoiLienHe}</span>
                      </div>
                      <div className="flex items-start justify-between gap-3">
                        <span className="text-gray-500 text-xs inline-flex items-center gap-1"><Phone className="w-3 h-3" /> SĐT</span>
                        <a href={`tel:${selectedItem.soDienThoai}`} className={`font-medium hover:underline ${ac.code}`}>{selectedItem.soDienThoai}</a>
                      </div>
                      <div className="flex items-start justify-between gap-3">
                        <span className="text-gray-500 text-xs inline-flex items-center gap-1"><Mail className="w-3 h-3" /> Email</span>
                        {selectedItem.emailLienHe ? <a href={`mailto:${selectedItem.emailLienHe}`} className="font-medium text-gray-900 hover:underline text-right truncate max-w-[180px]" title={selectedItem.emailLienHe}>{selectedItem.emailLienHe}</a> : <span className="text-gray-400">—</span>}
                      </div>
                    </div>
                  </div>
                  {/* Right: org & money */}
                  <div className="p-4 space-y-3">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5" /> Thông tin chung</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-start justify-between gap-3"><span className="text-gray-500 text-xs">Doanh chi</span><span className="font-semibold text-gray-900">{fmtMoney(selectedItem.doanhChi)}</span></div>
                      <div className="flex items-start justify-between gap-3"><span className="text-gray-500 text-xs">Quốc gia</span><span className="text-gray-900">{selectedItem.quocGia || 'Việt Nam'}</span></div>
                      {selectedItem.khaNang && <div className="flex items-start justify-between gap-3"><span className="text-gray-500 text-xs">Khả năng</span><span className="text-gray-900 text-right max-w-[170px] truncate" title={selectedItem.khaNang}>{selectedItem.khaNang}</span></div>}
                    </div>
                  </div>
                </div>
                {/* Address row — full width */}
                <div className="border-t border-gray-200 px-4 py-3 flex items-start gap-2.5 text-sm">
                  <MapPin className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs text-gray-500">Địa chỉ</div>
                    <div className="text-gray-900 leading-snug">{selectedItem.diaChi}</div>
                    {selectedItem.website && <a href={selectedItem.website} target="_blank" rel="noopener noreferrer" className={`inline-flex items-center gap-1 text-xs mt-1 hover:underline ${ac.code}`}><ExternalLink className="w-3 h-3" />{selectedItem.website}</a>}
                  </div>
                </div>
                {/* Meta — single compact line */}
                <div className="border-t border-gray-100 bg-gray-50/70 px-4 py-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-600">
                  <span className="inline-flex items-center gap-1"><User className="w-3 h-3" />{selectedItem.employee?.user ? `${selectedItem.employee.user.lastName} ${selectedItem.employee.user.firstName}`.trim() : `#${String(selectedItem.employeeId).slice(0,8)}`}</span>
                  <span className="inline-flex items-center gap-1"><Calendar className="w-3 h-3" />Tạo {fmtDate(selectedItem.createdAt)}</span>
                  <span className="inline-flex items-center gap-1"><Shield className="w-3 h-3" />Cập nhật {fmtDate(selectedItem.updatedAt)}</span>
                </div>
              </div>

              {/* Tabs */}
              <div className="pt-1">
                <div className="flex gap-1 border-b border-gray-200">
                  <button onClick={() => setHistoryDetailTab('info')} className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${historyDetailTab === 'info' ? ac.tabActive : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Thông tin</button>
                  <button onClick={() => setHistoryDetailTab('history')} className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${historyDetailTab === 'history' ? ac.tabActive : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Lịch sử mua hàng</button>
                </div>

                {historyDetailTab === 'info' && (
                  <div className="pt-3 text-xs text-gray-500 leading-relaxed">
                    Doanh chi được tính tự động từ lịch sử mua thực tế (trạng thái <span className="font-medium text-gray-700">Đã duyệt / Hoàn thành</span>, ưu tiên giá &amp; số lượng thực tế), không nhập tay.
                  </div>
                )}

                {historyDetailTab === 'history' && (
                  <div className="pt-4 space-y-3">
                    {historyLoading ? (
                      <div className="text-center py-6 text-sm text-gray-500">Đang tải lịch sử...</div>
                    ) : (
                      <>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                          <div className="bg-gray-50 border border-gray-100 p-3 rounded-lg"><div className="text-xs text-gray-500">Tổng đơn hàng</div><div className="text-lg font-bold text-gray-800">{historyStats?.totalOrders ?? 0}</div></div>
                          <div className="bg-gray-50 border border-gray-100 p-3 rounded-lg"><div className="text-xs text-gray-500">Tổng chi (thực tế)</div><div className="text-lg font-bold text-green-700">{historyStats?.totalSpend ? `${Number(historyStats.totalSpend).toLocaleString('vi-VN')}đ` : '0đ'}</div></div>
                          <div className="bg-gray-50 border border-gray-100 p-3 rounded-lg"><div className="text-xs text-gray-500">Chưa xong</div><div className="text-lg font-bold text-orange-600">{historyStats?.pendingOrders ?? 0}</div></div>
                          <div className="bg-gray-50 border border-gray-100 p-3 rounded-lg"><div className="text-xs text-gray-500">Đơn gần nhất</div><div className="text-xs font-medium text-gray-800">{historyStats?.lastOrderAt ? fmtDate(historyStats.lastOrderAt) : '—'}</div></div>
                        </div>
                        {historyOrders.length > 0 ? (
                          <div className="border border-gray-200 rounded-md overflow-x-auto">
                            <table className="w-full min-w-[520px] text-sm">
                              <thead><tr className="bg-gray-50 text-xs text-gray-500"><th className="px-3 py-2 text-left">Mã</th><th className="px-3 py-2 text-left">Ngày</th><th className="px-3 py-2 text-left">Trạng thái</th><th className="px-3 py-2 text-right">Mục đích</th></tr></thead>
                              <tbody>
                                {historyOrders.map((pr: any) => (
                                  <tr key={pr.id} className="border-t border-gray-100 hover:bg-gray-50 text-xs">
                                    <td className={`px-3 py-2 font-medium ${ac.code}`}>{pr.maYeuCau}</td>
                                    <td className="px-3 py-2">{pr.ngayYeuCau ? fmtDate(pr.ngayYeuCau) : '—'}</td>
                                    <td className="px-3 py-2"><span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${pr.trangThai === 'Hoàn thành' ? 'bg-green-100 text-green-800' : pr.trangThai === 'Đã duyệt' ? 'bg-green-100 text-green-800' : pr.trangThai === 'Chờ duyệt' ? 'bg-yellow-100 text-yellow-800' : 'bg-orange-100 text-orange-800'}`}>{pr.trangThai}</span></td>
                                    <td className="px-3 py-2 text-right text-gray-600 truncate max-w-[180px]" title={pr.mucDichYeuCau}>{pr.mucDichYeuCau ?? '—'}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <div className="text-center py-4 text-sm text-gray-400 border border-dashed border-gray-200 rounded-lg">Chưa có đơn hàng nào cho nhà cung cấp này.</div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Footer — sticky */}
            <div className="sticky bottom-0 z-10 bg-white border-t border-gray-200 px-5 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button onClick={copyCode} className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border rounded-md hover:bg-gray-50 ${copied ? 'text-green-700 border-green-200 bg-green-50' : 'text-gray-700 border-gray-200'}`}>
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}{copied ? 'Đã sao chép' : 'Sao chép mã'}
                </button>
                {selectedItem.website && (
                  <a href={selectedItem.website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-gray-200 rounded-md text-gray-700 hover:bg-gray-50">
                    <ExternalLink className="w-3.5 h-3.5" /> Website
                  </a>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button onClick={closeDetail} className="px-4 py-2 text-sm border border-gray-200 rounded-md text-gray-700 hover:bg-gray-50">Đóng</button>
                <button onClick={() => setDeleteConfirmId(selectedItem.id)} className="px-3 py-2 text-sm border border-red-200 text-red-700 rounded-md hover:bg-red-50 inline-flex items-center gap-1.5"><Trash2 className="w-4 h-4" /> Xóa</button>
                <button onClick={() => { const s = selectedItem; closeDetail(); if (s) openEditModal(s); }} className={`px-4 py-2 text-sm text-white rounded-md ${ac.btn} inline-flex items-center gap-1.5`}><Edit className="w-4 h-4" /> Chỉnh sửa</button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Add modal — unchanged, keep simple */}
      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} closeOnBackdrop ariaLabel="Thêm nhà cung cấp">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
          <div className="px-6 py-4 border-b flex justify-between items-center sticky top-0 bg-white"><h2 className="text-lg font-semibold">Thêm nhà cung cấp mới</h2><button onClick={() => setIsAddOpen(false)} className="text-gray-500 hover:text-gray-700"><X className="w-5 h-5" /></button></div>
          <form onSubmit={(e) => { e.preventDefault(); handleAdd(); }} className="flex-1 overflow-y-auto p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Mã NCC</label><input type="text" value={addForm.maNhaCungCap || ''} disabled className="w-full border rounded-md px-3 py-2 bg-gray-100" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Tên nhà cung cấp *</label><input type="text" value={addForm.tenNhaCungCap || ''} onChange={(e) => setAddForm({...addForm, tenNhaCungCap: e.target.value})} required className="w-full border rounded-md px-3 py-2" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Loại cung cấp *</label><input type="text" placeholder={phanLoaiNCC === 'Thiết bị' ? 'VD: Máy móc, Thiết bị điện...' : 'VD: Thủy sản, Rau củ, Gia vị...'} value={addForm.loaiCungCap || ''} onChange={(e) => setAddForm({...addForm, loaiCungCap: e.target.value})} required className="w-full border rounded-md px-3 py-2" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Quốc gia</label><input type="text" value={addForm.quocGia || 'Việt Nam'} onChange={(e) => setAddForm({...addForm, quocGia: e.target.value})} className="w-full border rounded-md px-3 py-2" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Website</label><input type="text" value={addForm.website || ''} onChange={(e) => setAddForm({...addForm, website: e.target.value})} className="w-full border rounded-md px-3 py-2" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Người liên hệ *</label><input type="text" value={addForm.nguoiLienHe || ''} onChange={(e) => setAddForm({...addForm, nguoiLienHe: e.target.value})} required className="w-full border rounded-md px-3 py-2" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Số điện thoại *</label><input type="text" value={addForm.soDienThoai || ''} onChange={(e) => setAddForm({...addForm, soDienThoai: e.target.value})} required className="w-full border rounded-md px-3 py-2" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Email liên hệ</label><input type="email" value={addForm.emailLienHe || ''} onChange={(e) => setAddForm({...addForm, emailLienHe: e.target.value})} className="w-full border rounded-md px-3 py-2" /></div>
              <div className="col-span-1 sm:col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1">Địa chỉ *</label><input type="text" value={addForm.diaChi || ''} onChange={(e) => setAddForm({...addForm, diaChi: e.target.value})} required className="w-full border rounded-md px-3 py-2" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Khả năng cung cấp</label><input type="text" value={addForm.khaNang || ''} onChange={(e) => setAddForm({...addForm, khaNang: e.target.value})} className="w-full border rounded-md px-3 py-2" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Loại hình *</label><select value={addForm.loaiHinh || 'Sản xuất'} onChange={(e) => setAddForm({...addForm, loaiHinh: e.target.value})} className="w-full border rounded-md px-3 py-2"><option value="Sản xuất">Sản xuất</option><option value="Thương mại">Thương mại</option></select></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Trạng thái</label><select value={addForm.trangThai || 'Đang cung cấp'} onChange={(e) => setAddForm({...addForm, trangThai: e.target.value})} className="w-full border rounded-md px-3 py-2"><option value="Đang cung cấp">Đang cung cấp</option><option value="Ngừng cung cấp">Ngừng cung cấp</option></select></div>
              <p className="col-span-1 sm:col-span-2 text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded px-3 py-2">Doanh chi được tính tự động từ lịch sử mua thực tế (Đã duyệt/Hoàn thành, ưu tiên giá &amp; số lượng thực tế), không nhập tay.</p>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button type="button" onClick={() => setIsAddOpen(false)} className="px-4 py-2 border border-gray-200 rounded-md text-gray-700 hover:bg-gray-50">Hủy</button>
              <button type="submit" disabled={formLoading} className={`px-4 py-2 text-white rounded-md disabled:opacity-50 ${ac.btn}`}>{formLoading ? 'Đang lưu...' : 'Thêm mới'}</button>
            </div>
          </form>
        </div>
      </Modal>

      <Modal isOpen={isEditOpen} onClose={() => { setIsEditOpen(false); setEditingSupplier(null); }} closeOnBackdrop ariaLabel="Sửa nhà cung cấp">
        {editingSupplier && (
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b flex justify-between items-center sticky top-0 bg-white"><h2 className="text-lg font-semibold">Sửa nhà cung cấp - {editingSupplier.maNhaCungCap}</h2><button onClick={() => { setIsEditOpen(false); setEditingSupplier(null); }} className="text-gray-500 hover:text-gray-700"><X className="w-5 h-5" /></button></div>
            <form onSubmit={(e) => { e.preventDefault(); handleEdit(); }} className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Tên nhà cung cấp *</label><input type="text" value={editForm.tenNhaCungCap || ''} onChange={(e) => setEditForm({...editForm, tenNhaCungCap: e.target.value})} required className="w-full border rounded-md px-3 py-2" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Loại cung cấp *</label><input type="text" value={editForm.loaiCungCap || ''} onChange={(e) => setEditForm({...editForm, loaiCungCap: e.target.value})} required className="w-full border rounded-md px-3 py-2" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Quốc gia</label><input type="text" value={editForm.quocGia || 'Việt Nam'} onChange={(e) => setEditForm({...editForm, quocGia: e.target.value})} className="w-full border rounded-md px-3 py-2" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Website</label><input type="text" value={editForm.website || ''} onChange={(e) => setEditForm({...editForm, website: e.target.value})} className="w-full border rounded-md px-3 py-2" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Người liên hệ *</label><input type="text" value={editForm.nguoiLienHe || ''} onChange={(e) => setEditForm({...editForm, nguoiLienHe: e.target.value})} required className="w-full border rounded-md px-3 py-2" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Số điện thoại *</label><input type="text" value={editForm.soDienThoai || ''} onChange={(e) => setEditForm({...editForm, soDienThoai: e.target.value})} required className="w-full border rounded-md px-3 py-2" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Email liên hệ</label><input type="email" value={editForm.emailLienHe || ''} onChange={(e) => setEditForm({...editForm, emailLienHe: e.target.value})} className="w-full border rounded-md px-3 py-2" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Địa chỉ *</label><input type="text" value={editForm.diaChi || ''} onChange={(e) => setEditForm({...editForm, diaChi: e.target.value})} required className="w-full border rounded-md px-3 py-2" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Khả năng cung cấp</label><input type="text" value={editForm.khaNang || ''} onChange={(e) => setEditForm({...editForm, khaNang: e.target.value})} className="w-full border rounded-md px-3 py-2" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Loại hình *</label><select value={editForm.loaiHinh || 'Sản xuất'} onChange={(e) => setEditForm({...editForm, loaiHinh: e.target.value})} className="w-full border rounded-md px-3 py-2"><option value="Sản xuất">Sản xuất</option><option value="Thương mại">Thương mại</option></select></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Trạng thái</label><select value={editForm.trangThai || 'Đang cung cấp'} onChange={(e) => setEditForm({...editForm, trangThai: e.target.value})} className="w-full border rounded-md px-3 py-2"><option value="Đang cung cấp">Đang cung cấp</option><option value="Ngừng cung cấp">Ngừng cung cấp</option></select></div>
                <div className="col-span-1 sm:col-span-2 text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded px-3 py-2">Doanh chi hiện tại: <span className="font-medium text-gray-700">{editingSupplier.doanhChi ? `${Number(editingSupplier.doanhChi).toLocaleString('vi-VN')} VNĐ` : '—'}</span> · tự động cập nhật khi YCMH sang Đã duyệt/Hoàn thành hoặc xác nhận giá thực tế, không sửa tay.</div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => { setIsEditOpen(false); setEditingSupplier(null); }} className="px-4 py-2 border border-gray-200 rounded-md text-gray-700 hover:bg-gray-50">Hủy</button>
                <button type="submit" disabled={formLoading} className={`px-4 py-2 text-white rounded-md disabled:opacity-50 ${ac.btn}`}>{formLoading ? 'Đang lưu...' : 'Lưu thay đổi'}</button>
              </div>
            </form>
          </div>
        )}
      </Modal>

      {/* Delete confirm */}
      <Modal isOpen={!!deleteConfirmId} onClose={() => setDeleteConfirmId(null)} closeOnBackdrop ariaLabel="Xác nhận xóa">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
          <h3 className="text-base font-semibold text-gray-900">Xác nhận xóa</h3>
          <p className="text-sm text-gray-600 mt-2">Bạn có chắc chắn muốn xóa nhà cung cấp này? Hành động này không thể hoàn tác.</p>
          <div className="flex justify-end gap-3 mt-6">
            <button onClick={() => setDeleteConfirmId(null)} className="px-4 py-2 border border-gray-200 rounded-md text-gray-700 hover:bg-gray-50">Hủy</button>
            <button onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)} className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700">Xóa</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
