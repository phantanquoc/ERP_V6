import { X, Check, CalendarDays } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { Theme, getAllThemes } from '../services/themeService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function ThemePickerModal({ isOpen, onClose }: Props) {
  const {
    themes: ctxThemes,
    activeTheme,        // theme đang được lưu (persisted)
    isEventTheme,
    applyTheme,         // áp dụng + lưu localStorage
    previewTheme,       // chỉ đổi CSS vars, không lưu
    revertPreview,      // khôi phục CSS vars về activeTheme
    refreshThemes,
  } = useTheme();

  // Theme người dùng đang hover/click để xem preview (chưa lưu)
  const [previewing, setPreviewing] = useState<Theme | null>(null);
  // Danh sách themes hiển thị trong modal
  const [localThemes, setLocalThemes] = useState<Theme[]>(ctxThemes);
  const [loading, setLoading]         = useState(false);

  // Khi modal mở: reset preview về theme hiện tại + sync list
  useEffect(() => {
    if (!isOpen) return;
    setPreviewing(activeTheme); // mặc định "đang chọn" = theme đang lưu

    if (ctxThemes.length > 0) {
      setLocalThemes(ctxThemes);
    } else {
      setLoading(true);
      getAllThemes()
        .then((data) => { setLocalThemes(data); refreshThemes(); })
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Sync list khi context cập nhật
  useEffect(() => {
    if (ctxThemes.length > 0) setLocalThemes(ctxThemes);
  }, [ctxThemes]);

  if (!isOpen) return null;

  // Người dùng click vào 1 theme → preview ngay lập tức
  const handleSelect = (theme: Theme) => {
    setPreviewing(theme);
    previewTheme(theme); // đổi CSS vars ngay, không lưu
  };

  // Lưu: persist theme đang preview
  const handleSave = () => {
    if (previewing) applyTheme(previewing); // lưu vào localStorage
    onClose();
  };

  // Hủy: revert CSS vars về theme đã lưu trước đó
  const handleCancel = () => {
    revertPreview(); // khôi phục CSS vars
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop — click backdrop = hủy */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleCancel}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-2xl mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">Chọn giao diện</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Click để xem trước, nhấn <strong>Lưu</strong> để áp dụng
            </p>
          </div>
          <button
            onClick={handleCancel}
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
              <CalendarDays className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-amber-700">
                Đang áp dụng theme sự kiện{' '}
                <strong>"{activeTheme.displayName}"</strong> — bạn vẫn có thể chọn theme khác cho riêng mình.
              </p>
            </div>
          )}

          {loading || localThemes.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <div className="animate-spin w-6 h-6 border-2 border-gray-300 border-t-blue-500 rounded-full mx-auto mb-3" />
              Đang tải danh sách giao diện…
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {localThemes.map((theme: Theme) => {
                // Đang preview theme này?
                const isPreviewing = previewing?.id === theme.id;
                // Đây có phải theme đang lưu không (để hiện badge "Đang dùng")?
                const isSaved = activeTheme?.id === theme.id;
                const isEvent = !theme.isDefault && !!theme.startDate;

                return (
                  <button
                    key={theme.id}
                    onClick={() => handleSelect(theme)}
                    className={`
                      relative flex items-center gap-4 p-4 rounded-xl border-2 text-left
                      transition-all duration-200 cursor-pointer
                      ${isPreviewing
                        ? 'border-blue-500 shadow-md scale-[1.01] bg-blue-50/30'
                        : 'border-gray-200 hover:border-blue-300 hover:shadow-sm hover:bg-gray-50'
                      }
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
                      <div className="flex items-center gap-2 flex-wrap">
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
                        {isSaved && !isPreviewing && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-50 text-green-600">
                            Đang dùng
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

                    {/* Check mark khi đang preview */}
                    {isPreviewing && (
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
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
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50">
          {/* Hint */}
          <p className="text-xs text-gray-400">
            {previewing && previewing.id !== activeTheme?.id
              ? `Đang xem trước: ${previewing.displayName}`
              : 'Chọn một giao diện để xem trước'}
          </p>

          <div className="flex items-center gap-3">
            <button
              onClick={handleCancel}
              className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Huỷ
            </button>
            <button
              onClick={handleSave}
              disabled={!previewing || previewing.id === activeTheme?.id}
              className="px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg
                         hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Lưu giao diện
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

