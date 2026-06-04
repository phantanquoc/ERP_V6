import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Eye, X, Download, Search, Filter } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { API_BASE_URL, getFileUrl } from '../config/api';
import apiClient from '../services/apiClient';
import FileUpload from './FileUpload';

interface FaultRecord {
  id: string;
  maLoi: string;
  tenLoi: string;
  moTa: string;
  maHeThong?: string;
  mucDo: string;
  trangThai: string;
  nguoiPhatHien: string;
  ngayPhatHien: string;
  fileDinhKem?: string;
  createdAt: string;
}

const MUC_DO_OPTIONS = ['Nghiêm trọng', 'Trung bình', 'Nhẹ'];
const TRANG_THAI_OPTIONS = ['Đang theo dõi', 'Đã xử lý', 'Tái phát'];

const mucDoBadge = (mucDo: string) => {
  if (mucDo === 'Nghiêm trọng') return 'bg-red-100 text-red-700';
  if (mucDo === 'Trung bình') return 'bg-yellow-100 text-yellow-700';
  return 'bg-green-100 text-green-700';
};

const trangThaiBadge = (trangThai: string) => {
  if (trangThai === 'Đang theo dõi') return 'bg-blue-100 text-blue-700';
  if (trangThai === 'Đã xử lý') return 'bg-green-100 text-green-700';
  return 'bg-orange-100 text-orange-700';
};

