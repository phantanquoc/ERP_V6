import { X, Check, CalendarDays, Lock } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { Theme } from '../services/themeService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function ThemePickerModal({ isOpen, onClose }: Props) {
  const { themes, activeTheme, isEventTheme, applyTheme, refreshThemes } = useTheme();
  const [selected, setSelected] = useState<Theme | null>(activeTheme);

  // Fetch full theme list when modal opens (requires auth token)
  useEffect(() => {
    if (!isOpen) return;
    const token = sessionStorage.getItem('access_token') || localStorage.getItem('access_token') || '';
    if (token) refreshThemes(token);
  }, [isOpen, refreshThemes]);

  // Keep local selection in sync with context
  useEffect(() => {
    setSelected(activeTheme);
  }, [activeTheme]);

  if (!isOpen) return null;

  const handleApply = () => {
    if (selected) applyTheme(selected);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-2xl mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">Chọn giao diện</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Tuỳ chỉnh màu sắc cho trải nghiệm của bạn
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {/* Event theme notice */}
          {isEventTheme && activeTheme && (
            <div className="mb-4 flex items-start gap-3 p-3 rounded-xl bg-amber-50 border border-amber-200">
              <Lock className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-amber-700">
                Hôm nay đang áp dụng theme sự kiện{' '}
                <strong>"{activeTheme.displayName}"</strong>.
                Trong thời gian sự kiện, giao diện tự động chuyển theo lịch.
              </p>
            </div>
          )}

          {themes.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <div className="animate-spin w-6 h-6 border-2 border-gray-300 border-t-primary rounded-full mx-auto mb-3" />
              Đang tải danh sách giao diện…
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {themes.map((theme) => {
                const isSelected = selected?.id === theme.id;
                const isEvent    = !theme.isDefault && !!theme.startDate;

                return (
                  <button
                    key={theme.id}
                    onClick={() => !isEventTheme && setSelected(theme)}
                    disabled={isEventTheme}
                    className={`
                      relative flex items-center gap-4 p-4 rounded-xl border-2 text-left
                      transition-all duration-200
                      ${isSelected
                        ? 'border-primary shadow-md scale-[1.01]'
                        : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                      }
                      ${isEventTheme ? 'opacity-70 cursor-default' : 'cursor-pointer'}
                    `}
                  >
                    {/* Color swatches */}
                    <div className="flex-shrink-0 flex gap-1">
                      <div
                        className="w-8 h-14 rounded-l-lg"
                        style={{ backgroundColor: theme.sidebarColor }}
                      />
                      <div className="flex flex-col gap-1">
                        <div
                          className="w-8 h-7 rounded-tr-lg"
                          style={{ backgroundColor: theme.primaryColor }}
                        />
                        <div
                          className="w-8 h-6 rounded-br-lg"
                          style={{ backgroundColor: theme.accentColor }}
                        />
                      </div>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-800 truncate">
                          {theme.displayName}
                        </span>
                        {isEvent && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-rose-100 text-rose-600">
                            <CalendarDays className="w-3 h-3" />
                            Sự kiện
                          </span>
                        )}
                        {theme.isDefault && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-600">
                            Mặc định
                          </span>
                        )}
                      </div>
                      {theme.description && (
                        <p className="text-xs text-gray-400 mt-1 line-clamp-1">
                          {theme.description}
                        </p>
                      )}
                      {isEvent && theme.startDate && (
                        <p className="text-xs text-rose-400 mt-1">
                          {new Date(theme.startDate).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
                          {theme.endDate && theme.endDate !== theme.startDate
                            ? ` – ${new Date(theme.endDate).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}`
                            : ''}
                        </p>
                      )}
                    </div>

                    {/* Check mark */}
                    {isSelected && (
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                        <Check className="w-3.5 h-3.5 text-white" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Huỷ
          </button>
          <button
            onClick={handleApply}
            disabled={!selected || isEventTheme}
            className="px-5 py-2 text-sm font-medium text-white bg-primary rounded-lg
                       hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Áp dụng
          </button>
        </div>
      </div>
    </div>
  );
}
