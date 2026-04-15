import React from 'react';
import { Outlet } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import Layout from './Layout';

interface ProtectedLayoutProps {
  children?: React.ReactNode;
}

const ProtectedLayout: React.FC<ProtectedLayoutProps> = ({ children }) => {
  return (
    <ProtectedRoute>
      <Layout>
        {children || <Outlet />}
      </Layout>
    </ProtectedRoute>
  );
};

export default ProtectedLayout;
