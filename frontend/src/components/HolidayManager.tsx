import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { useHolidays, useCreateHoliday, useUpdateHoliday, useDeleteHoliday } from '../hooks/useHolidays';
import { Holiday } from '../services/holidayService';
import { Plus, Pencil, Trash2, X, Save } from 'lucide-react';

const HolidayManager: React.FC = () => {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [editingItem, setEditingItem] = useState<Holiday | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', date: '', note: '' });

  const { data: holidays = [], isLoading } = useHolidays(selectedYear);
  const createMutation = useCreateHoliday();
  const updateMutation = useUpdateHoliday();
  const deleteMutation = useDeleteHoliday();

  const resetForm = () => {
    setForm({ name: '', date: '', note: '' });
    setEditingItem(null);
    setShowForm(false);
  };

  const handleEdit = (h: Holiday) => {
    setEditingItem(h);
    setForm({ name: h.name, date: h.date.split('T')[0], note: h.note || '' });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.date) { toast.error('Vui lòng nhập tên và ngày lễ'); return; }
    try {
      if (editingItem) {
        await updateMutation.mutateAsync({ id: editingItem.id, data: form });
      } else {
        await createMutation.mutateAsync(form);
      }
      toast.success(editingItem ? 'Cập nhật ngày lễ thành công' : 'Thêm ngày lễ thành công');
      resetForm();
    } catch (err: any) {
      toast.error(err instanceof Error ? err.message : 'Lỗi khi lưu ngày lễ');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Xóa ngày lễ này?')) return;
    try {
      await deleteMutation.mutateAsync(id);
      toast.success('Đã xóa ngày lễ');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Lỗi khi xóa');
    }
  };

  const formatDate = (d: string) => {
    const dt = new Date(d);
    return `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}/${dt.getFullYear()}`;
  };

  return (
    <div className="p-4 space-y-4 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Quản lý Ngày lễ</h2>
        <div className="flex items-center gap-3">
          <select value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))} className="px-3 py-1.5 border rounded-md text-sm">
            {[currentYear - 1, currentYear, currentYear + 1].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button onClick={() => { resetForm(); setShowForm(true); }} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm">
            <Plus size={16} /> Thêm
          </button>
        </div>
      </div>

      {showForm && (
        <div className="border rounded-lg p-4 bg-gray-50 space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="font-medium text-sm">{editingItem ? 'Sửa ngày lễ' : 'Thêm ngày lễ'}</h3>
            <button onClick={resetForm} className="text-gray-500 hover:text-gray-700"><X size={18} /></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input type="text" placeholder="Tên ngày lễ *" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="px-3 py-2 border rounded-md text-sm" />
            <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="px-3 py-2 border rounded-md text-sm" />
            <input type="text" placeholder="Ghi chú" value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} className="px-3 py-2 border rounded-md text-sm" />
          </div>
          <button onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending} className="flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm disabled:bg-gray-400">
            <Save size={16} /> Lưu
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-6 text-gray-500">Đang tải...</div>
      ) : holidays.length === 0 ? (
        <div className="text-center py-6 text-gray-400">Chưa có ngày lễ cho năm {selectedYear}</div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left">Tên</th>
                <th className="px-4 py-2 text-left">Ngày</th>
                <th className="px-4 py-2 text-left">Ghi chú</th>
                <th className="px-4 py-2 w-20"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {holidays.map(h => (
                <tr key={h.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2">{h.name}</td>
                  <td className="px-4 py-2">{formatDate(h.date)}</td>
                  <td className="px-4 py-2 text-gray-500">{h.note || '-'}</td>
                  <td className="px-4 py-2 flex gap-1">
                    <button onClick={() => handleEdit(h)} className="p-1 text-blue-600 hover:bg-blue-50 rounded"><Pencil size={14} /></button>
                    <button onClick={() => handleDelete(h.id)} className="p-1 text-red-600 hover:bg-red-50 rounded"><Trash2 size={14} /></button>
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

export default HolidayManager;
