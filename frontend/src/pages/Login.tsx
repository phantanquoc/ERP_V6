import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertTriangle, Lock, Clock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import Button from '../components/Button';
import { loginSchema, LoginFormData } from '../schemas/requestSchemas';

/** Countdown hook — đếm ngược realtime từ initialSeconds → 0 */
function useCountdown() {
  const [remaining, setRemaining] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const start = useCallback((seconds: number) => {
    if (timerRef.current) clearInterval(timerRef.current);
    setRemaining(seconds);
    timerRef.current = setInterval(() => {
      setRemaining((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(timerRef.current!);
          timerRef.current = null;
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  return { remaining, start };
}

/** Format seconds → "4 phút 32 giây" hoặc "45 giây" */
function formatCountdown(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  if (m > 0) return `${m} phút ${s.toString().padStart(2, '0')} giây`;
  return `${s} giây`;
}

const MAX_ATTEMPTS_BEFORE_WARN = 2; // cảnh báo sau lần thứ 2
const MAX_ATTEMPTS = 3;             // backend block sau lần thứ 3

const Login: React.FC = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState('');
  const [failCount, setFailCount] = useState(0);
  const [isBlocked, setIsBlocked] = useState(false);
  const { remaining, start: startCountdown } = useCountdown();

  const { login } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  // Khi countdown về 0 → tự động bỏ block
  useEffect(() => {
    if (remaining === null && isBlocked) {
      setIsBlocked(false);
      setApiError('');
      setFailCount(0);
    }
  }, [remaining, isBlocked]);

  const onSubmit = async (data: LoginFormData) => {
    if (isBlocked) return;
    setApiError('');
    setIsLoading(true);

    try {
      await login(data);
      navigate('/dashboard');
    } catch (error) {
      const err = error as Error & { retryAfter?: number; statusCode?: number };
      const newFailCount = failCount + 1;

      // ── Bị block IP (429 rate-limit hoặc 403 IP-block từ backend) ─────────
      if (err.statusCode === 429 || err.statusCode === 403) {
        const secs = err.retryAfter ?? 60;
        setIsBlocked(true);
        setFailCount(MAX_ATTEMPTS);
        startCountdown(secs);
        setApiError(err.message);
        setIsLoading(false);
        return;
      }

      // ── Sai mật khẩu thông thường ─────────────────────────────────────────
      setFailCount(newFailCount);
      const attemptsLeft = MAX_ATTEMPTS - newFailCount;

      if (newFailCount >= MAX_ATTEMPTS_BEFORE_WARN && attemptsLeft > 0) {
        setApiError(
          `Sai mật khẩu. Còn ${attemptsLeft} lần thử — nếu sai tiếp sẽ bị khóa 1 phút.`
        );
      } else {
        setApiError(err.message || 'Đăng nhập thất bại');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const bannerType: 'blocked' | 'warn' | 'error' | null =
    isBlocked && remaining !== null ? 'blocked'
    : failCount >= MAX_ATTEMPTS_BEFORE_WARN && !isBlocked && apiError ? 'warn'
    : apiError ? 'error'
    : null;

  return (
    <div className="min-h-screen flex">
      {/* Left side */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="bg-blue-600 text-white p-6 rounded-t-lg">
              <h1 className="text-2xl font-bold">ABF System</h1>
              <p className="text-blue-100 mt-2">Hệ thống quản lý doanh nghiệp</p>
            </div>

            <div className="bg-white p-8 rounded-b-lg shadow-lg border border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900 mb-8">Đăng nhập</h2>

              {/* Blocked banner — countdown realtime */}
              {bannerType === 'blocked' && remaining !== null && (
                <div className="mb-4 p-4 bg-red-50 border border-red-300 rounded-lg text-left">
                  <div className="flex items-start gap-2">
                    <Lock className="text-red-500 mt-0.5 shrink-0" size={18} />
                    <div>
                      <p className="text-sm font-semibold text-red-700">Tài khoản tạm thời bị khóa</p>
                      <p className="text-sm text-red-600 mt-1">
                        Quá nhiều lần đăng nhập sai. Vui lòng thử lại sau:
                      </p>
                      <div className="mt-2 flex items-center gap-2 text-red-700 font-mono font-bold text-lg">
                        <Clock size={16} className="text-red-500" />
                        <span>{formatCountdown(remaining)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Warning banner — sắp bị khóa */}
              {bannerType === 'warn' && (
                <div className="mb-4 p-4 bg-amber-50 border border-amber-300 rounded-lg text-left">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="text-amber-500 mt-0.5 shrink-0" size={18} />
                    <div>
                      <p className="text-sm font-semibold text-amber-700">Cảnh báo bảo mật</p>
                      <p className="text-sm text-amber-600 mt-1">{apiError}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Generic error */}
              {bannerType === 'error' && (
                <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded text-sm">
                  {apiError}
                </div>
              )}

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tên đăng nhập
                  </label>
                  <input
                    type="email"
                    {...register('email')}
                    disabled={isBlocked}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed ${
                      errors.email ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Nhập email của bạn"
                  />
                  {errors.email && (
                    <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Mật khẩu
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      {...register('password')}
                      disabled={isBlocked}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed ${
                        errors.password ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Nhập mật khẩu"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? '🙈' : '👁️'}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
                  )}
                </div>

                {/* Attempt indicator dots */}
                {failCount > 0 && !isBlocked && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-gray-500">Số lần sai:</span>
                    {Array.from({ length: MAX_ATTEMPTS }).map((_, i) => (
                      <span
                        key={i}
                        className={`w-2.5 h-2.5 rounded-full transition-colors ${
                          i < failCount ? 'bg-red-500' : 'bg-gray-200'
                        }`}
                      />
                    ))}
                    <span className="text-xs text-gray-500 ml-1">
                      ({failCount}/{MAX_ATTEMPTS})
                    </span>
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full"
                  loading={isLoading}
                  disabled={isLoading || isBlocked}
                >
                  {isBlocked && remaining !== null
                    ? `Thử lại sau ${formatCountdown(remaining)}`
                    : 'Đăng nhập'}
                </Button>
              </form>

              <div className="mt-6 flex items-center justify-center text-sm">
                <Link to="/forgot-password" className="text-blue-600 hover:text-blue-500">
                  Quên mật khẩu?
                </Link>
              </div>

              <div className="mt-8 text-center text-xs text-gray-500">
                <p>© 2025 ABF System.</p>
                <p>Bản quyền thuộc về Công Ty TNHH Thực Phẩm Quốc Tế An Bình.</p>
                <p className="mt-2">
                  Hỗ trợ kỹ thuật:{' '}
                  <a href="mailto:support@abf.com" className="text-blue-600 hover:text-blue-500">
                    support@abf.com
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Branding */}
      <div className="hidden lg:block lg:flex-1 bg-gradient-to-br from-blue-600 to-blue-800">
        <div className="flex items-center justify-center h-full p-12">
          <div className="text-center text-white">
            <h2 className="text-4xl font-bold mb-4">Chào mừng đến với ABF System</h2>
            <p className="text-xl text-blue-100 mb-8">Hệ thống quản lý doanh nghiệp toàn diện</p>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="bg-white/10 p-4 rounded-lg">
                <h3 className="font-semibold mb-2">Quản lý Nhân sự</h3>
                <p className="text-blue-100">Theo dõi và quản lý thông tin nhân viên</p>
              </div>
              <div className="bg-white/10 p-4 rounded-lg">
                <h3 className="font-semibold mb-2">Quản lý Tài chính</h3>
                <p className="text-blue-100">Kiểm soát dòng tiền và báo cáo tài chính</p>
              </div>
              <div className="bg-white/10 p-4 rounded-lg">
                <h3 className="font-semibold mb-2">Quản lý Sản xuất</h3>
                <p className="text-blue-100">Tối ưu hóa quy trình sản xuất</p>
              </div>
              <div className="bg-white/10 p-4 rounded-lg">
                <h3 className="font-semibold mb-2">Báo cáo Thống kê</h3>
                <p className="text-blue-100">Phân tích dữ liệu và báo cáo chi tiết</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
