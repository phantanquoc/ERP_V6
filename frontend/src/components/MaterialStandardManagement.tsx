import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit, Eye, Trash2, X } from 'lucide-react';
import materialStandardService, { 
  MaterialStandard, 
  MaterialStandardItem,
  CreateMaterialStandardRequest 
} from '../services/materialStandardService';

interface FormData {
  maDinhMuc: string;
  tenDinhMuc: string;
  loaiDinhMuc: 'RAW_MATERIAL' | 'EQUIPMENT';
  tiLeThuHoi: string;
  ghiChu: string;
  items: MaterialStandardItem[];
}

const MaterialStandardManagement: React.FC = () => {
  const [standards, setStandards] = useState<MaterialStandard[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedStandard, setSelectedStandard] = useState<MaterialStandard | null>(null);
  const [formData, setFormData] = useState<FormData>({
    maDinhMuc: '',
    tenDinhMuc: '',
    loaiDinhMuc: 'RAW_MATERIAL',
    tiLeThuHoi: '',
    ghiChu: '',
    items: [],
  });

  useEffect(() => {
    loadStandards();
  }, []);

  const loadStandards = async () => {
    try {
      setLoading(true);
      const response = await materialStandardService.getAllMaterialStandards(1, 100);
      setStandards(response.data);
      setError('');
    } catch (err) {
      setError('Lỗi tải danh sách định mức');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAddItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { tenThanhPham: '', tiLe: 0 }]
    }));
  };

  const handleRemoveItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const handleItemChange = (index: number, field: 'tenThanhPham' | 'tiLe', value: string | number) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map((item, i) => 
        i === index ? { ...item, [field]: field === 'tiLe' ? parseFloat(value as string) : value } : item
      )
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      if (isEditMode && selectedStandard) {
        await materialStandardService.updateMaterialStandard(selectedStandard.id, {
          tenDinhMuc: formData.tenDinhMuc,
          loaiDinhMuc: formData.loaiDinhMuc,
          tiLeThuHoi: formData.tiLeThuHoi ? parseFloat(formData.tiLeThuHoi) : undefined,
          ghiChu: formData.ghiChu,
          items: formData.items,
        });
        setSuccess('Cập nhật định mức thành công');
      } else {
        const createData: CreateMaterialStandardRequest = {
          maDinhMuc: formData.maDinhMuc,
          tenDinhMuc: formData.tenDinhMuc,
          loaiDinhMuc: formData.loaiDinhMuc,
          tiLeThuHoi: formData.tiLeThuHoi ? parseFloat(formData.tiLeThuHoi) : undefined,
          ghiChu: formData.ghiChu,
          items: formData.items,
        };
        await materialStandardService.createMaterialStandard(createData);
        setSuccess('Tạo định mức thành công');
      }
      setIsFormModalOpen(false);
      loadStandards();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Lỗi khi lưu định mức';
      setError(errorMessage);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa định mức này?')) return;

    try {
      await materialStandardService.deleteMaterialStandard(id);
      setSuccess('Xóa định mức thành công');
      loadStandards();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Lỗi khi xóa định mức';
      setError(errorMessage);
    }
  };

  const openCreateModal = async () => {
    setIsEditMode(false);
    setSelectedStandard(null);
    try {
      const code = await materialStandardService.generateMaterialStandardCode();
      setFormData({
        maDinhMuc: code,
        tenDinhMuc: '',
        loaiDinhMuc: 'RAW_MATERIAL',
        tiLeThuHoi: '',
        ghiChu: '',
        items: [],
      });
      setIsFormModalOpen(true);
    } catch (err) {
      setError('Lỗi tạo mã định mức');
    }
  };

  const openEditModal = (standard: MaterialStandard) => {
    setIsEditMode(true);
    setSelectedStandard(standard);
    setFormData({
      maDinhMuc: standard.maDinhMuc,
      tenDinhMuc: standard.tenDinhMuc,
      loaiDinhMuc: standard.loaiDinhMuc,
      tiLeThuHoi: standard.tiLeThuHoi?.toString() || '',
      ghiChu: standard.ghiChu || '',
      items: standard.items || [],
    });
    setIsFormModalOpen(true);
  };

  const openDetailModal = (standard: MaterialStandard) => {
    setSelectedStandard(standard);
    setIsDetailModalOpen(true);
  };

  const closeDetailModal = () => {
    setIsDetailModalOpen(false);
    setSelectedStandard(null);
  };

  const getLoaiDinhMucLabel = (type: string): string => {
    return type === 'RAW_MATERIAL' ? 'Nguyên liệu - Thành phẩm' : 'Vật tư - Thiết bị';
  };

  const filteredStandards = standards.filter(standard =>
    standard.maDinhMuc.toLowerCase().includes(searchTerm.toLowerCase()) ||
    standard.tenDinhMuc.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Error/Success Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
          {success}
        </div>
      )}

      {/* Action Bar */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Tìm kiếm..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
              />
            </div>
          </div>
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Thêm định mức
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Đang tải...</div>
        ) : filteredStandards.length === 0 ? (
          <div className="p-8 text-center text-gray-500">Không có định mức nào</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-300">
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Mã định mức</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Tên định mức</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900 border-r border-gray-200">Loại định mức</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900 border-r border-gray-200">Tỉ lệ thu hồi (%)</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900 border-r border-gray-200">Ngày tạo</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">Hoạt động</th>
                </tr>
              </thead>
              <tbody>
                {filteredStandards.map((standard, index) => (
                  <tr
                    key={standard.id}
                    className={`border-b border-gray-200 hover:bg-blue-50 transition-colors ${
                      index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                    }`}
                  >
                    <td className="px-6 py-4 text-sm font-semibold text-blue-600 border-r border-gray-200">{standard.maDinhMuc}</td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 border-r border-gray-200">{standard.tenDinhMuc}</td>
                    <td className="px-6 py-4 text-center border-r border-gray-200">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                        standard.loaiDinhMuc === 'RAW_MATERIAL'
                          ? 'bg-blue-100 text-blue-700 border border-blue-300'
                          : 'bg-purple-100 text-purple-700 border border-purple-300'
                      }`}>
                        {getLoaiDinhMucLabel(standard.loaiDinhMuc)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 border-r border-gray-200 text-center">
                      {standard.tiLeThuHoi ? `${standard.tiLeThuHoi}%` : '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700 border-r border-gray-200 text-center">
                      {new Date(standard.createdAt).toLocaleDateString('vi-VN')}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-3">
                        <button
                          onClick={() => openDetailModal(standard)}
                          className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-md transition-colors"
                          title="Xem chi tiết"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => openEditModal(standard)}
                          className="p-1.5 text-green-600 hover:bg-green-100 rounded-md transition-colors"
                          title="Chỉnh sửa"
                        >
                          <Edit className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(standard.id)}
                          className="p-1.5 text-red-600 hover:bg-red-100 rounded-md transition-colors"
                          title="Xóa"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Form Modal */}
      {isFormModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-bold">
                {isEditMode ? 'Chỉnh sửa định mức' : 'Thêm định mức mới'}
              </h2>
              <button
                onClick={() => setIsFormModalOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Thông tin cơ bản */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Thông tin cơ bản</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Mã định mức *</label>
                    <input
                      type="text"
                      name="maDinhMuc"
                      value={formData.maDinhMuc}
                      onChange={handleInputChange}
                      disabled={isEditMode}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Loại định mức *</label>
                    <select
                      name="loaiDinhMuc"
                      value={formData.loaiDinhMuc}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="RAW_MATERIAL">Nguyên liệu - Thành phẩm</option>
                      <option value="EQUIPMENT">Vật tư - Thiết bị</option>
                    </select>
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tên định mức *</label>
                    <input
                      type="text"
                      name="tenDinhMuc"
                      value={formData.tenDinhMuc}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tỉ lệ thu hồi thành phẩm (%) K3</label>
                    <input
                      type="number"
                      step="0.01"
                      name="tiLeThuHoi"
                      value={formData.tiLeThuHoi}
                      onChange={handleInputChange}
                      placeholder="Nhập tỉ lệ thu hồi"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú</label>
                    <textarea
                      name="ghiChu"
                      value={formData.ghiChu}
                      onChange={handleInputChange}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Thành phẩm đầu ra */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Thành phẩm đầu ra</h3>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="flex items-center gap-2 px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
                  >
                    <Plus className="h-4 w-4" />
                    Thêm thành phẩm
                  </button>
                </div>

                {formData.items.length === 0 ? (
                  <p className="text-gray-500 text-sm italic">Chưa có thành phẩm nào</p>
                ) : (
                  <div className="space-y-3">
                    {formData.items.map((item, index) => (
                      <div key={index} className="flex gap-3 items-start p-3 bg-gray-50 rounded-md">
                        <div className="flex-1">
                          <label className="block text-xs font-medium text-gray-700 mb-1">Tên thành phẩm</label>
                          <input
                            type="text"
                            value={item.tenThanhPham}
                            onChange={(e) => handleItemChange(index, 'tenThanhPham', e.target.value)}
                            required
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div className="w-32">
                          <label className="block text-xs font-medium text-gray-700 mb-1">Tỉ lệ (%)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={item.tiLe}
                            onChange={(e) => handleItemChange(index, 'tiLe', e.target.value)}
                            required
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(index)}
                          className="mt-6 text-red-600 hover:text-red-800"
                          title="Xóa"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Form Actions */}
              <div className="flex justify-end gap-4 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setIsFormModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  {isEditMode ? 'Cập nhật' : 'Tạo mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {isDetailModalOpen && selectedStandard && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-bold">Chi tiết định mức</h2>
              <button
                onClick={closeDetailModal}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Thông tin cơ bản */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b">Thông tin cơ bản</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Mã định mức</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedStandard.maDinhMuc}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-500">Loại định mức</label>
                    <p className="mt-1">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        selectedStandard.loaiDinhMuc === 'RAW_MATERIAL' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                      }`}>
                        {getLoaiDinhMucLabel(selectedStandard.loaiDinhMuc)}
                      </span>
                    </p>
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-500">Tên định mức</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedStandard.tenDinhMuc}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-500">Tỉ lệ thu hồi thành phẩm (%) K3</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {selectedStandard.tiLeThuHoi ? `${selectedStandard.tiLeThuHoi}%` : '-'}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-500">Ngày tạo</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {new Date(selectedStandard.createdAt).toLocaleString('vi-VN')}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-500">Ngày cập nhật</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {new Date(selectedStandard.updatedAt).toLocaleString('vi-VN')}
                    </p>
                  </div>

                  {selectedStandard.ghiChu && (
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-500">Ghi chú</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedStandard.ghiChu}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Thành phẩm đầu ra */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b">Thành phẩm đầu ra</h3>
                {!selectedStandard.items || selectedStandard.items.length === 0 ? (
                  <p className="text-gray-500 text-sm italic">Chưa có thành phẩm nào</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">STT</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Tên thành phẩm</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Tỉ lệ (%)</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {selectedStandard.items.map((item, index) => (
                          <tr key={index}>
                            <td className="px-4 py-3 text-sm text-gray-900">{index + 1}</td>
                            <td className="px-4 py-3 text-sm text-gray-900">{item.tenThanhPham}</td>
                            <td className="px-4 py-3 text-sm text-gray-900">{item.tiLe}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-4 pt-4 border-t">
                <button
                  onClick={closeDetailModal}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Đóng
                </button>
                <button
                  onClick={() => {
                    openEditModal(selectedStandard);
                    closeDetailModal();
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Chỉnh sửa
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MaterialStandardManagement;

