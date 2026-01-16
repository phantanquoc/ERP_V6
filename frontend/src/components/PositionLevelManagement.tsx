import React, { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  Edit,
  Eye,
  Trash2,
  AlertCircle,
  CheckCircle,
  X
} from 'lucide-react';
import positionService, { Position } from '@services/positionService';
import positionLevelService, { PositionLevel } from '@services/positionLevelService';

interface FormData {
  level: string;
  baseSalary: number | '';
  kpiSalary: number | '';
}

const PositionLevelManagement = () => {
  const [positions, setPositions] = useState<Position[]>([]);
  const [levels, setLevels] = useState<PositionLevel[]>([]);
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState<PositionLevel | null>(null);
  const [formData, setFormData] = useState<FormData>({
    level: '',
    baseSalary: '',
    kpiSalary: '',
  });

  useEffect(() => {
    loadPositions();
  }, []);

  useEffect(() => {
    if (selectedPosition) {
      loadLevels();
    }
  }, [selectedPosition]);

  const loadPositions = async () => {
    try {
      setLoading(true);
      const positions = await positionService.getAllPositions();
      setPositions(positions || []);
      if (positions && positions.length > 0 && !selectedPosition) {
        setSelectedPosition(positions[0]);
      }
      setError('');
    } catch (err) {
      setError('Lỗi tải danh sách vị trí');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadLevels = async () => {
    if (!selectedPosition) return;
    try {
      setLoading(true);
      const data = await positionLevelService.getAllLevelsByPosition(selectedPosition.id);
      setLevels(data || []);
      setError('');
    } catch (err) {
      setError('Lỗi tải danh sách cấp độ');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!formData.level || !formData.baseSalary || !formData.kpiSalary) {
      setError('Vui lòng điền đầy đủ thông tin');
      return;
    }

    if (!selectedPosition) {
      setError('Vui lòng chọn vị trí');
      return;
    }

    try {
      if (isEditMode && selectedLevel) {
        await positionLevelService.updateLevel(selectedLevel.id, {
          level: formData.level,
          baseSalary: Number(formData.baseSalary),
          kpiSalary: Number(formData.kpiSalary),
        });
        setSuccess('Cập nhật cấp độ thành công');
      } else {
        await positionLevelService.createLevel(selectedPosition.id, {
          level: formData.level,
          baseSalary: Number(formData.baseSalary),
          kpiSalary: Number(formData.kpiSalary),
        });
        setSuccess('Thêm cấp độ thành công');
      }
      closeModals();
      loadLevels();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi xử lý');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Bạn chắc chắn muốn xóa cấp độ này?')) return;

    try {
      await positionLevelService.deleteLevel(id);
      setSuccess('Xóa cấp độ thành công');
      loadLevels();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi xóa cấp độ');
    }
  };

  const openCreateModal = () => {
    setIsEditMode(false);
    setSelectedLevel(null);
    setFormData({ level: '', baseSalary: '', kpiSalary: '' });
    setIsFormModalOpen(true);
  };

  const openEditModal = (level: PositionLevel) => {
    setIsEditMode(true);
    setSelectedLevel(level);
    setFormData({
      level: level.level,
      baseSalary: level.baseSalary,
      kpiSalary: level.kpiSalary,
    });
    setIsFormModalOpen(true);
  };

  const openDetailModal = (level: PositionLevel) => {
    setSelectedLevel(level);
    setIsDetailModalOpen(true);
  };

  const closeModals = () => {
    setIsFormModalOpen(false);
    setIsDetailModalOpen(false);
    setFormData({ level: '', baseSalary: '', kpiSalary: '' });
  };

  const filteredLevels = levels.filter(level =>
    level.level.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Position Selector */}
      <div className="bg-white rounded-lg shadow p-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Chọn vị trí</label>
        <select
          value={selectedPosition?.id || ''}
          onChange={(e) => {
            const pos = positions.find(p => p.id === e.target.value);
            setSelectedPosition(pos || null);
          }}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {positions.map(pos => (
            <option key={pos.id} value={pos.id}>
              {pos.code} - {pos.name}
            </option>
          ))}
        </select>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex gap-3">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <p className="text-green-800">{success}</p>
        </div>
      )}

      {/* Search and Add Button */}
      <div className="bg-white rounded-lg shadow p-4 flex gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Tìm kiếm theo cấp độ..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button
          onClick={openCreateModal}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Thêm cấp độ
        </button>
      </div>

      {/* Levels Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Đang tải...</div>
        ) : filteredLevels.length === 0 ? (
          <div className="p-8 text-center text-gray-500">Không có dữ liệu</div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Cấp độ</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Lương cơ bản</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Lương KPI</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {filteredLevels.map(level => (
                <tr key={level.id} className="border-b hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-900">{level.level}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {new Intl.NumberFormat('vi-VN', {
                      style: 'currency',
                      currency: 'VND',
                    }).format(level.baseSalary)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {new Intl.NumberFormat('vi-VN', {
                      style: 'currency',
                      currency: 'VND',
                    }).format(level.kpiSalary)}
                  </td>
                  <td className="px-6 py-4 text-sm space-x-2 flex">
                    <button
                      onClick={() => openDetailModal(level)}
                      className="text-blue-600 hover:text-blue-800"
                      title="Xem chi tiết"
                    >
                      <Eye className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => openEditModal(level)}
                      className="text-yellow-600 hover:text-yellow-800"
                      title="Chỉnh sửa"
                    >
                      <Edit className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(level.id)}
                      className="text-red-600 hover:text-red-800"
                      title="Xóa"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Form Modal */}
      {isFormModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-800">
                  {isEditMode ? 'Chỉnh sửa cấp độ' : 'Thêm cấp độ mới'}
                </h3>
                <button onClick={closeModals} className="text-gray-400 hover:text-gray-600">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cấp độ</label>
                  <input
                    type="text"
                    value={formData.level}
                    onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                    placeholder="VD: Junior, Senior, Manager"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Lương cơ bản (VND)</label>
                  <input
                    type="number"
                    value={formData.baseSalary}
                    onChange={(e) => setFormData({ ...formData, baseSalary: e.target.value ? Number(e.target.value) : '' })}
                    placeholder="VD: 4000000"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Lương KPI (VND)</label>
                  <input
                    type="number"
                    value={formData.kpiSalary}
                    onChange={(e) => setFormData({ ...formData, kpiSalary: e.target.value ? Number(e.target.value) : '' })}
                    placeholder="VD: 1000000"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={closeModals}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    {isEditMode ? 'Cập nhật' : 'Thêm mới'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {isDetailModalOpen && selectedLevel && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-800">Chi tiết cấp độ</h3>
                <button onClick={closeModals} className="text-gray-400 hover:text-gray-600">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">Cấp độ</label>
                  <p className="text-gray-900">{selectedLevel.level}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Lương cơ bản</label>
                  <p className="text-gray-900">
                    {new Intl.NumberFormat('vi-VN', {
                      style: 'currency',
                      currency: 'VND',
                    }).format(selectedLevel.baseSalary)}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Lương KPI</label>
                  <p className="text-gray-900">
                    {new Intl.NumberFormat('vi-VN', {
                      style: 'currency',
                      currency: 'VND',
                    }).format(selectedLevel.kpiSalary)}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Tổng lương</label>
                  <p className="text-gray-900 font-semibold">
                    {new Intl.NumberFormat('vi-VN', {
                      style: 'currency',
                      currency: 'VND',
                    }).format(selectedLevel.baseSalary + selectedLevel.kpiSalary)}
                  </p>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={closeModals}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Đóng
                </button>
                <button
                  onClick={() => {
                    openEditModal(selectedLevel);
                    setIsDetailModalOpen(false);
                  }}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
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

export default PositionLevelManagement;

