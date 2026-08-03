import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, X, Save } from 'lucide-react';
import materialEvaluationCriteriaService, {
  MaterialEvaluationCriteria,
} from '../services/materialEvaluationCriteriaService';

const MaterialCriteriaManager: React.FC = () => {
  const [criteria, setCriteria] = useState<MaterialEvaluationCriteria[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<MaterialEvaluationCriteria | null>(null);
  const [form, setForm] = useState({ code: 0, description: '', isActive: true });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await materialEvaluationCriteriaService.getAllCriteria();
      setCriteria(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Lỗi khi tải tiêu chí');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const resetForm = () => {
    setForm({ code: 0, description: '', isActive: true });
    setEditingItem(null);
    setShowForm(false);
  };

  /** Mã mới lấy từ server vì next-code tính cả record đã xóa, tránh trùng unique. */
  const openCreateForm = async () => {
    setEditingItem(null);
    setShowForm(true);
    try {
      const nextCode = await materialEvaluationCriteriaService.getNextCode();
      setForm({ code: nextCode, description: '', isActive: true });
    } catch {
      setForm({ code: 0, description: '', isActive: true });
    }
  };

  const handleEdit = (item: MaterialEvaluationCriteria) => {
    setEditingItem(item);
    setForm({ code: item.code, description: item.description, isActive: item.isActive });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.description.trim()) {
      toast.error('Vui lòng nhập nội dung tiêu chí');
      return;
    }
    setSaving(true);
    try {
      if (editingItem) {
        await materialEvaluationCriteriaService.updateCriteria(editingItem.id, form);
      } else {
        await materialEvaluationCriteriaService.createCriteria({
          code: form.code,
          description: form.description.trim(),
        });
      }
      toast.success(editingItem ? 'Cập nhật tiêu chí thành công' : 'Thêm tiêu chí thành công');
      resetForm();
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Lỗi khi lưu tiêu chí');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item: MaterialEvaluationCriteria) => {
    if (!confirm(`Xóa tiêu chí "${item.description}"?`)) return;
    try {
      await materialEvaluationCriteriaService.deleteCriteria(item.id);
      toast.success('Đã xóa tiêu chí');
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Lỗi khi xóa');
    }
  };

  const handleToggleActive = async (item: MaterialEvaluationCriteria) => {
    try {
      await materialEvaluationCriteriaService.updateCriteria(item.id, { isActive: !item.isActive });
      toast.success(item.isActive ? 'Đã tắt tiêu chí' : 'Đã bật tiêu chí');
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Lỗi khi cập nhật');
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-end">
        <button
          onClick={openCreateForm}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
        >
          <Plus size={16} /> Thêm tiêu chí
        </button>
      </div>

      {showForm && (
        <div className="border rounded-lg p-4 bg-white space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="font-medium text-sm">{editingItem ? 'Sửa tiêu chí' : 'Thêm tiêu chí mới'}</h3>
            <button onClick={resetForm} className="text-gray-500 hover:text-gray-700">
              <X size={18} />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1">Mã *</label>
              <input
                type="number"
                min={1}
                value={form.code}
                onChange={(e) => setForm({ ...form, code: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 border rounded-md text-sm"
              />
            </div>
            <div className="sm:col-span-3">
              <label className="block text-xs font-medium mb-1">Nội dung tiêu chí *</label>
              <input
                type="text"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="VD: Màu sắc đạt yêu cầu"
                className="w-full px-3 py-2 border rounded-md text-sm"
              />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                className="rounded"
              />
              Hoạt động
            </label>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm disabled:bg-gray-400"
            >
              <Save size={16} /> Lưu
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-6 text-gray-500 text-sm">Đang tải...</div>
      ) : criteria.length === 0 ? (
        <div className="text-center py-6 text-gray-400 text-sm">Chưa có tiêu chí nào</div>
      ) : (
        <div className="border rounded-lg overflow-hidden bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-gray-600 w-20">Mã</th>
                <th className="px-3 py-2 text-left font-medium text-gray-600">Nội dung</th>
                <th className="px-3 py-2 text-center font-medium text-gray-600 w-28">Trạng thái</th>
                <th className="px-3 py-2 text-right font-medium text-gray-600 w-24">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {criteria.map((item) => (
                <tr key={item.id} className={item.isActive ? '' : 'bg-gray-50 text-gray-400'}>
                  <td className="px-3 py-2 font-mono">{item.code}</td>
                  <td className="px-3 py-2">{item.description}</td>
                  <td className="px-3 py-2 text-center">
                    <button
                      onClick={() => handleToggleActive(item)}
                      className={`px-2 py-0.5 rounded-full text-xs ${
                        item.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'
                      }`}
                    >
                      {item.isActive ? 'Hoạt động' : 'Đã tắt'}
                    </button>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => handleEdit(item)}
                        className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                        title="Sửa"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(item)}
                        className="p-1 text-red-600 hover:bg-red-100 rounded"
                        title="Xóa"
                      >
                        <Trash2 size={14} />
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
  );
};

export default MaterialCriteriaManager;
