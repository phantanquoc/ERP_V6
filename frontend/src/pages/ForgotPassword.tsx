import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Sparkles, Users, LineChart, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';
import Input from '../components/Input';
import Button from '../components/Button';
import AuthService from '../services/authService';
import abfLogo from '@assets/abf-logo.png';
import koolaLogo from '@assets/koola-logo.png';

const ForgotPassword: React.FC = () => {
  const [identifier, setIdentifier] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!identifier.trim()) {
      setError('Vui lòng nhập email hoặc mã nhân viên');
      return;
    }

    setIsLoading(true);

    try {
      await AuthService.forgotPassword(identifier.trim());
      setIsSubmitted(true);
    } catch (err: any) {
      setError(err.message || 'Có lỗi xảy ra, vui lòng thử lại');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-slate-50">
      <aside className="relative lg:flex-1 bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-700 text-white overflow-hidden">
        <div className="pointer-events-none absolute -top-24 -right-24 w-72 h-72 rounded-full bg-white/10 blur-3xl" aria-hidden="true" />
        <div className="pointer-events-none absolute -bottom-32 -left-20 w-96 h-96 rounded-full bg-indigo-400/20 blur-3xl" aria-hidden="true" />

        <div className="lg:hidden flex items-center gap-3 px-5 py-5 relative z-10">
          <img src={abfLogo} alt="An Binh Foods" className="h-10 w-auto drop-shadow-md" />
          <div>
            <p className="text-base font-semibold leading-tight">ABF System</p>
            <p className="text-xs text-blue-100">Hệ thống quản lý doanh nghiệp</p>
          </div>
        </div>

        <div className="hidden lg:flex flex-col justify-between h-full min-h-screen p-12 xl:p-16 relative z-10">
          <div className="flex items-center gap-3">
            <img src={abfLogo} alt="An Binh Foods" className="h-16 w-auto drop-shadow-sm" />
          </div>

          <div className="max-w-lg">
            <h1 className="text-4xl xl:text-5xl font-bold leading-tight">
              Không nhớ được<br />
              <span className="text-blue-200">mật khẩu?</span>
            </h1>
            <p className="mt-5 text-lg text-blue-100 leading-relaxed">
              Đừng lo — gửi yêu cầu ngay, quản trị viên sẽ hỗ trợ đặt lại tài khoản của bạn trong thời gian sớm nhất.
            </p>

            <ul className="mt-10 space-y-4 text-sm">
              <li className="flex items-start gap-3">
                <span className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg bg-white/15 backdrop-blur-sm">
                  <ShieldCheck className="h-4 w-4" />
                </span>
                <div>
                  <p className="font-semibold">Bảo mật thông tin</p>
                  <p className="text-blue-100/80 text-xs mt-0.5">Yêu cầu được xử lý riêng, không lộ mật khẩu cũ</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg bg-white/15 backdrop-blur-sm">
                  <Users className="h-4 w-4" />
                </span>
                <div>
                  <p className="font-semibold">Hỗ trợ trực tiếp</p>
                  <p className="text-blue-100/80 text-xs mt-0.5">Quản trị viên phòng ban tiếp nhận và xác thực</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg bg-white/15 backdrop-blur-sm">
                  <LineChart className="h-4 w-4" />
                </span>
                <div>
                  <p className="font-semibold">Xử lý nhanh</p>
                  <p className="text-blue-100/80 text-xs mt-0.5">Mật khẩu mới cấp lại trong ngày làm việc</p>
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
          {isSubmitted ? (
            <>
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
                <CheckCircle2 className="h-7 w-7 text-green-600" />
              </div>
              <h2 className="mt-6 text-2xl font-bold text-slate-900 text-center">Yêu cầu đã được gửi</h2>
              <p className="mt-3 text-sm text-slate-500 text-center leading-relaxed">
                Yêu cầu đặt lại mật khẩu đã được chuyển đến quản trị viên. Vui lòng liên hệ Admin để nhận mật khẩu mới.
              </p>

              <div className="mt-8 rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600">
                <div className="flex items-start gap-2">
                  <Sparkles className="h-4 w-4 mt-0.5 text-blue-600 shrink-0" />
                  <p>
                    Trong lúc chờ, bạn có thể liên hệ trực tiếp bộ phận hỗ trợ tại{' '}
                    <a href="mailto:phuc.ktpt@anbinhfoods.com" className="text-blue-600 hover:text-blue-700 font-medium">
                      phuc.ktpt@anbinhfoods.com
                    </a>
                    .
                  </p>
                </div>
              </div>

              <div className="mt-8 flex items-center justify-between gap-3">
                <a
                  href="https://koola.vn"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 transition-colors"
                >
                  <span>Powered by</span>
                  <img src={koolaLogo} alt="Koola" className="h-4 w-auto" />
                </a>
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Quay lại đăng nhập
                </Link>
              </div>

              <p className="mt-10 pt-6 border-t border-slate-200 text-center text-xs text-slate-500 lg:hidden">
                © 2026 An Bình Foods
              </p>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-6 text-blue-700">
                <ShieldCheck className="h-5 w-5" />
                <span className="text-xs font-semibold uppercase tracking-wider">Khôi phục tài khoản</span>
              </div>

              <h2 className="text-2xl font-bold text-slate-900">Quên mật khẩu?</h2>
              <p className="mt-2 text-sm text-slate-500">
                Nhập email hoặc mã nhân viên. Yêu cầu đặt lại sẽ được gửi tới quản trị viên.
              </p>

              {error && (
                <div className="mt-6 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="mt-8 space-y-2">
                <Input
                  label="Email hoặc mã nhân viên"
                  icon="user"
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="VD: email@company.com hoặc NV0001"
                  autoComplete="username"
                  required
                />

                <Button
                  type="submit"
                  className="w-full"
                  loading={isLoading}
                  disabled={isLoading}
                >
                  {isLoading ? 'Đang gửi...' : 'Gửi yêu cầu đặt lại mật khẩu'}
                </Button>
              </form>

              <div className="mt-6 flex items-center justify-between gap-3">
                <a
                  href="https://koola.vn"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 transition-colors"
                >
                  <span>Powered by</span>
                  <img src={koolaLogo} alt="Koola" className="h-4 w-auto" />
                </a>
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Quay lại đăng nhập
                </Link>
              </div>

              <div className="mt-10 pt-6 border-t border-slate-200 text-center text-xs text-slate-500 space-y-1">
                <p>
                  Cần hỗ trợ kỹ thuật?{' '}
                  <a href="mailto:phuc.ktpt@anbinhfoods.com" className="text-blue-600 hover:text-blue-700 font-medium">
                    phuc.ktpt@anbinhfoods.com
                  </a>
                </p>
                <p className="lg:hidden">© 2026 An Bình Foods</p>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default ForgotPassword;