import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { Plus, Edit, Trash2, X } from 'lucide-react';
import Modal from '../Modal';
import internationalProductService, { RenameCategoryPreview } from '../../services/internationalProductService';
import { categoryAbbr as abbreviate } from '../../utils/productCode';

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
  /** Pending rename awaiting confirmation, with the code rewrites it would perform. */
  const [renamePreview, setRenamePreview] = useState<
    (RenameCategoryPreview & { oldName: string; newName: string }) | null
  >(null);

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

  /**
   * Renaming a category changes its abbreviation, which is the prefix of every product
   * code in it — so this asks the server what would change and confirms before saving.
   */
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
      const preview = await internationalProductService.previewRenameCategory(oldName, newName);
      setLoading(false);
      setRenamePreview({ oldName, newName, ...preview.data });
    } catch (error: any) {
      setLoading(false);
      toast.error(error.response?.data?.message || 'Lỗi khi kiểm tra thay đổi mã');
    }
  };

  const confirmRename = async () => {
    if (!renamePreview) return;
    const { oldName, newName } = renamePreview;
    setLoading(true);
    try {
      const res = await internationalProductService.renameCategory(oldName, newName);
      onChanged();
      setEditingCategory(null);
      setRenamePreview(null);
      toast.success(res.message || 'Đã đổi tên loại hàng hóa');
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
                    <span className="text-sm text-gray-900 flex items-center gap-2">
                      {cat}
                      {/* The abbreviation is the code prefix for this category, shown so
                          the effect of a rename is visible before opening the editor. */}
                      <span className="px-1.5 py-0.5 text-[11px] font-mono text-gray-600 bg-gray-200 rounded">
                        {abbreviate(cat)}
                      </span>
                    </span>
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

      {/* Rename confirmation — a rename rewrites the code prefix of every product in the
          category, so the exact list is shown before committing. */}
      {renamePreview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setRenamePreview(null)}
        >
          <div
            className="bg-white rounded-lg shadow-xl w-full max-w-lg flex flex-col max-h-[80vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b">
              <h3 className="font-semibold text-gray-900">Xác nhận đổi tên loại hàng hóa</h3>
              <p className="text-sm text-gray-600 mt-1">
                "{renamePreview.oldName}" → "{renamePreview.newName}"
              </p>
              <p className="text-sm text-gray-600">
                Viết tắt:{' '}
                <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded">{renamePreview.oldAbbr}</span>
                {' → '}
                <span className="font-mono bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">{renamePreview.newAbbr}</span>
              </p>
            </div>

            <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
              {renamePreview.changes.length > 0 ? (
                <div>
                  <p className="text-sm font-medium text-gray-900 mb-2">
                    {renamePreview.changes.length} mã hàng hóa sẽ đổi theo:
                  </p>
                  <div className="space-y-1">
                    {renamePreview.changes.map((c) => (
                      <div key={c.id} className="text-xs flex items-center gap-2">
                        <span className="font-mono text-gray-500 line-through">{c.maCu}</span>
                        <span className="text-gray-400">→</span>
                        <span className="font-mono text-blue-700 font-medium">{c.maMoi}</span>
                        <span className="text-gray-500 truncate">{c.tenSanPham}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-600">
                  Không có mã nào thay đổi (viết tắt giữ nguyên).
                </p>
              )}

              {renamePreview.unchanged.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-1">
                    {renamePreview.unchanged.length} mã giữ nguyên
                  </p>
                  <p className="text-xs text-gray-500 mb-2">
                    Mã không theo cấu trúc LOẠI-STT-TÊNVIẾTTẮT nên không tự đổi được — sửa tay nếu cần.
                  </p>
                  <div className="space-y-1">
                    {renamePreview.unchanged.map((u) => (
                      <div key={u.id} className="text-xs flex items-center gap-2">
                        <span className="font-mono text-gray-600">{u.maCu}</span>
                        <span className="text-gray-500 truncate">{u.tenSanPham}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="px-5 py-4 border-t flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
              <button
                type="button"
                onClick={() => setRenamePreview(null)}
                className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={confirmRename}
                disabled={loading}
                className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Đang lưu...' : 'Đổi tên và cập nhật mã'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
};

export default CategorySettingsModal;
