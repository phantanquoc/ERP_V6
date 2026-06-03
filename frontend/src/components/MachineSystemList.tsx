import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Eye, X, Download } from 'lucide-react';
import FileUpload from './FileUpload';
import { API_BASE_URL, getFileUrl } from '../config/api';

const authFetch = (url: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('accessToken');
  return fetch(url, {
    ...options,
    headers: {
      ...(options.headers as Record<string, string> | undefined),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
};

interface MachineSystem {
  id: string;
  khuVuc: string;
  viTri: string;
  maHeThong: string;
  tenHeThong: string;
  chucNang: string;
  maThietBi: string;
  tenThietBi: string;
  nhiemVu: string;
  maNguoiThucHien: string;
  nguoiThucHien: string;
  fileDinhKem?: string;
  hoatDong: boolean;
  createdAt: string;
}

const KHU_VUC_OPTIONS = [
  'Khu A',
  'Khu B',
  'Khu C',
  'Khu sản xuất',
  'Khu kho',
  'Khu văn phòng',
  'Khu xử lý',
  'Khác',
];

const MachineSystemList = () => {
  const [systems, setSystems] = useState<MachineSystem[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewMode, setIsViewMode] = useState(false);
  const [editingSystem, setEditingSystem] = useState<MachineSystem | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [machines, setMachines] = useState<{ id: string; maMay: string; tenMay: string }[]>([]);
  const [employees, setEmployees] = useState<{ id: string; employeeCode: string; firstName: string; lastName: string }[]>([]);
  
  const [formData, setFormData] = useState({
    khuVuc: '',
    viTri: '',
    maHeThong: '',
    tenHeThong: '',
    chucNang: '',
    maThietBi: '',
    tenThietBi: '',
    nhiemVu: '',
    maNguoiThucHien: '',
    nguoiThucHien: '',
    hoatDong: true,
  });

  useEffect(() => {
    fetchSystems();
    fetchMachines();
    fetchEmployees();
  }, []);

  const fetchSystems = async () => {
    try {
      const response = await authFetch(API_BASE_URL + '/machine-systems');
      if (response.ok) {
        const result = await response.json();
        const data = result.success ? result.data : result;
        setSystems(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error fetching systems:', error);
    }
  };

  const fetchMachines = async () => {
    try {
      const response = await authFetch(API_BASE_URL + '/machines?limit=200');
      if (response.ok) {
        const result = await response.json();
        const data = result.success ? result.data : result;
        setMachines(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error fetching machines:', error);
    }
  };

  const fetchEmployees = async () => {
    try {
      const response = await authFetch(API_BASE_URL + '/employees?limit=200');
      if (response.ok) {
        const result = await response.json();
        const data = result.success ? result.data : result;
        setEmployees(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const formDataToSend = new FormData();
    Object.entries(formData).forEach(([key, value]) => {
      formDataToSend.append(key, String(value));
    });
    if (selectedFile) {
      formDataToSend.append('file', selectedFile);
    }

    try {
      const url = editingSystem
        ? `${API_BASE_URL}/machine-systems/${editingSystem.id}`
        : API_BASE_URL + '/machine-systems';
      const method = editingSystem ? 'PUT' : 'POST';
      
      const response = await authFetch(url, { method, body: formDataToSend });
      if (response.ok) {
        fetchSystems();
        handleCloseModal();
      }
    } catch (error) {
      console.error('Error saving system:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bạn có chắc muốn xóa?')) return;
    try {
      const response = await authFetch(`${API_BASE_URL}/machine-systems/${id}`, { method: 'DELETE' });
      if (response.ok) {
        fetchSystems();
      }
    } catch (error) {
      console.error('Error deleting:', error);
    }
  };

  const handleEdit = (system: MachineSystem) => {
    setEditingSystem(system);
    setFormData({
      khuVuc: system.khuVuc,
      viTri: system.viTri,
      maHeThong: system.maHeThong,
      tenHeThong: system.tenHeThong,
      chucNang: system.chucNang,
      maThietBi: system.maThietBi,
      tenThietBi: system.tenThietBi,
      nhiemVu: system.nhiemVu,
      maNguoiThucHien: system.maNguoiThucHien,
      nguoiThucHien: system.nguoiThucHien,
      hoatDong: system.hoatDong ?? true,
    });
    setIsViewMode(false);
    setIsModalOpen(true);
  };

  const handleView = (system: MachineSystem) => {
    setEditingSystem(system);
    setFormData({
      khuVuc: system.khuVuc,
      viTri: system.viTri,
      maHeThong: system.maHeThong,
      tenHeThong: system.tenHeThong,
      chucNang: system.chucNang,
      maThietBi: system.maThietBi,
      tenThietBi: system.tenThietBi,
      nhiemVu: system.nhiemVu,
      maNguoiThucHien: system.maNguoiThucHien,
      nguoiThucHien: system.nguoiThucHien,
      hoatDong: system.hoatDong ?? true,
    });
    setIsViewMode(true);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setIsViewMode(false);
    setEditingSystem(null);
    setSelectedFile(null);
    setFormData({
      khuVuc: '', viTri: '', maHeThong: '', tenHeThong: '', chucNang: '',
      maThietBi: '', tenThietBi: '', nhiemVu: '', maNguoiThucHien: '', nguoiThucHien: '',
      hoatDong: true,
    });
  };

  const openCreateModal = () => {
    handleCloseModal();
    setIsModalOpen(true);
  };

  const handleExportExcel = async () => {
    try {
      const url = `${API_BASE_URL}/machine-systems/export/excel`;
      const response = await authFetch(url);
      if (!response.ok) throw new Error('Failed to export');
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `danh-sach-he-thong-may-${Date.now()}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Error exporting to Excel:', error);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-4 p-4">
        <h2 className="text-xl font-semibold text-gray-800">Danh sách hệ thống máy</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            Xuất Excel
          </button>
          <button onClick={openCreateModal} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
            <Plus className="w-4 h-4" /> Thêm mới
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">STT</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Khu vực</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vị trí</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mã hệ thống</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tên hệ thống</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Chức năng</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mã thiết bị</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tên thiết bị</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nhiệm vụ</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mã NTH</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Người thực hiện</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">File</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ngày tạo</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hoạt động</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Thao tác</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {systems.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((system, index) => (
              <tr key={system.id} className="hover:bg-gray-50">
                <td className="px-4 py-4 text-sm text-gray-900">{(currentPage - 1) * itemsPerPage + index + 1}</td>
                <td className="px-4 py-4 text-sm text-gray-900">{system.khuVuc}</td>
                <td className="px-4 py-4 text-sm text-gray-900">{system.viTri}</td>
                <td className="px-4 py-4 text-sm font-medium text-blue-600">{system.maHeThong}</td>
                <td className="px-4 py-4 text-sm text-gray-900">{system.tenHeThong}</td>
                <td className="px-4 py-4 text-sm text-gray-900">{system.chucNang}</td>
                <td className="px-4 py-4 text-sm text-gray-900">{system.maThietBi}</td>
                <td className="px-4 py-4 text-sm text-gray-900">{system.tenThietBi}</td>
                <td className="px-4 py-4 text-sm text-gray-900">{system.nhiemVu}</td>
                <td className="px-4 py-4 text-sm text-gray-900">{system.maNguoiThucHien}</td>
                <td className="px-4 py-4 text-sm text-gray-900">{system.nguoiThucHien}</td>
                <td className="px-4 py-4 text-sm text-gray-900">
                  {system.fileDinhKem && (
                    <a href={getFileUrl(system.fileDinhKem)} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                      Xem file
                    </a>
                  )}
                </td>
                <td className="px-4 py-4 text-sm text-gray-900">
                  {system.createdAt && new Date(system.createdAt).toLocaleDateString('vi-VN')}
                </td>
                <td className="px-4 py-4 text-sm">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${system.hoatDong ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'}`}>
                    {system.hoatDong ? 'Hoạt động' : 'Dừng'}
                  </span>
                </td>
                <td className="px-4 py-4 text-sm">
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleView(system)} className="text-blue-600 hover:text-blue-800" title="Xem"><Eye className="w-4 h-4" /></button>
                    <button onClick={() => handleEdit(system)} className="text-green-600 hover:text-green-800" title="Sửa"><Edit className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(system.id)} className="text-red-600 hover:text-red-800" title="Xóa"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
            {systems.length === 0 && (
              <tr><td colSpan={15} className="px-4 py-8 text-center text-gray-500">Chưa có dữ liệu</td></tr>
            )}
          </tbody>
        </table>
      </div>
      {(() => {
        const totalItems = systems.length;
        const totalPages = Math.ceil(totalItems / itemsPerPage);
        return totalPages > 1 ? (
          <div className="flex items-center justify-between mt-4 px-2">
            <span className="text-sm text-gray-600">
              Hiển thị {(currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, totalItems)} / {totalItems} mục
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Trước
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(page => page === 1 || page === totalPages || Math.abs(page - currentPage) <= 2)
                .map((page, idx, arr) => (
                  <React.Fragment key={page}>
                    {idx > 0 && arr[idx - 1] !== page - 1 && <span className="px-1 text-gray-400">...</span>}
                    <button
                      onClick={() => setCurrentPage(page)}
                      className={`px-3 py-1.5 text-sm rounded-md ${
                        page === currentPage ? 'bg-blue-600 text-white' : 'border border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {page}
                    </button>
                  </React.Fragment>
                ))}
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Sau
              </button>
            </div>
          </div>
        ) : null;
      })()}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-semibold">
                {isViewMode ? 'Chi tiết hệ thống' : editingSystem ? 'Chỉnh sửa hệ thống' : 'Thêm hệ thống mới'}
              </h3>
              <button onClick={handleCloseModal} className="text-gray-500 hover:text-gray-700"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Khu vực</label>
                  <select value={formData.khuVuc} onChange={e => setFormData({...formData, khuVuc: e.target.value})}
                    disabled={isViewMode} className="w-full border rounded-lg px-3 py-2 disabled:bg-gray-100" required>
                    <option value="">-- Chọn khu vực --</option>
                    {KHU_VUC_OPTIONS.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vị trí</label>
                  <input type="text" value={formData.viTri} onChange={e => setFormData({...formData, viTri: e.target.value})}
                    disabled={isViewMode} className="w-full border rounded-lg px-3 py-2 disabled:bg-gray-100" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mã hệ thống</label>
                  <input type="text" value={formData.maHeThong} onChange={e => setFormData({...formData, maHeThong: e.target.value})}
                    disabled={isViewMode} className="w-full border rounded-lg px-3 py-2 disabled:bg-gray-100" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tên hệ thống</label>
                  <input type="text" value={formData.tenHeThong} onChange={e => setFormData({...formData, tenHeThong: e.target.value})}
                    disabled={isViewMode} className="w-full border rounded-lg px-3 py-2 disabled:bg-gray-100" required />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Chức năng</label>
                  <textarea value={formData.chucNang} onChange={e => setFormData({...formData, chucNang: e.target.value})}
                    disabled={isViewMode} className="w-full border rounded-lg px-3 py-2 disabled:bg-gray-100" rows={2} />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Thiết bị</label>
                  <select
                    value={formData.maThietBi}
                    onChange={e => {
                      const selected = machines.find(m => m.maMay === e.target.value);
                      setFormData({
                        ...formData,
                        maThietBi: selected ? selected.maMay : '',
                        tenThietBi: selected ? selected.tenMay : '',
                      });
                    }}
                    disabled={isViewMode}
                    className="w-full border rounded-lg px-3 py-2 disabled:bg-gray-100"
                  >
                    <option value="">-- Chọn thiết bị --</option>
                    {machines.map(m => (
                      <option key={m.id} value={m.maMay}>{m.maMay} - {m.tenMay}</option>
                    ))}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nhiệm vụ</label>
                  <textarea value={formData.nhiemVu} onChange={e => setFormData({...formData, nhiemVu: e.target.value})}
                    disabled={isViewMode} className="w-full border rounded-lg px-3 py-2 disabled:bg-gray-100" rows={2} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mã người thực hiện</label>
                  <input type="text" value={formData.maNguoiThucHien}
                    readOnly className="w-full border rounded-lg px-3 py-2 bg-gray-100" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Người thực hiện</label>
                  <select
                    value={formData.nguoiThucHien}
                    onChange={e => {
                      const selected = employees.find(emp => `${emp.lastName} ${emp.firstName}`.trim() === e.target.value);
                      setFormData({
                        ...formData,
                        nguoiThucHien: e.target.value,
                        maNguoiThucHien: selected ? selected.employeeCode : '',
                      });
                    }}
                    disabled={isViewMode}
                    className="w-full border rounded-lg px-3 py-2 disabled:bg-gray-100"
                  >
                    <option value="">-- Chọn người thực hiện --</option>
                    {employees.map(emp => {
                      const fullName = `${emp.lastName} ${emp.firstName}`.trim();
                      return <option key={emp.id} value={fullName}>{fullName}</option>;
                    })}
                  </select>
                </div>
                {!isViewMode && (
                  <div className="col-span-2">
                    <FileUpload
                      label="File đính kèm"
                      files={selectedFile ? [selectedFile] : []}
                      onChange={(files) => setSelectedFile(files[0] || null)}
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                    />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Trạng thái hoạt động</label>
                  <div className="flex items-center gap-3 mt-2">
                    <button
                      type="button"
                      disabled={isViewMode}
                      onClick={() => !isViewMode && setFormData({ ...formData, hoatDong: !formData.hoatDong })}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${formData.hoatDong ? 'bg-green-500' : 'bg-gray-300'} ${isViewMode ? 'cursor-default' : 'cursor-pointer'}`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.hoatDong ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                    <span className={`text-sm font-medium ${formData.hoatDong ? 'text-green-700' : 'text-gray-500'}`}>
                      {formData.hoatDong ? 'Đang hoạt động' : 'Dừng hoạt động'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
                <button type="button" onClick={handleCloseModal} className="px-4 py-2 border rounded-lg hover:bg-gray-50">Đóng</button>
                {!isViewMode && (
                  <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    {editingSystem ? 'Cập nhật' : 'Thêm mới'}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MachineSystemList;