const FaultRecordList = () => {
  const { user } = useAuth();
  const [records, setRecords] = useState<FaultRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const itemsPerPage = 10;

  const [search, setSearch] = useState('');
  const [filterMucDo, setFilterMucDo] = useState('');
  const [filterTrangThai, setFilterTrangThai] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewMode, setIsViewMode] = useState(false);
  const [editingRecord, setEditingRecord] = useState<FaultRecord | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [formData, setFormData] = useState({
    tenLoi: '',
    moTa: '',
    maHeThong: '',
    mucDo: 'Trung bình',
    trangThai: 'Đang theo dõi',
    nguoiPhatHien: '',
    ngayPhatHien: new Date().toISOString().split('T')[0],
  });

  const canWrite = user?.role === 'ADMIN' || user?.role === 'DEPARTMENT_HEAD' || user?.role === 'TEAM_LEAD';
  const canDelete = user?.role === 'ADMIN' || user?.role === 'DEPARTMENT_HEAD';

  useEffect(() => {
    fetchRecords();
  }, [currentPage, filterMucDo, filterTrangThai]);

  const fetchRecords = async () => {
    try {
      setLoading(true);
      const params: Record<string, string | number> = { page: currentPage, limit: itemsPerPage };
      if (search) params.search = search;
      if (filterMucDo) params.mucDo = filterMucDo;
      if (filterTrangThai) params.trangThai = filterTrangThai;

      const response = await apiClient.get('/fault-records', { params }) as any;
      const result = response?.data ?? response;
      setRecords(Array.isArray(result) ? result : []);
      if (response?.pagination) {
        setTotalPages(response.pagination.totalPages);
        setTotal(response.pagination.total);
      }
    } catch (error) {
      console.error('Error fetching fault records:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setCurrentPage(1);
    fetchRecords();
  };

  const openCreateModal = () => {
    setEditingRecord(null);
    setIsViewMode(false);
    setSelectedFile(null);
    setFormData({
      tenLoi: '',
      moTa: '',
      maHeThong: '',
      mucDo: 'Trung bình',
      trangThai: 'Đang theo dõi',
      nguoiPhatHien: user ? `${user.lastName} ${user.firstName}` : '',
      ngayPhatHien: new Date().toISOString().split('T')[0],
    });
    setIsModalOpen(true);
  };

  const openEditModal = (record: FaultRecord) => {
    setEditingRecord(record);
    setIsViewMode(false);
    setSelectedFile(null);
    setFormData({
      tenLoi: record.tenLoi,
      moTa: record.moTa,
      maHeThong: record.maHeThong ?? '',
      mucDo: record.mucDo,
      trangThai: record.trangThai,
      nguoiPhatHien: record.nguoiPhatHien,
      ngayPhatHien: record.ngayPhatHien?.split('T')[0] ?? '',
    });
    setIsModalOpen(true);
  };

  const openViewModal = (record: FaultRecord) => {
    setEditingRecord(record);
    setIsViewMode(true);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const fd = new FormData();
      Object.entries(formData).forEach(([k, v]) => { if (v !== '') fd.append(k, v); });
      if (selectedFile) fd.append('file', selectedFile);

      if (editingRecord) {
        await apiClient.put(`/fault-records/${editingRecord.id}`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        await apiClient.post('/fault-records', fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }
      setIsModalOpen(false);
      fetchRecords();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Có lỗi xảy ra');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa bản ghi lỗi này?')) return;
    try {
      await apiClient.delete(`/fault-records/${id}`);
      fetchRecords();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Lỗi khi xóa');
    }
  };

  const handleExport = async () => {
    try {
      const params: Record<string, string> = {};
      if (search) params.search = search;
      if (filterMucDo) params.mucDo = filterMucDo;
      if (filterTrangThai) params.trangThai = filterTrangThai;

      const response = await apiClient.get('/fault-records/export/excel', {
        params,
        responseType: 'blob',
      }) as any;

      const url = window.URL.createObjectURL(new Blob([response]));
      const link = document.createElement('a');
      link.href = url;
      link.download = `danh-sach-loi-${Date.now()}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export error:', error);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-800">Danh sách lỗi</h2>
          <p className="text-sm text-gray-500 mt-0.5">Tổng: {total} bản ghi</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <Download size={16} /> Xuất Excel
          </button>
          {canWrite && (
            <button
              onClick={openCreateModal}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700"
            >
              <Plus size={16} /> Thêm lỗi
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="flex-1 min-w-[200px] flex gap-2">
          <input
            type="text"
            placeholder="Tìm kiếm mã lỗi, tên lỗi..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button onClick={handleSearch} className="px-3 py-2 text-sm bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200">
            <Search size={16} />
          </button>
        </div>
        <select
          value={filterMucDo}
          onChange={e => { setFilterMucDo(e.target.value); setCurrentPage(1); }}
          className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none"
        >
          <option value="">Tất cả mức độ</option>
          {MUC_DO_OPTIONS.map(v => <option key={v} value={v}>{v}</option>)}
        </select>
        <select
          value={filterTrangThai}
          onChange={e => { setFilterTrangThai(e.target.value); setCurrentPage(1); }}
          className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none"
        >
          <option value="">Tất cả trạng thái</option>
          {TRANG_THAI_OPTIONS.map(v => <option key={v} value={v}>{v}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">STT</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Mã lỗi</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Tên lỗi</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Mã hệ thống</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Mức độ</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Trạng thái</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Người phát hiện</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Ngày phát hiện</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-400">Đang tải...</td></tr>
              ) : records.length === 0 ? (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-400">Không có dữ liệu</td></tr>
              ) : records.map((record, idx) => (
                <tr key={record.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-500">{(currentPage - 1) * itemsPerPage + idx + 1}</td>
                  <td className="px-4 py-3 font-mono text-blue-700 font-medium">{record.maLoi}</td>
                  <td className="px-4 py-3 font-medium text-gray-800">{record.tenLoi}</td>
                  <td className="px-4 py-3 text-gray-600">{record.maHeThong ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${mucDoBadge(record.mucDo)}`}>
                      {record.mucDo}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${trangThaiBadge(record.trangThai)}`}>
                      {record.trangThai}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{record.nguoiPhatHien}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {record.ngayPhatHien ? new Date(record.ngayPhatHien).toLocaleDateString('vi-VN') : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => openViewModal(record)} className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded">
                        <Eye size={14} />
                      </button>
                      {canWrite && (
                        <button onClick={() => openEditModal(record)} className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded">
                          <Edit size={14} />
                        </button>
                      )}
                      {canDelete && (
                        <button onClick={() => handleDelete(record.id)} className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
            <p className="text-sm text-gray-500">
              Trang {currentPage} / {totalPages}
            </p>
            <div className="flex gap-1">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => p - 1)}
                className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-40"
              >
                Trước
              </button>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => p + 1)}
                className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-40"
              >
                Sau
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b">
              <h3 className="font-semibold text-gray-800">
                {isViewMode ? 'Chi tiết lỗi' : editingRecord ? 'Chỉnh sửa lỗi' : 'Thêm lỗi mới'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1.5 hover:bg-gray-100 rounded">
                <X size={18} />
              </button>
            </div>

            {isViewMode && editingRecord ? (
              <div className="p-5 space-y-3">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-gray-500">Mã lỗi:</span><p className="font-mono font-medium text-blue-700">{editingRecord.maLoi}</p></div>
                  <div><span className="text-gray-500">Ngày phát hiện:</span><p>{new Date(editingRecord.ngayPhatHien).toLocaleDateString('vi-VN')}</p></div>
                  <div className="col-span-2"><span className="text-gray-500">Tên lỗi:</span><p className="font-medium">{editingRecord.tenLoi}</p></div>
                  <div className="col-span-2"><span className="text-gray-500">Mô tả:</span><p className="text-gray-700 whitespace-pre-wrap">{editingRecord.moTa}</p></div>
                  <div><span className="text-gray-500">Mã hệ thống:</span><p>{editingRecord.maHeThong ?? '—'}</p></div>
                  <div><span className="text-gray-500">Người phát hiện:</span><p>{editingRecord.nguoiPhatHien}</p></div>
                  <div>
                    <span className="text-gray-500">Mức độ:</span>
                    <p><span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium mt-1 ${mucDoBadge(editingRecord.mucDo)}`}>{editingRecord.mucDo}</span></p>
                  </div>
                  <div>
                    <span className="text-gray-500">Trạng thái:</span>
                    <p><span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium mt-1 ${trangThaiBadge(editingRecord.trangThai)}`}>{editingRecord.trangThai}</span></p>
                  </div>
                </div>
                {editingRecord.fileDinhKem && (
                  <div>
                    <span className="text-sm text-gray-500">File đính kèm:</span>
                    <a href={getFileUrl(editingRecord.fileDinhKem)} target="_blank" rel="noreferrer" className="ml-2 text-sm text-blue-600 hover:underline">
                      Xem file
                    </a>
                  </div>
                )}
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="p-5 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tên lỗi <span className="text-red-500">*</span></label>
                  <input
                    required
                    type="text"
                    value={formData.tenLoi}
                    onChange={e => setFormData(f => ({ ...f, tenLoi: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Nhập tên lỗi"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả <span className="text-red-500">*</span></label>
                  <textarea
                    required
                    rows={3}
                    value={formData.moTa}
                    onChange={e => setFormData(f => ({ ...f, moTa: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Mô tả chi tiết lỗi"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mã hệ thống</label>
                  <input
                    type="text"
                    value={formData.maHeThong}
                    onChange={e => setFormData(f => ({ ...f, maHeThong: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="VD: HT-001"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Mức độ</label>
                    <select
                      value={formData.mucDo}
                      onChange={e => setFormData(f => ({ ...f, mucDo: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none"
                    >
                      {MUC_DO_OPTIONS.map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Trạng thái</label>
                    <select
                      value={formData.trangThai}
                      onChange={e => setFormData(f => ({ ...f, trangThai: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none"
                    >
                      {TRANG_THAI_OPTIONS.map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Người phát hiện <span className="text-red-500">*</span></label>
                    <input
                      required
                      type="text"
                      value={formData.nguoiPhatHien}
                      onChange={e => setFormData(f => ({ ...f, nguoiPhatHien: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ngày phát hiện</label>
                    <input
                      type="date"
                      value={formData.ngayPhatHien}
                      onChange={e => setFormData(f => ({ ...f, ngayPhatHien: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">File đính kèm</label>
                  <FileUpload onFileSelect={setSelectedFile} />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">
                    Hủy
                  </button>
                  <button type="submit" className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700">
                    {editingRecord ? 'Cập nhật' : 'Thêm mới'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default FaultRecordList;
