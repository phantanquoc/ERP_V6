import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '../contexts/AuthContext';
import Input from '../components/Input';
import Button from '../components/Button';
import { loginSchema, LoginFormData } from '../schemas/requestSchemas';

const Login: React.FC = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState('');

  const { login } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: ''
    }
  });

  const onSubmit = async (data: LoginFormData) => {
    setApiError('');
    setIsLoading(true);

    try {
      await login(data);
      navigate('/dashboard');
    } catch (error) {
      setApiError(error instanceof Error ? error.message : 'Đăng nhập thất bại');
    } finally {
      setIsLoading(false);
    }
  };



  return (
    <div className="min-h-screen flex">
      {/* Left side - Login Form */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          {/* Header */}
          <div className="text-center">
            <div className="bg-blue-600 text-white p-6 rounded-t-lg">
              <h1 className="text-2xl font-bold">ABF System</h1>
              <p className="text-blue-100 mt-2">Hệ thống quản lý doanh nghiệp</p>
            </div>
            <div className="bg-white p-8 rounded-b-lg shadow-lg border border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900 mb-8">Đăng nhập</h2>
              
              {/* Error Message */}
              {apiError && (
                <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                  {apiError}
                </div>
              )}

              {/* Login Form */}
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tên đăng nhập
                  </label>
                  <input
                    type="email"
                    {...register('email')}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
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
                      type={showPassword ? "text" : "password"}
                      {...register('password')}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
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

                <Button
                  type="submit"
                  className="w-full"
                  loading={isLoading}
                  disabled={isLoading}
                >
                  Đăng nhập
                </Button>
              </form>

              {/* Footer Links */}
              <div className="mt-6 flex items-center justify-center text-sm">
                <Link
                  to="/forgot-password"
                  className="text-blue-600 hover:text-blue-500"
                >
                  Quên mật khẩu?
                </Link>
              </div>

              {/* Support Info */}
              <div className="mt-8 text-center text-xs text-gray-500">
                <p>© 2025 ABF System.</p>
                <p>Bản quyền thuộc về Công Ty TNHH Thực Phẩm Quốc Tế An Bình.</p>
                <p className="mt-2">
                  Hỗ trợ kỹ thuật: 
                  <a href="mailto:support@abf.com" className="text-blue-600 hover:text-blue-500 ml-1">
                    support@abf.com
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Background Image or Branding */}
      <div className="hidden lg:block lg:flex-1 bg-gradient-to-br from-blue-600 to-blue-800">
        <div className="flex items-center justify-center h-full p-12">
          <div className="text-center text-white">
            <h2 className="text-4xl font-bold mb-4">Chào mừng đến với ABF System</h2>
            <p className="text-xl text-blue-100 mb-8">
              Hệ thống quản lý doanh nghiệp toàn diện
            </p>
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
