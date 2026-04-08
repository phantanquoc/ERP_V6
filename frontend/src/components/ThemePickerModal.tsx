import React, { useState } from 'react';
import { X, Palette, Check, RefreshCw } from 'lucide-react';
import Modal from './Modal';
import { useThemeContext } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types/auth';
import { useCreateTheme, useUpdateTheme, useDeleteTheme } from '../hooks/useTheme';
import type { ThemeData, CreateThemeInput } from '../services/themeService';

interface ThemePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ThemePickerModal: React.FC<ThemePickerModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const { theme: activeTheme, allThemes, previewTheme, refreshTheme } = useThemeContext();
  const isAdmin = user?.role === UserRole.ADMIN;

  const [previewingId, setPreviewingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [editingTheme, setEditingTheme] = useState<ThemeData | null>(null);
  const [formData, setFormData] = useState<Partial<CreateThemeInput>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const createMutation = useCreateTheme();
  const updateMutation = useUpdateTheme();
  const deleteMutation = useDeleteTheme();

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const handlePreview = (t: ThemeData) => {
    setPreviewingId(t.id);
    previewTheme(t);
  };

  const handleCancelPreview = () => {
    setPreviewingId(null);
    previewTheme(null);
  };

  const handleClose = () => {
    // Khôi phục theme nếu đang preview
    if (previewingId) previewTheme(null);
    setPreviewingId(null);
    setIsCreating(false);
    setEditingTheme(null);
    setFormData({});
    onClose();
  };

  const handleEdit = (t: ThemeData) => {
    setEditingTheme(t);
    setFormData({
      name: t.name,
      displayName: t.displayName,
      primaryColor: t.primaryColor,
      secondaryColor: t.secondaryColor,
      accentColor: t.accentColor,
      bgColor: t.bgColor,
      sidebarColor: t.sidebarColor,
      sidebarText: t.sidebarText,
      startDate: t.startDate ?? undefined,
      endDate: t.endDate ?? undefined,
      description: t.description ?? undefined,
    });
    setIsCreating(false);
  };

  const handleNewTheme = () => {
    setEditingTheme(null);
    setFormData({
      primaryColor: '#1e3a5f',
      secondaryColor: '#2d6a4f',
      accentColor: '#e63946',
      bgColor: '#f3f4f6',
      sidebarColor: '#1e3a5f',
      sidebarText: '#ffffff',
    });
    setIsCreating(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.displayName || !formData.primaryColor || !formData.secondaryColor || !formData.accentColor) {
      showMessage('error', 'Vui lòng điền đầy đủ các trường bắt buộc');
      return;
    }

    setIsSaving(true);
    try {
      if (isCreating) {
        await createMutation.mutateAsync(formData as CreateThemeInput);
        showMessage('success', 'Tạo theme thành công');
      } else if (editingTheme) {
        await updateMutation.mutateAsync({ id: editingTheme.id, data: formData });
        showMessage('success', 'Cập nhật theme thành công');
      }
      await refreshTheme();
      setIsCreating(false);
      setEditingTheme(null);
      setFormData({});
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Có lỗi xảy ra';
      showMessage('error', msg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xoá theme này?')) return;
    try {
      await deleteMutation.mutateAsync(id);
      await refreshTheme();
      showMessage('success', 'Xoá theme thành công');
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Không thể xoá theme';
      showMessage('error', msg);
    }
  };

  const isFormOpen = isCreating || editingTheme !== null;

  return (
    <Modal isOpen={isOpen} onClose={handleClose}>
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 rounded-t-2xl flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                <Palette className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Chọn giao diện</h2>
                <p className="text-blue-100 text-sm">Tuỳ chỉnh màu sắc hệ thống</p>
              </div>
            </div>
            <button onClick={handleClose} className="text-white hover:text-blue-200 transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Message */}
        {message && (
          <div
            className={`mx-6 mt-4 px-4 py-2 rounded-lg text-sm font-medium flex-shrink-0 ${
              message.type === 'success'
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Theme List */}
          {!isFormOpen && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {allThemes.map((t) => {
                  const isCurrent = activeTheme?.id === t.id;
                  const isPreviewing = previewingId === t.id;

                  return (
                    <div
                      key={t.id}
                      className={`relative rounded-xl border-2 p-4 cursor-pointer transition-all ${
                        isCurrent
                          ? 'border-blue-500 bg-blue-50'
                          : isPreviewing
                          ? 'border-indigo-400 bg-indigo-50'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                      onClick={() => handlePreview(t)}
                    >
                      {isCurrent && (
                        <span className="absolute top-2 right-2 bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Check className="w-3 h-3" /> Hiện tại
                        </span>
                      )}
                      {t.isDefault && !isCurrent && (
                        <span className="absolute top-2 right-2 bg-gray-400 text-white text-xs px-2 py-0.5 rounded-full">
                          Mặc định
                        </span>
                      )}

                      {/* Color swatches */}
                      <div className="flex gap-2 mb-3">
                        <div
                          className="w-8 h-8 rounded-full border border-gray-200 shadow-sm"
                          style={{ backgroundColor: t.primaryColor }}
                          title="Primary"
                        />
                        <div
                          className="w-8 h-8 rounded-full border border-gray-200 shadow-sm"
                          style={{ backgroundColor: t.secondaryColor }}
                          title="Secondary"
                        />
                        <div
                          className="w-8 h-8 rounded-full border border-gray-200 shadow-sm"
                          style={{ backgroundColor: t.accentColor }}
                          title="Accent"
                        />
                        <div
                          className="w-8 h-8 rounded-full border border-gray-200 shadow-sm"
                          style={{ backgroundColor: t.sidebarColor }}
                          title="Sidebar"
                        />
                      </div>

                      <p className="font-semibold text-gray-800 text-sm">{t.displayName}</p>
                      {t.description && (
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{t.description}</p>
                      )}
                      {(t.startDate || t.endDate) && (
                        <p className="text-xs text-indigo-500 mt-1">
                          {t.startDate ? new Date(t.startDate).toLocaleDateString('vi-VN') : '?'}
                          {' – '}
                          {t.endDate ? new Date(t.endDate).toLocaleDateString('vi-VN') : '?'}
                        </p>
                      )}

                      {/* Admin actions */}
                      {isAdmin && !t.isDefault && (
                        <div
                          className="flex gap-2 mt-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={() => handleEdit(t)}
                            className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                          >
                            Sửa
                          </button>
                          <button
                            onClick={() => handleDelete(t.id)}
                            className="text-xs text-red-500 hover:text-red-700 font-medium"
                          >
                            Xoá
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Preview cancel */}
              {previewingId && (
                <div className="flex items-center gap-3 p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
                  <RefreshCw className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                  <p className="text-sm text-indigo-700 flex-1">Đang xem trước — nhấn Huỷ để khôi phục</p>
                  <button
                    onClick={handleCancelPreview}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                  >
                    Huỷ preview
                  </button>
                </div>
              )}

              {/* Admin: tạo theme mới */}
              {isAdmin && (
                <button
                  onClick={handleNewTheme}
                  className="w-full py-2.5 border-2 border-dashed border-gray-300 rounded-xl text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-colors"
                >
                  + Tạo theme mới
                </button>
              )}
            </>
          )}

          {/* Create / Edit Form */}
          {isAdmin && isFormOpen && (
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-800">
                {isCreating ? 'Tạo theme mới' : `Sửa: ${editingTheme?.displayName}`}
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tên (slug) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name ?? ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="tet-2025"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={!!editingTheme}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tên hiển thị <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.displayName ?? ''}
                    onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                    placeholder="Tết Nguyên Đán 2025"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                {(
                  [
                    { key: 'primaryColor', label: 'Primary' },
                    { key: 'secondaryColor', label: 'Secondary' },
                    { key: 'accentColor', label: 'Accent' },
                    { key: 'bgColor', label: 'Background' },
                    { key: 'sidebarColor', label: 'Sidebar' },
                    { key: 'sidebarText', label: 'Sidebar Text' },
                  ] as { key: keyof CreateThemeInput; label: string }[]
                ).map(({ key, label }) => (
                  <div key={key}>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      {label} {['primaryColor', 'secondaryColor', 'accentColor'].includes(key) && <span className="text-red-500">*</span>}
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={(formData[key] as string) ?? '#000000'}
                        onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}
                        className="w-8 h-8 rounded cursor-pointer border border-gray-300"
                      />
                      <input
                        type="text"
                        value={(formData[key] as string) ?? ''}
                        onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}
                        className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                        placeholder="#000000"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ngày bắt đầu</label>
                  <input
                    type="date"
                    value={formData.startDate ?? ''}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value || undefined })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ngày kết thúc</label>
                  <input
                    type="date"
                    value={formData.endDate ?? ''}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value || undefined })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả</label>
                <input
                  type="text"
                  value={formData.description ?? ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value || undefined })}
                  placeholder="Giao diện dịp Tết Nguyên Đán"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 flex-shrink-0">
          {isAdmin && isFormOpen ? (
            <>
              <button
                onClick={() => { setIsCreating(false); setEditingTheme(null); setFormData({}); }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50 transition-colors"
                disabled={isSaving}
              >
                Quay lại
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors disabled:opacity-50"
                disabled={isSaving}
              >
                {isSaving ? 'Đang lưu...' : 'Lưu'}
              </button>
            </>
          ) : (
            <button
              onClick={handleClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50 transition-colors"
            >
              Đóng
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default ThemePickerModal;
