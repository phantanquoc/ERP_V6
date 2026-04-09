import React, { useState } from 'react';
import { Plus, Edit, Trash2, X } from 'lucide-react';
import machineService, { Machine, CreateMachineRequest, UpdateMachineRequest } from '../services/machineService';
import { useMachines, machineKeys } from '../hooks';
import { useQueryClient } from '@tanstack/react-query';
import { DataTable, Column } from './DataTable';

const MachineManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const { data: machinesData, isLoading: loading } = useMachines();
  const machines = machinesData?.data || [];

  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
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

  const machineColumns: Column<Machine>[] = [
    {
      key: 'maMay',
      label: 'Mã máy',
      filterable: true,
      filterType: 'text',
      render: (m) => <span className="font-semibold text-blue-600">{m.maMay}</span>,
    },
    {
      key: 'tenMay',
      label: 'Tên máy',
      filterable: true,
      filterType: 'text',
      render: (m) => <span className="font-medium text-gray-900">{m.tenMay}</span>,
    },
    {
      key: 'moTa',
      label: 'Mô tả',
      render: (m) => m.moTa || '-',
    },
    {
      key: 'trangThai',
      label: 'Trạng thái',
      filterable: true,
      filterType: 'select',
      filterOptions: [
        { label: 'Hoạt động', value: 'HOAT_DONG' },
        { label: 'Bảo trì', value: 'BẢO_TRÌ' },
        { label: 'Ngừng hoạt động', value: 'NGỪNG_HOẠT_ĐỘNG' },
      ],
      render: (m) => getStatusBadge(m.trangThai),
    },
    {
      key: 'ghiChu',
      label: 'Ghi chú',
      render: (m) => m.ghiChu || '-',
    },
    {
      key: 'actions',
      label: 'Hoạt động',
      render: (m) => (
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => handleOpenModal(m)}
            className="p-1.5 text-green-600 hover:bg-green-100 rounded-md transition-colors"
            title="Chỉnh sửa"
          >
            <Edit className="w-5 h-5" />
          </button>
          <button
            onClick={() => handleDelete(m)}
            className="p-1.5 text-red-600 hover:bg-red-100 rounded-md transition-colors"
            title="Xóa"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      ),
    },
  ];

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

      <DataTable
        columns={machineColumns}
        data={machines}
        isLoading={loading}
        total={machines.length}
        page={currentPage}
        pageSize={itemsPerPage}
        onPageChange={setCurrentPage}
        onFilterChange={() => setCurrentPage(1)}
        rowKey="id"
        emptyMessage="Chưa có máy nào"
      />

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

