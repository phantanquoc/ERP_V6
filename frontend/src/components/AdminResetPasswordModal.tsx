import React, { useState } from 'react';
import { KeyRound, Eye, EyeOff, RefreshCw, Copy, Check, X } from 'lucide-react';
import apiClient from '@services/apiClient';

interface Props {
  userId: string;
  employeeName: string;
  onClose: () => void;
}

const TEMP_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';

function generateTempPassword(): string {
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += TEMP_CHARS.charAt(Math.floor(Math.random() * TEMP_CHARS.length));
  }
  return result;
}

const AdminResetPasswordModal: React.FC<Props> = ({ userId, employeeName, onClose }) => {
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [resultPassword, setResultPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  const handleGenerate = () => {
    setNewPassword(generateTempPassword());
    setShowPassword(true);
    setError('');
  };

  const handleSubmit = async () => {
    if (!userId) {
      setError('Không xác định được tài khoản. Vui lòng đặt lại mật khẩu trong trang Quản lý nhân sự.');
      return;
    }
    const trimmed = newPassword.trim();
    if (!trimmed) { setError('Vui lòng nhập mật khẩu mới'); return; }
    if (trimmed.length < 6) { setError('Mật khẩu phải có ít nhất 6 ký tự'); return; }
    setError('');
    setIsLoading(true);
    try {
      const response = await apiClient.post<{ newPassword: string }>(`/users/${userId}/reset-password`, { newPassword: trimmed });
      setResultPassword(response.data.newPassword);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Đặt lại mật khẩu thất bại';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    if (!resultPassword) return;
    navigator.clipboard.writeText(resultPassword).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <KeyRound className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">Đặt lại mật khẩu</h2>
              <p className="text-sm text-gray-500 truncate max-w-[220px]">{employeeName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          {resultPassword ? (
            /* Success state */
            <div className="space-y-4">
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <p className="text-sm text-green-700 mb-3 font-medium">
                  Mật khẩu đã được cập nhật. Hãy thông báo mật khẩu tạm thời sau cho nhân viên:
                </p>
                <div className="flex items-center gap-2 bg-white rounded-lg border border-green-300 px-3 py-2.5">
                  <code className="flex-1 font-mono text-lg font-bold text-gray-900 tracking-wider">
                    {resultPassword}
                  </code>
                  <button
                    onClick={handleCopy}
                    className="p-1 text-gray-400 hover:text-gray-700 transition-colors"
                    title="Sao chép"
                  >
                    {copied
                      ? <Check className="w-4 h-4 text-green-600" />
                      : <Copy className="w-4 h-4" />
                    }
                  </button>
                </div>
                {copied && <p className="text-xs text-green-600 mt-1.5">Đã sao chép!</p>}
              </div>
              <p className="text-xs text-gray-400">
                Nhân viên nên đổi mật khẩu ngay sau khi đăng nhập lần đầu.
              </p>
              <button
                onClick={onClose}
                className="w-full py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium text-sm transition-colors"
              >
                Đóng
              </button>
            </div>
          ) : (
            /* Input state */
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Mật khẩu mới
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={e => { setNewPassword(e.target.value); setError(''); }}
                      onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                      placeholder="Nhập mật khẩu mới..."
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={handleGenerate}
                    className="flex items-center gap-1.5 px-3 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium whitespace-nowrap transition-colors"
                    title="Tạo mật khẩu ngẫu nhiên"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Tự động
                  </button>
                </div>
                {error && <p className="text-xs text-red-600 mt-1.5">{error}</p>}
                <p className="text-xs text-gray-400 mt-1">Tối thiểu 6 ký tự</p>
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  onClick={onClose}
                  className="flex-1 py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium text-sm transition-colors"
                >
                  Hủy
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={isLoading}
                  className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-medium text-sm transition-colors"
                >
                  {isLoading ? 'Đang cập nhật...' : 'Cập nhật'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminResetPasswordModal;
