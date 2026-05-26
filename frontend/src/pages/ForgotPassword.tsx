import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import Input from '../components/Input';
import Button from '../components/Button';
import AuthService from '../services/authService';

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

  if (isSubmitted) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="bg-blue-600 text-white p-6 rounded-t-lg">
              <h1 className="text-2xl font-bold">ABF System</h1>
              <p className="text-blue-100 mt-2">Hệ thống quản lý doanh nghiệp</p>
            </div>
            <div className="bg-white p-8 rounded-b-lg shadow-lg border border-gray-200">
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Yêu cầu đã được gửi!</h2>
                <p className="text-gray-600 mb-6">
                  Yêu cầu đặt lại mật khẩu đã được gửi đến quản trị viên.
                  Vui lòng liên hệ Admin để nhận mật khẩu mới.
                </p>
                <Link
                  to="/login"
                  className="inline-flex items-center text-blue-600 hover:text-blue-500"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Quay lại đăng nhập
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8 bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="bg-blue-600 text-white p-6 rounded-t-lg">
            <h1 className="text-2xl font-bold">ABF System</h1>
            <p className="text-blue-100 mt-2">Hệ thống quản lý doanh nghiệp</p>
          </div>
          <div className="bg-white p-8 rounded-b-lg shadow-lg border border-gray-200">
            <div className="mb-6">
              <Link
                to="/login"
                className="inline-flex items-center text-blue-600 hover:text-blue-500 text-sm"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Quay lại đăng nhập
              </Link>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mb-4">Quên mật khẩu?</h2>
            <p className="text-gray-600 mb-6">
              Nhập email hoặc mã nhân viên. Mật khẩu mới sẽ được gửi đến quản trị viên.
            </p>

            {error && (
              <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <Input
                label="Email hoặc mã nhân viên"
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="VD: email@company.com hoặc NV0001"
                error={error && !identifier ? 'Trường này là bắt buộc' : ''}
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

            <div className="mt-8 text-center text-xs text-gray-500">
              <p>Cần hỗ trợ? Liên hệ quản trị viên.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
