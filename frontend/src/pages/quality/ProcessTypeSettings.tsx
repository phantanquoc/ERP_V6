import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Edit, Trash2, Lock, X, Save, Settings } from 'lucide-react';
import toast from 'react-hot-toast';
import { PageHeader } from '../../design-system/PageHeader';
import { SectionCard } from '../../design-system/SectionCard';
import {
  useProcessTypes,
  useCreateProcessType,
  useUpdateProcessType,
  useDeleteProcessType,
} from '../../hooks/useProcessTypes';
import type { ProcessType } from '../../services/processTypeService';

const extractErrorMessage = (err: unknown): string => {
  if (err && typeof err === 'object' && 'message' in err) {
    return String((err as { message?: string }).message ?? 'Đã xảy ra lỗi');
  }
  return 'Đã xảy ra lỗi';
};

const ProcessTypeSettings: React.FC = () => {
  const navigate = useNavigate();
  const { data: response, isLoading } = useProcessTypes();
  const rows: ProcessType[] = response?.data ?? [];

  const createMutation = useCreateProcessType();
  const updateMutation = useUpdateProcessType();
  const deleteMutation = useDeleteProcessType();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createThuTu, setCreateThuTu] = useState<number>(0);

  const [editingRow, setEditingRow] = useState<ProcessType | null>(null);
  const [editName, setEditName] = useState('');

  const [deletingRow, setDeletingRow] = useState<ProcessType | null>(null);

  const handleCreate = async () => {
    const trimmed = createName.trim();
    if (!trimmed) {
      toast.error('Vui lòng nhập tên loại quy trình');
      return;
    }
    try {
      await createMutation.mutateAsync({ name: trimmed, thuTu: createThuTu });
      toast.success('Tạo loại quy trình thành công');
      setIsCreateOpen(false);
      setCreateName('');
      setCreateThuTu(0);
    } catch (err) {
      toast.error(extractErrorMessage(err));
    }
  };

  const handleEditSave = async () => {
    if (!editingRow) return;
    const trimmed = editName.trim();
    if (!trimmed) {
      toast.error('Tên không được để trống');
      return;
    }
    try {
      await updateMutation.mutateAsync({ id: editingRow.id, data: { name: trimmed } });
      toast.success('Cập nhật thành công');
      setEditingRow(null);
    } catch (err) {
      toast.error(extractErrorMessage(err));
    }
  };

  const handleToggleKichHoat = async (row: ProcessType) => {
    try {
      await updateMutation.mutateAsync({ id: row.id, data: { kichHoat: !row.kichHoat } });
    } catch (err) {
      toast.error(extractErrorMessage(err));
    }
  };

  const handleUpdateThuTu = async (row: ProcessType, thuTu: number) => {
    if (thuTu === row.thuTu) return;
    try {
      await updateMutation.mutateAsync({ id: row.id, data: { thuTu } });
    } catch (err) {
      toast.error(extractErrorMessage(err));
    }
  };

  const handleDelete = async () => {
    if (!deletingRow) return;
    try {
      await deleteMutation.mutateAsync(deletingRow.id);
      toast.success('Xóa thành công');
      setDeletingRow(null);
    } catch (err) {
      toast.error(extractErrorMessage(err));
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
          title="Cài đặt loại quy trình"
          description="Quản lý danh mục loại quy trình dùng chung. Các loại hệ thống không thể đổi tên hoặc xóa."
          icon={<Settings className="w-6 h-6 text-violet-500" />}
          breadcrumb={
            <button
              onClick={() => navigate('/quality/process')}
              className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-blue-600 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Quay lại
            </button>
          }
          actions={
            <button
              onClick={() => setIsCreateOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Thêm loại quy trình
            </button>
          }
        />

        <SectionCard bodyClassName="overflow-hidden -m-4">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-3 py-2.5 text-center text-xs font-semibold text-gray-500 border-r border-gray-200">STT</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 border-r border-gray-200">Tên</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 border-r border-gray-200">Mã</th>
                  <th className="px-3 py-2.5 text-center text-xs font-semibold text-gray-500 border-r border-gray-200">Thứ tự</th>
                  <th className="px-3 py-2.5 text-center text-xs font-semibold text-gray-500 border-r border-gray-200">Kích hoạt</th>
                  <th className="px-3 py-2.5 text-center text-xs font-semibold text-gray-500">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {isLoading && (
                  <tr>
                    <td colSpan={6} className="px-3 py-8 text-center text-sm text-gray-400">Đang tải...</td>
                  </tr>
                )}
                {!isLoading && rows.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-3 py-8 text-center text-sm text-gray-400">Chưa có loại quy trình nào</td>
                  </tr>
                )}
                {rows.map((row, idx) => (
                  <tr
                    key={row.id}
                    className={`border-b border-gray-100 hover:bg-blue-50/50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                  >
                    <td className="px-3 py-2.5 text-center text-sm text-gray-700 border-r border-gray-100">{idx + 1}</td>
                    <td className="px-3 py-2.5 text-sm text-gray-700 border-r border-gray-100">
                      <div className="flex items-center gap-2">
                        {row.macDinhHeThong && (
                          <Lock className="w-4 h-4 text-amber-500 flex-shrink-0" aria-label="Loại quy trình hệ thống" />
                        )}
                        <span className={row.macDinhHeThong ? 'font-medium' : ''}>{row.name}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-sm text-gray-500 font-mono border-r border-gray-100">{row.code}</td>
                    <td className="px-3 py-2.5 text-center border-r border-gray-100">
                      <input
                        type="number"
                        defaultValue={row.thuTu}
                        min={0}
                        onBlur={(e) => handleUpdateThuTu(row, parseInt(e.target.value, 10) || 0)}
                        className="w-20 px-2 py-1 text-center border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-3 py-2.5 text-center border-r border-gray-100">
                      <button
                        onClick={() => handleToggleKichHoat(row)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${row.kichHoat ? 'bg-blue-600' : 'bg-gray-300'}`}
                        aria-label={row.kichHoat ? 'Đang kích hoạt' : 'Đã tắt'}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${row.kichHoat ? 'translate-x-6' : 'translate-x-1'}`}
                        />
                      </button>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => {
                            setEditingRow(row);
                            setEditName(row.name);
                          }}
                          disabled={row.macDinhHeThong}
                          title={row.macDinhHeThong ? 'Không thể đổi tên loại hệ thống' : 'Chỉnh sửa'}
                          className={`p-2 rounded transition-colors ${
                            row.macDinhHeThong
                              ? 'text-gray-300 cursor-not-allowed'
                              : 'text-blue-600 hover:bg-blue-50'
                          }`}
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        {!row.macDinhHeThong && (
                          <button
                            onClick={() => setDeletingRow(row)}
                            className="p-2 rounded text-red-600 hover:bg-red-50 transition-colors"
                            title="Xóa"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>

      {/* Create modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-sm w-full max-w-md">
            <div className="flex justify-between items-center p-4 border-b border-gray-200">
              <h2 className="text-base font-semibold text-gray-800">Thêm loại quy trình</h2>
              <button onClick={() => setIsCreateOpen(false)} className="p-1.5 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tên loại quy trình *</label>
                <input
                  type="text"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  placeholder="VD: Kiểm định"
                  className="w-full px-3 py-2 border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
                <p className="text-xs text-gray-500 mt-1">Mã sẽ được tạo tự động từ tên</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Thứ tự</label>
                <input
                  type="number"
                  min={0}
                  value={createThuTu}
                  onChange={(e) => setCreateThuTu(parseInt(e.target.value, 10) || 0)}
                  className="w-full px-3 py-2 border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 p-4 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => setIsCreateOpen(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={handleCreate}
                disabled={createMutation.isPending}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                <Save className="w-4 h-4" />
                Lưu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editingRow && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-sm w-full max-w-md">
            <div className="flex justify-between items-center p-4 border-b border-gray-200">
              <h2 className="text-base font-semibold text-gray-800">Đổi tên loại quy trình</h2>
              <button onClick={() => setEditingRow(null)} className="p-1.5 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tên mới *</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
                <p className="text-xs text-gray-500 mt-1">Mã ({editingRow.code}) giữ nguyên</p>
              </div>
            </div>
            <div className="flex justify-end gap-2 p-4 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => setEditingRow(null)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={handleEditSave}
                disabled={updateMutation.isPending}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                <Save className="w-4 h-4" />
                Lưu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {deletingRow && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-sm w-full max-w-md">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-base font-semibold text-red-600">Xác nhận xóa</h2>
            </div>
            <div className="p-5">
              <p className="text-gray-700">
                Bạn có chắc chắn muốn xóa loại quy trình <strong>{deletingRow.name}</strong>?
              </p>
              <p className="text-sm text-gray-500 mt-2">
                Thao tác này không thể hoàn tác. Nếu có quy trình đang dùng loại này, hệ thống sẽ từ chối.
              </p>
            </div>
            <div className="flex justify-end gap-2 p-4 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => setDeletingRow(null)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
                className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProcessTypeSettings;
