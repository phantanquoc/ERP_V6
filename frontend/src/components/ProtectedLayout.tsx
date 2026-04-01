import React from 'react';
import ProtectedRoute from './ProtectedRoute';
import Layout from './Layout';

// ThemeContext đã tự load themes trong init() khi mount →
// không cần gọi refreshThemes() ở đây để tránh infinite re-fetch loop.

interface ProtectedLayoutProps {
  children: React.ReactNode;
}

const ProtectedLayout: React.FC<ProtectedLayoutProps> = ({ children }) => (
  <ProtectedRoute>
    <Layout>
      {children}
    </Layout>
  </ProtectedRoute>
);

export default ProtectedLayout;
