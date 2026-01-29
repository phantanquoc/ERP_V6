import React, { useState } from 'react';
import { Plus, Edit, Trash2, X, Search } from 'lucide-react';
import machineService, { Machine, CreateMachineRequest, UpdateMachineRequest } from '../services/machineService';
import { useMachines, machineKeys } from '../hooks';
import { useQueryClient } from '@tanstack/react-query';

const MachineManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const { data: machinesData, isLoading: loading } = useMachines();
  const machines = machinesData?.data || [];

  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [nextMachineCode, setNextMachineCode] = useState<string>('');
  const [formData, setFormData] = useState<CreateMachineRequest>({
    tenMay: '',
    moTa: '',
    trangThai: 'HOAT_DONG',
    ghiChu: '',
  });

  const handleOpenModal = async (machine?: Machine) => {
    if (machine) {
      setIsEditing(true);
      setSelectedMachine(machine);
      setNextMachineCode(machine.maMay);
      setFormData({
        tenMay: machine.tenMay,
        moTa: machine.moTa || '',
        trangThai: machine.trangThai,
        ghiChu: machine.ghiChu || '',
      });
    } else {
      setIsEditing(false);
      setSelectedMachine(null);
      // Load next machine code for new machine
      try {
        const code = await machineService.generateMachineCode();
        setNextMachineCode(code);
      } catch (err) {
        console.error('Error generating machine code:', err);
        setNextMachineCode('');
      }
      setFormData({
        tenMay: '',
        moTa: '',
        trangThai: 'HOAT_DONG',
        ghiChu: '',
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setIsEditing(false);
    setSelectedMachine(null);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.tenMay.trim()) {
      setError('Vui lòng nhập tên máy');
      return;
    }

    try {
      setError('');

      if (isEditing && selectedMachine) {
        await machineService.updateMachine(selectedMachine.id, formData as UpdateMachineRequest);
      } else {
        await machineService.createMachine(formData);
      }

      queryClient.invalidateQueries({ queryKey: machineKeys.lists() });
      handleCloseModal();
    } catch (err: any) {
      setError(err.message || 'Lỗi lưu dữ liệu');
      console.error(err);
    }
  };

  const handleDelete = async (machine: Machine) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa máy "${machine.tenMay}"?`)) {
      return;
    }

    try {
      setError('');
      await machineService.deleteMachine(machine.id);
      queryClient.invalidateQueries({ queryKey: machineKeys.lists() });
    } catch (err: any) {
      setError(err.message || 'Lỗi xóa máy');
      console.error(err);
    }
  };

  const filteredMachines = machines.filter(machine =>
    machine.tenMay.toLowerCase().includes(searchTerm.toLowerCase()) ||
    machine.maMay.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      HOAT_DONG: { label: 'Hoạt động', className: 'bg-green-100 text-green-700 border border-green-300' },
      'BẢO_TRÌ': { label: 'Bảo trì', className: 'bg-yellow-100 text-yellow-700 border border-yellow-300' },
      'NGỪNG_HOẠT_ĐỘNG': { label: 'Ngừng hoạt động', className: 'bg-red-100 text-red-700 border border-red-300' },
    };
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.HOAT_DONG;
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${config.className}`}>
        {config.label}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Quản lý máy móc</h2>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          Thêm máy mới
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Search */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Tìm kiếm theo mã máy, tên máy, loại máy..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Đang tải...</div>
        ) : filteredMachines.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            {searchTerm ? 'Không tìm thấy máy nào' : 'Chưa có máy nào'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-300">
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Mã máy</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Tên máy</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Mô tả</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900 border-r border-gray-200">Trạng thái</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Ghi chú</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">Hoạt động</th>
                </tr>
              </thead>
              <tbody>
                {filteredMachines.map((machine, index) => (
                  <tr
                    key={machine.id}
                    className={`border-b border-gray-200 hover:bg-blue-50 transition-colors ${
                      index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                    }`}
                  >
                    <td className="px-6 py-4 text-sm font-semibold text-blue-600 border-r border-gray-200">
                      {machine.maMay}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 border-r border-gray-200">
                      {machine.tenMay}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700 border-r border-gray-200">
                      {machine.moTa || '-'}
                    </td>
                    <td className="px-6 py-4 text-center border-r border-gray-200">
                      {getStatusBadge(machine.trangThai)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700 border-r border-gray-200">
                      {machine.ghiChu || '-'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-3">
                        <button
                          onClick={() => handleOpenModal(machine)}
                          className="p-1.5 text-green-600 hover:bg-green-100 rounded-md transition-colors"
                          title="Chỉnh sửa"
                        >
                          <Edit className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(machine)}
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

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b sticky top-0 bg-white">
              <h2 className="text-xl font-bold">
                {isEditing ? 'Sửa thông tin máy' : 'Thêm máy mới'}
              </h2>
              <button
                onClick={handleCloseModal}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mã máy
                </label>
                <input
                  type="text"
                  value={nextMachineCode}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600 cursor-not-allowed"
                  placeholder={isEditing ? '' : 'Tự động tạo...'}
                />
                {!isEditing && (
                  <p className="mt-1 text-xs text-gray-500">
                    Mã máy sẽ được tự động tạo khi thêm mới
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tên máy <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.tenMay}
                  onChange={(e) => setFormData({ ...formData, tenMay: e.target.value })}
                  placeholder="VD: Máy sấy 1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Trạng thái <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.trangThai}
                  onChange={(e) => setFormData({ ...formData, trangThai: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="HOAT_DONG">Hoạt động</option>
                  <option value="BẢO_TRÌ">Bảo trì</option>
                  <option value="NGỪNG_HOẠT_ĐỘNG">Ngừng hoạt động</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mô tả
                </label>
                <textarea
                  value={formData.moTa}
                  onChange={(e) => setFormData({ ...formData, moTa: e.target.value })}
                  placeholder="Mô tả chi tiết về máy"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ghi chú
                </label>
                <input
                  type="text"
                  value={formData.ghiChu}
                  onChange={(e) => setFormData({ ...formData, ghiChu: e.target.value })}
                  placeholder="Ghi chú thêm"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  disabled={loading}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
                  disabled={loading}
                >
                  {loading ? 'Đang lưu...' : isEditing ? 'Cập nhật' : 'Thêm mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MachineManagement;

