import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Eye, X, Upload } from 'lucide-react';

interface MachineSystem {
  id: number;
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
  ngayTao: string;
}

const MachineSystemList = () => {
  const [systems, setSystems] = useState<MachineSystem[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewMode, setIsViewMode] = useState(false);
  const [editingSystem, setEditingSystem] = useState<MachineSystem | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
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
  });

  useEffect(() => {
    fetchSystems();
  }, []);

  const fetchSystems = async () => {
    try {
      const response = await fetch((import.meta.env.VITE_API_URL || 'http://localhost:5000/api') + '/machine-systems');
      if (response.ok) {
        const data = await response.json();
        setSystems(data);
      }
    } catch (error) {
      console.error('Error fetching systems:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const formDataToSend = new FormData();
    Object.entries(formData).forEach(([key, value]) => {
      formDataToSend.append(key, value);
    });
    if (selectedFile) {
      formDataToSend.append('file', selectedFile);
    }

    try {
      const url = editingSystem 
        ? `http://localhost:5000/api/machine-systems/${editingSystem.id}`
        : (import.meta.env.VITE_API_URL || 'http://localhost:5000/api') + '/machine-systems';
      const method = editingSystem ? 'PUT' : 'POST';
      
      const response = await fetch(url, { method, body: formDataToSend });
      if (response.ok) {
        fetchSystems();
        handleCloseModal();
      }
    } catch (error) {
      console.error('Error saving system:', error);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Bạn có chắc muốn xóa?')) return;
    try {
      const response = await fetch(`http://localhost:5000/api/machine-systems/${id}`, { method: 'DELETE' });
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
    });
  };

  const openCreateModal = () => {
    handleCloseModal();
    setIsModalOpen(true);
  };

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-4 p-4">
        <h2 className="text-xl font-semibold text-gray-800">Danh sách hệ thống máy</h2>
        <button onClick={openCreateModal} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
          <Plus className="w-4 h-4" /> Thêm mới
        </button>
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
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hoạt động</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {systems.map((system, index) => (
              <tr key={system.id} className="hover:bg-gray-50">
                <td className="px-4 py-4 text-sm text-gray-900">{index + 1}</td>
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
                    <a href={`http://localhost:5000${system.fileDinhKem}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                      Xem file
                    </a>
                  )}
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
              <tr><td colSpan={13} className="px-4 py-8 text-center text-gray-500">Chưa có dữ liệu</td></tr>
            )}
          </tbody>
        </table>
      </div>

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
                  <input type="text" value={formData.khuVuc} onChange={e => setFormData({...formData, khuVuc: e.target.value})}
                    disabled={isViewMode} className="w-full border rounded-lg px-3 py-2 disabled:bg-gray-100" required />
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
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mã thiết bị</label>
                  <input type="text" value={formData.maThietBi} onChange={e => setFormData({...formData, maThietBi: e.target.value})}
                    disabled={isViewMode} className="w-full border rounded-lg px-3 py-2 disabled:bg-gray-100" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tên thiết bị</label>
                  <input type="text" value={formData.tenThietBi} onChange={e => setFormData({...formData, tenThietBi: e.target.value})}
                    disabled={isViewMode} className="w-full border rounded-lg px-3 py-2 disabled:bg-gray-100" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nhiệm vụ</label>
                  <textarea value={formData.nhiemVu} onChange={e => setFormData({...formData, nhiemVu: e.target.value})}
                    disabled={isViewMode} className="w-full border rounded-lg px-3 py-2 disabled:bg-gray-100" rows={2} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mã người thực hiện</label>
                  <input type="text" value={formData.maNguoiThucHien} onChange={e => setFormData({...formData, maNguoiThucHien: e.target.value})}
                    disabled={isViewMode} className="w-full border rounded-lg px-3 py-2 disabled:bg-gray-100" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Người thực hiện</label>
                  <input type="text" value={formData.nguoiThucHien} onChange={e => setFormData({...formData, nguoiThucHien: e.target.value})}
                    disabled={isViewMode} className="w-full border rounded-lg px-3 py-2 disabled:bg-gray-100" />
                </div>
                {!isViewMode && (
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">File đính kèm</label>
                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-2 px-4 py-2 border rounded-lg cursor-pointer hover:bg-gray-50">
                        <Upload className="w-4 h-4" />
                        <span>{selectedFile ? selectedFile.name : 'Chọn file'}</span>
                        <input type="file" className="hidden" onChange={e => setSelectedFile(e.target.files?.[0] || null)} />
                      </label>
                    </div>
                  </div>
                )}
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

