import React, { useState, useEffect } from 'react';
import { KeyRound, Eye, EyeOff, RefreshCw, Copy, Check, X, Loader2 } from 'lucide-react';
import employeeService from '../services/employeeService';
import userService from '../services/userService';
import Modal from './Modal';

interface Props {
  userId: string;       // may be '' for old notifications — resolved via employeeName/metadata
  employeeName: string; // notification.message, used as header subtitle and code extraction fallback
  metadata?: Record<string, unknown>;
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

/** Extract employee code like NV001 or NV0001 from any string containing "(CODE)". */
function extractEmployeeCode(text: string): string | null {
  const match = text.match(/\(([A-Z0-9]+)\)/);
  return match ? match[1] : null;
}

const AdminResetPasswordModal: React.FC<Props> = ({ userId, employeeName, metadata, onClose }) => {
  const [resolvedUserId, setResolvedUserId] = useState(userId);
  const [resolving, setResolving] = useState(false);
  // '' = no error; 'manual' = show manual input fallback
  const [resolveError, setResolveError] = useState('');

  // Manual lookup fallback state
  const [manualCode, setManualCode] = useState('');
  const [manualLooking, setManualLooking] = useState(false);
  const [manualError, setManualError] = useState('');

  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [resultPassword, setResultPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  // If userId is empty, try to resolve it from the employee code in metadata or message
  useEffect(() => {
    if (userId) return; // already have it

    // Source 1: metadata.employeeName — medium-format: "LastName FirstName (NV0001)"
    const metaName = typeof metadata?.employeeName === 'string' ? metadata.employeeName : null;
    let code = metaName ? extractEmployeeCode(metaName) : null;

    // Source 2: message — old-format: "Nhân viên Hiếu Phạm (NV015) yêu cầu đặt lại mật khẩu..."
    if (!code) code = extractEmployeeCode(employeeName);

    if (!code) {
      setResolveError('manual');
      return;
    }

    setResolving(true);
    employeeService.getEmployeeByCode(code)
      .then(res => {
        const uid = (res as any).userId;
        if (uid) {
          setResolvedUserId(uid);
        } else {
          setManualCode(code!);
          setResolveError('manual');
        }
      })
      .catch(() => {
        setManualCode(code!);
        setResolveError('manual');
      })
      .finally(() => setResolving(false));
  }, [userId, employeeName, metadata]);

  const handleManualLookup = async () => {
    const code = manualCode.trim().toUpperCase();
    if (!code) { setManualError('Vui lòng nhập mã nhân viên'); return; }
    setManualLooking(true);
    setManualError('');
    try {
      const res = await employeeService.getEmployeeByCode(code);
      const uid = (res as any).userId;
      if (uid) {
        setResolveError('');
        setResolvedUserId(uid);
      } else {
        setManualError(`Không tìm thấy tài khoản cho mã ${code}`);
      }
    } catch {
      setManualError(`Không thể tra cứu tài khoản (mã ${code})`);
    } finally {
      setManualLooking(false);
    }
  };

  const handleGenerate = () => {
    setNewPassword(generateTempPassword());
    setShowPassword(true);
    setError('');
  };

  const handleSubmit = async () => {
    const trimmed = newPassword.trim();
    if (!trimmed) { setError('Vui lòng nhập mật khẩu mới'); return; }
    if (trimmed.length < 6) { setError('Mật khẩu phải có ít nhất 6 ký tự'); return; }
    setError('');
    setIsLoading(true);
    try {
      const response = await userService.adminResetPassword(resolvedUserId, trimmed);
      setResultPassword(response.newPassword);
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
    <Modal isOpen={true} onClose={onClose} showBackdrop>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md flex flex-col max-h-[calc(100vh-2rem)]" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
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
        <div className="px-6 py-5 overflow-y-auto flex-1">
          {/* Resolving userId from employee code */}
          {resolving && (
            <div className="flex items-center gap-2 text-sm text-gray-500 py-4">
              <Loader2 className="w-4 h-4 animate-spin" />
              Đang tra cứu tài khoản...
            </div>
          )}

          {/* Manual lookup fallback — shown when auto-extract fails or API lookup fails */}
          {!resolving && resolveError === 'manual' && (
            <div className="space-y-4">
              <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                <p className="text-sm text-amber-700 mb-3">
                  Không xác định được tài khoản tự động. Vui lòng nhập mã nhân viên:
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={manualCode}
                    onChange={e => { setManualCode(e.target.value.toUpperCase()); setManualError(''); }}
                    onKeyDown={e => e.key === 'Enter' && handleManualLookup()}
                    placeholder="VD: NV001"
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    autoFocus
                  />
                  <button
                    onClick={handleManualLookup}
                    disabled={manualLooking}
                    className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    {manualLooking ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Tra cứu'}
                  </button>
                </div>
                {manualError && <p className="text-xs text-red-600 mt-1.5">{manualError}</p>}
              </div>
              <button
                onClick={onClose}
                className="w-full py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium text-sm transition-colors"
              >
                Hủy
              </button>
            </div>
          )}

          {/* Main form — shown once resolvedUserId is available */}
          {!resolving && !resolveError && resolvedUserId && (
            resultPassword ? (
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
            )
          )}
        </div>
      </div>
    </Modal>
  );
};

export default AdminResetPasswordModal;
