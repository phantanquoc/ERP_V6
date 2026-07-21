import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { Plus, Edit, Trash2, X } from 'lucide-react';
import Modal from '../Modal';
import internationalProductService from '../../services/internationalProductService';

interface CategorySettingsModalProps {
  isOpen: boolean;
  categories: string[];
  onClose: () => void;
  onChanged: () => void; // refetch categories + invalidate product list
}

const CategorySettingsModal: React.FC<CategorySettingsModalProps> = ({ isOpen, categories, onClose, onChanged }) => {
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editCategoryName, setEditCategoryName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleClose = () => {
    setEditingCategory(null);
    setNewCategoryName('');
    onClose();
  };

  const handleAdd = async () => {
    const name = newCategoryName.trim();
    if (!name) return;
    if (categories.includes(name)) {
      toast.error('Loại hàng hóa này đã tồn tại');
      return;
    }
    setLoading(true);
    try {
      await internationalProductService.addCategory(name);
      onChanged();
      setNewCategoryName('');
      toast.success('Đã thêm loại hàng hóa');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Lỗi khi thêm loại hàng hóa');
    } finally {
      setLoading(false);
    }
  };

  const handleRename = async (oldName: string) => {
    const newName = editCategoryName.trim();
    if (!newName || newName === oldName) {
      setEditingCategory(null);
      return;
    }
    if (categories.includes(newName)) {
      toast.error('Loại hàng hóa này đã tồn tại');
      return;
    }
    setLoading(true);
    try {
      await internationalProductService.renameCategory(oldName, newName);
      onChanged();
      setEditingCategory(null);
      toast.success('Đã đổi tên loại hàng hóa');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Lỗi khi đổi tên');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (name: string) => {
    if (!window.confirm(`Xóa loại "${name}"? Các sản phẩm thuộc loại này sẽ bị bỏ trống loại hàng hóa.`)) return;
    setLoading(true);
    try {
      await internationalProductService.deleteCategory(name);
      onChanged();
      toast.success('Đã xóa loại hàng hóa');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Lỗi khi xóa');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} showBackdrop>
      <div className="bg-white rounded-lg shadow-xl w-[calc(100vw-1rem)] sm:max-w-lg sm:w-full flex flex-col max-h-[calc(100vh-1rem)] sm:max-h-[calc(100vh-2rem)]" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-start sm:items-center gap-3 border-b px-4 sm:px-6 py-4 shrink-0">
          <h2 className="text-lg sm:text-xl font-bold">Cài đặt loại hàng hóa</h2>
          <button onClick={handleClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row gap-2 mb-4">
            <input
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
              placeholder="Nhập tên loại hàng hóa mới..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
            <button
              onClick={handleAdd}
              disabled={!newCategoryName.trim() || loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-2">
            {categories.length === 0 ? (
              <p className="text-gray-500 text-center py-4">Chưa có loại hàng hóa nào</p>
            ) : (
              categories.map((cat) => (
                <div key={cat} className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg border border-gray-200">
                  {editingCategory === cat ? (
                    <input
                      type="text"
                      value={editCategoryName}
                      onChange={(e) => setEditCategoryName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleRename(cat); }}
                      className="flex-1 px-2 py-1 border border-blue-300 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none mr-2"
                      autoFocus
                    />
                  ) : (
                    <span className="text-sm text-gray-900">{cat}</span>
                  )}
                  <div className="flex items-center gap-1">
                    {editingCategory === cat ? (
                      <>
                        <button onClick={() => handleRename(cat)} disabled={loading} className="p-1 text-green-600 hover:bg-green-100 rounded" title="Lưu">✓</button>
                        <button onClick={() => setEditingCategory(null)} className="p-1 text-gray-500 hover:bg-gray-200 rounded" title="Hủy">✕</button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => { setEditingCategory(cat); setEditCategoryName(cat); }} className="p-1 text-blue-600 hover:bg-blue-100 rounded" title="Sửa">
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDelete(cat)} disabled={loading} className="p-1 text-red-600 hover:bg-red-100 rounded" title="Xóa">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default CategorySettingsModal;
