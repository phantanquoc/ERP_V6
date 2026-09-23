import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { isAdminUser } from '../utils/permissions';
import { UserRole } from '../types/auth';

interface AdminRouteProps {
  children: React.ReactNode;
  allowDepartmentHead?: boolean;
}

const AdminRoute: React.FC<AdminRouteProps> = ({ children, allowDepartmentHead = false }) => {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (isAdminUser(user)) {
    return <>{children}</>;
  }

  if (allowDepartmentHead && user.role === UserRole.DEPARTMENT_HEAD) {
    return <>{children}</>;
  }

  // Đồng bộ backend: backend check `role === 'ADMIN'`. Giữ backward-compat với legacy `department === 'admin'`.
  return <Navigate to="/dashboard" replace />;
};

export default AdminRoute;
