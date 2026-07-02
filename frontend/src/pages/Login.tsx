import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ShieldCheck, Sparkles, Users, LineChart, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import Input from '../components/Input';
import Button from '../components/Button';
import { loginSchema, LoginFormData } from '../schemas/requestSchemas';
import { IpLockedError } from '../services/authService';

const Login: React.FC = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState('');
  const [sessionReplacedMessage, setSessionReplacedMessage] = useState('');
  const [ipLockedUntil, setIpLockedUntil] = useState<Date | null>(null);
  const [countdownText, setCountdownText] = useState('');
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const replaced = localStorage.getItem('session_replaced');
    if (replaced === 'true') {
      setSessionReplacedMessage('Tài khoản của bạn đã được đăng nhập trên thiết bị khác. Vui lòng đăng nhập lại.');
      localStorage.removeItem('session_replaced');
    }
  }, []);

  useEffect(() => {
    if (!ipLockedUntil) {
      setCountdownText('');
      if (countdownRef.current) clearInterval(countdownRef.current);
      return;
    }

    const updateCountdown = () => {
      const remaining = ipLockedUntil.getTime() - Date.now();
      if (remaining <= 0) {
        setCountdownText('');
        setIpLockedUntil(null);
        setApiError('');
        if (countdownRef.current) clearInterval(countdownRef.current);
        return;
      }
      const minutes = Math.floor(remaining / 60000);
      const seconds = Math.floor((remaining % 60000) / 1000);
      setCountdownText(`${minutes} phút ${seconds} giây`);
    };

    updateCountdown();
    countdownRef.current = setInterval(updateCountdown, 1000);

    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [ipLockedUntil]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { identifier: '', password: '' },
  });

  const onSubmit = async (data: LoginFormData) => {
    setApiError('');
    setSessionReplacedMessage('');
    setIsLoading(true);

    try {
      await login({ identifier: data.identifier, password: data.password });
      navigate('/dashboard');
    } catch (error) {
      if (error instanceof IpLockedError) {
        setIpLockedUntil(error.lockedUntil);
        setApiError(error.message);
      } else {
        setApiError(error instanceof Error ? error.message : 'Đăng nhập thất bại');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const isIpLocked = ipLockedUntil !== null && ipLockedUntil > new Date();

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-slate-50">
      <aside className="relative lg:flex-1 bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-700 text-white overflow-hidden">
        <div className="pointer-events-none absolute -top-24 -right-24 w-72 h-72 rounded-full bg-white/10 blur-3xl" aria-hidden="true" />
        <div className="pointer-events-none absolute -bottom-32 -left-20 w-96 h-96 rounded-full bg-indigo-400/20 blur-3xl" aria-hidden="true" />

        <div className="lg:hidden flex items-center gap-3 px-5 pt-5 pb-7 relative z-10">
          <img src="/abf-logo.png" alt="An Binh Foods" className="h-10 w-auto drop-shadow-md" />
          <div>
            <p className="text-base font-semibold leading-tight">ABF System</p>
            <p className="text-xs text-blue-100">Hệ thống quản lý doanh nghiệp</p>
          </div>
        </div>

        <div className="hidden lg:flex flex-col justify-between h-full min-h-screen p-12 xl:p-16 relative z-10">
          <div className="flex items-center gap-3">
            <img src="/abf-logo.png" alt="An Binh Foods" className="h-16 w-auto drop-shadow-lg" />
          </div>

          <div className="max-w-lg">
            <h1 className="text-4xl xl:text-5xl font-bold leading-tight">
              Chào mừng đến với<br />
              <span className="text-blue-200">ABF System</span>
            </h1>
            <p className="mt-5 text-lg text-blue-100 leading-relaxed">
              Nền tảng quản trị doanh nghiệp toàn diện cho An Bình Foods — nhân sự, kinh doanh, sản xuất, kế toán trên một hệ thống.
            </p>

            <ul className="mt-10 space-y-4 text-sm">
              <li className="flex items-start gap-3">
                <span className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg bg-white/15 backdrop-blur-sm">
                  <Users className="h-4 w-4" />
                </span>
                <div>
                  <p className="font-semibold">Quản lý nhân sự</p>
                  <p className="text-blue-100/80 text-xs mt-0.5">Chấm công, ca làm, phân quyền theo phòng ban</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg bg-white/15 backdrop-blur-sm">
                  <LineChart className="h-4 w-4" />
                </span>
                <div>
                  <p className="font-semibold">Kinh doanh &amp; sản xuất</p>
                  <p className="text-blue-100/80 text-xs mt-0.5">Đơn hàng, kế hoạch sản xuất, tồn kho realtime</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg bg-white/15 backdrop-blur-sm">
                  <Sparkles className="h-4 w-4" />
                </span>
                <div>
                  <p className="font-semibold">Trợ lý AI</p>
                  <p className="text-blue-100/80 text-xs mt-0.5">Tra cứu, báo cáo và hỗ trợ tác vụ bằng ngôn ngữ tự nhiên</p>
                </div>
              </li>
            </ul>
          </div>

          <div className="text-xs text-blue-100/80">
            <p>© 2026 An Bình Foods</p>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex items-center justify-center px-4 sm:px-8 py-8 lg:py-12">
        <div className="w-full max-w-md">
          <div className="flex items-center gap-2 mb-6 text-blue-700">
            <ShieldCheck className="h-5 w-5" />
            <span className="text-xs font-semibold uppercase tracking-wider">Cổng nội bộ ABF</span>
          </div>

          <h2 className="text-3xl font-bold text-slate-900">Đăng nhập tài khoản</h2>
          <p className="mt-2 text-sm text-slate-500">
            Sử dụng email hoặc mã nhân viên do quản trị viên cấp.
          </p>

          {sessionReplacedMessage && (
            <div className="mt-6 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{sessionReplacedMessage}</span>
            </div>
          )}

          {apiError && (
            <div className="mt-6 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <div>
                <p>{apiError}</p>
                {isIpLocked && countdownText && (
                  <p className="mt-1 font-semibold">Thử lại sau: {countdownText}</p>
                )}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-2">
            <Input
              label="Tên đăng nhập"
              icon="user"
              type="text"
              placeholder="Email hoặc mã nhân viên (VD: NV0001)"
              error={errors.identifier?.message}
              autoComplete="username"
              {...register('identifier')}
            />

            <Input
              label="Mật khẩu"
              icon="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Nhập mật khẩu"
              error={errors.password?.message}
              showPasswordToggle
              showPassword={showPassword}
              onTogglePassword={() => setShowPassword(!showPassword)}
              autoComplete="current-password"
              {...register('password')}
            />

            <div className="flex items-center justify-end pb-2">
              <Link to="/forgot-password" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                Quên mật khẩu?
              </Link>
            </div>

            <Button
              type="submit"
              className="w-full"
              loading={isLoading}
              disabled={isLoading || isIpLocked}
            >
              {isIpLocked ? `IP bị khóa (${countdownText})` : 'Đăng nhập'}
            </Button>
          </form>

          <div className="mt-10 pt-6 border-t border-slate-200 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <a
                href="https://koola.vn"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 transition-colors"
              >
                <span>Powered by</span>
                <img src="/koola-logo.png" alt="Koola" className="h-4 w-auto" />
              </a>
              <a href="mailto:phuc.ktpt@anbinhfoods.com" className="text-xs text-blue-600 hover:text-blue-700 font-medium">
                Cần hỗ trợ?
              </a>
            </div>
            <p className="text-center text-xs text-slate-500 lg:hidden">© 2026 An Bình Foods</p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Login;
