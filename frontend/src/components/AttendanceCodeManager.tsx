import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { useAttendanceCodes, useCreateAttendanceCode, useUpdateAttendanceCode, useDeleteAttendanceCode } from '../hooks/useAttendanceCodes';
import { AttendanceCode } from '../services/attendanceCodeService';
import { Plus, Pencil, Trash2, X, Save } from 'lucide-react';

const AttendanceCodeManager: React.FC = () => {
  const [editingItem, setEditingItem] = useState<AttendanceCode | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ code: '', label: '', description: '', sortOrder: 0, isActive: true });

  const { data: codes = [], isLoading } = useAttendanceCodes();
  const createMutation = useCreateAttendanceCode();
  const updateMutation = useUpdateAttendanceCode();
  const deleteMutation = useDeleteAttendanceCode();

  const resetForm = () => {
    setForm({ code: '', label: '', description: '', sortOrder: codes.length, isActive: true });
    setEditingItem(null);
    setShowForm(false);
  };

  const handleEdit = (item: AttendanceCode) => {
    setEditingItem(item);
    setForm({ code: item.code, label: item.label, description: item.description || '', sortOrder: item.sortOrder, isActive: item.isActive });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.code || !form.label) { toast.error('Vui lòng nhập mã và tên'); return; }
    try {
      if (editingItem) {
        await updateMutation.mutateAsync({ id: editingItem.id, data: form });
      } else {
        await createMutation.mutateAsync(form);
      }
      toast.success(editingItem ? 'Cập nhật mã chấm công thành công' : 'Thêm mã chấm công thành công');
      resetForm();
    } catch (err: any) {
      toast.error(err instanceof Error ? err.message : 'Lỗi khi lưu mã chấm công');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Xóa mã chấm công này?')) return;
    try {
      await deleteMutation.mutateAsync(id);
      toast.success('Đã xóa mã chấm công');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Lỗi khi xóa');
    }
  };

  const handleToggleActive = async (item: AttendanceCode) => {
    try {
      await updateMutation.mutateAsync({ id: item.id, data: { isActive: !item.isActive } });
      toast.success(item.isActive ? 'Đã tắt mã chấm công' : 'Đã bật mã chấm công');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Lỗi khi cập nhật');
    }
  };

  return (
    <div className="p-4 space-y-4 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Quản lý Mã chấm công</h2>
        <button onClick={() => { resetForm(); setShowForm(true); }} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm">
          <Plus size={16} /> Thêm mã
        </button>
      </div>

      {showForm && (
        <div className="border rounded-lg p-4 bg-gray-50 space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="font-medium text-sm">{editingItem ? 'Sửa mã' : 'Thêm mã mới'}</h3>
            <button onClick={resetForm} className="text-gray-500 hover:text-gray-700"><X size={18} /></button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <input type="text" placeholder="Mã *" value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} className="px-3 py-2 border rounded-md text-sm" maxLength={5} />
            <input type="text" placeholder="Tên *" value={form.label} onChange={e => setForm({ ...form, label: e.target.value })} className="px-3 py-2 border rounded-md text-sm" />
            <input type="text" placeholder="Mô tả" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="px-3 py-2 border rounded-md text-sm" />
            <input type="number" placeholder="Thứ tự" value={form.sortOrder} onChange={e => setForm({ ...form, sortOrder: parseInt(e.target.value) || 0 })} className="px-3 py-2 border rounded-md text-sm" />
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.isActive} onChange={e => setForm({ ...form, isActive: e.target.checked })} className="rounded" />
              Hoạt động
            </label>
            <button onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending} className="flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm disabled:bg-gray-400">
              <Save size={16} /> Lưu
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-6 text-gray-500">Đang tải...</div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left w-16">Mã</th>
                <th className="px-3 py-2 text-left">Tên</th>
                <th className="px-3 py-2 text-left">Mô tả</th>
                <th className="px-3 py-2 text-center w-16">TT</th>
                <th className="px-3 py-2 text-center w-20">Trạng thái</th>
                <th className="px-3 py-2 w-20"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {codes.map(item => (
                <tr key={item.id} className={`hover:bg-gray-50 ${!item.isActive ? 'opacity-50' : ''}`}>
                  <td className="px-3 py-2 font-mono font-medium">{item.code}</td>
                  <td className="px-3 py-2">{item.label}</td>
                  <td className="px-3 py-2 text-gray-500">{item.description || '-'}</td>
                  <td className="px-3 py-2 text-center">{item.sortOrder}</td>
                  <td className="px-3 py-2 text-center">
                    <button onClick={() => handleToggleActive(item)} className={`px-2 py-0.5 rounded-full text-xs ${item.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {item.isActive ? 'On' : 'Off'}
                    </button>
                  </td>
                  <td className="px-3 py-2 flex gap-1">
                    <button onClick={() => handleEdit(item)} className="p-1 text-blue-600 hover:bg-blue-50 rounded"><Pencil size={14} /></button>
                    <button onClick={() => handleDelete(item.id)} className="p-1 text-red-600 hover:bg-red-50 rounded"><Trash2 size={14} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AttendanceCodeManager;
