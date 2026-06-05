import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Eye, X, Download, Search } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getFileUrl } from '../config/api';
import apiClient from '../services/apiClient';
import FileUpload from './FileUpload';
import Modal from './Modal';

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

const DON_VI_OPTIONS = ['Cái', 'Bộ', 'Mét', 'Kg', 'Lít', 'Cuộn', 'Tấm', 'Khác'];
const TRANG_THAI_OPTIONS = ['Đang sử dụng', 'Chưa sử dụng', 'Hết hàng'];

const trangThaiBadge = (tt: string) => {
  if (tt === 'Đang sử dụng') return 'bg-blue-100 text-blue-700';
  if (tt === 'Hết hàng') return 'bg-red-100 text-red-700';
  return 'bg-gray-100 text-gray-600';
};

const SparePartList = () => {
  const { user } = useAuth();
  const [parts, setParts] = useState<SparePart[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const itemsPerPage = 10;

  const [search, setSearch] = useState('');
  const [filterLoai, setFilterLoai] = useState('');
  const [filterTrangThai, setFilterTrangThai] = useState('');

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

  const canWrite = user?.role === 'ADMIN' || user?.role === 'DEPARTMENT_HEAD' || user?.role === 'TEAM_LEAD';
  const canDelete = user?.role === 'ADMIN' || user?.role === 'DEPARTMENT_HEAD';

  useEffect(() => { fetchParts(); }, [currentPage, filterLoai, filterTrangThai]);

  const fetchParts = async () => {
    try {
      setLoading(true);
      const params: Record<string, string | number> = { page: currentPage, limit: itemsPerPage };
      if (search) params.search = search;
      if (filterLoai) params.loai = filterLoai;
      if (filterTrangThai) params.trangThai = filterTrangThai;

      const response = await apiClient.get('/spare-parts', { params }) as any;
      const result = response?.data ?? response;
      setParts(Array.isArray(result) ? result : []);
      if (response?.pagination) {
        setTotalPages(response.pagination.totalPages);
        setTotal(response.pagination.total);
      }
    } catch (error) {
      console.error('Error fetching spare parts:', error);
    } finally {
      setLoading(false);
    }
  };

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
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const fd = new FormData();
      Object.entries(formData).forEach(([k, v]) => { if (v !== '') fd.append(k, v); });
      if (selectedFile) fd.append('file', selectedFile);

      if (editingPart) {
        await apiClient.put(`/spare-parts/${editingPart.id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      } else {
        await apiClient.post('/spare-parts', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      }
      setIsModalOpen(false);
      fetchParts();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Có lỗi xảy ra');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa linh kiện này?')) return;
    try {
      await apiClient.delete(`/spare-parts/${id}`);
      fetchParts();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Lỗi khi xóa');
    }
  };

  const handleExport = async () => {
    try {
      const params: Record<string, string> = {};
      if (search) params.search = search;
      if (filterLoai) params.loai = filterLoai;
      if (filterTrangThai) params.trangThai = filterTrangThai;

      const response = await apiClient.get('/spare-parts/export/excel', { params, responseType: 'blob' }) as any;
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
            onKeyDown={e => e.key === 'Enter' && (setCurrentPage(1), fetchParts())}
            className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button onClick={() => { setCurrentPage(1); fetchParts(); }} className="px-3 py-2 text-sm bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200">
            <Search size={16} />
          </button>
        </div>
        <select value={filterLoai} onChange={e => { setFilterLoai(e.target.value); setCurrentPage(1); }} className="px-3 py-2 text-sm border border-gray-300 rounded-lg">
          <option value="">Tất cả loại</option>
          {LOAI_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select value={filterTrangThai} onChange={e => { setFilterTrangThai(e.target.value); setCurrentPage(1); }} className="px-3 py-2 text-sm border border-gray-300 rounded-lg">
          <option value="">Tất cả trạng thái</option>
          {TRANG_THAI_OPTIONS.map(v => <option key={v} value={v}>{v}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">STT</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Mã linh kiện</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Tên linh kiện</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Loại</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Đơn vị</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">SL tồn</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Nhà cung cấp</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Trạng thái</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-400">Đang tải...</td></tr>
              ) : parts.length === 0 ? (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-400">Không có dữ liệu</td></tr>
              ) : parts.map((part, idx) => (
                <tr key={part.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-500">{(currentPage - 1) * itemsPerPage + idx + 1}</td>
                  <td className="px-4 py-3 font-mono text-blue-700 font-medium">{part.maLinhKien}</td>
                  <td className="px-4 py-3 font-medium text-gray-800">{part.tenLinhKien}</td>
                  <td className="px-4 py-3 text-gray-600">{loaiLabel(part.loai)}</td>
                  <td className="px-4 py-3 text-gray-600">{part.donVi}</td>
                  <td className="px-4 py-3 font-medium">{part.soLuongTon}</td>
                  <td className="px-4 py-3 text-gray-600">{part.nhaCungCap ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${trangThaiBadge(part.trangThai)}`}>
                      {part.trangThai}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => openViewModal(part)} className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded"><Eye size={14} /></button>
                      {canWrite && <button onClick={() => openEditModal(part)} className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded"><Edit size={14} /></button>}
                      {canDelete && <button onClick={() => handleDelete(part.id)} className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded"><Trash2 size={14} /></button>}
                    </div>
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
              <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-40">Trước</button>
              <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-40">Sau</button>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} showBackdrop>
        <div className="bg-white rounded-xl shadow-xl w-full max-w-lg flex flex-col max-h-[calc(100vh-2rem)]" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between p-5 border-b shrink-0">
            <h3 className="font-semibold text-gray-800">
              {isViewMode ? 'Chi tiết linh kiện' : editingPart ? 'Chỉnh sửa linh kiện' : 'Thêm linh kiện mới'}
            </h3>
            <button onClick={() => setIsModalOpen(false)} className="p-1.5 hover:bg-gray-100 rounded"><X size={18} /></button>
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
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="p-5 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tên linh kiện <span className="text-red-500">*</span></label>
                  <input required type="text" value={formData.tenLinhKien} onChange={e => setFormData(f => ({ ...f, tenLinhKien: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Nhập tên linh kiện" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Loại <span className="text-red-500">*</span></label>
                    <select required value={formData.loai} onChange={e => setFormData(f => ({ ...f, loai: e.target.value }))} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg">
                      {LOAI_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Đơn vị <span className="text-red-500">*</span></label>
                    <select required value={formData.donVi} onChange={e => setFormData(f => ({ ...f, donVi: e.target.value }))} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg">
                      {DON_VI_OPTIONS.map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
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
                <div className="grid grid-cols-2 gap-3">
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
                  <FileUpload onFileSelect={setSelectedFile} />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">Hủy</button>
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
