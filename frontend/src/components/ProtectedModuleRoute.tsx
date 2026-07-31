import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { hasModuleAccess } from '../utils/permissions';

interface ProtectedModuleRouteProps {
  children: React.ReactNode;
  module: string;
  fallbackPath?: string;
}

const ProtectedModuleRoute: React.FC<ProtectedModuleRouteProps> = ({ 
  children, 
  module, 
  _fallbackPath = '/dashboard'
}) => {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  const hasAccess = hasModuleAccess(
    module,
    user.role,
    user.department,
    user.secondaryDepartments ?? user.secondaryDepartments
  );

  if (!hasAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
              <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="mt-2 text-sm font-medium text-gray-900">Không có quyền truy cập</h3>
            <p className="mt-1 text-sm text-gray-500">
              Bạn không có quyền truy cập vào module này.
            </p>
            <p className="mt-2 text-xs text-gray-400">
              Phòng ban: {user.department} | Module: {module}
            </p>
            <div className="mt-6">
              <button
                onClick={() => window.history.back()}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
              >
                Quay lại
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedModuleRoute;
