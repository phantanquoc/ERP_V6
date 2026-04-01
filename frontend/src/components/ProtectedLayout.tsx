import React, { useEffect } from 'react';
import ProtectedRoute from './ProtectedRoute';
import Layout from './Layout';
import { useTheme } from '../contexts/ThemeContext';

interface ProtectedLayoutProps {
  children: React.ReactNode;
}

const ProtectedLayout: React.FC<ProtectedLayoutProps> = ({ children }) => {
  const { refreshThemes } = useTheme();

  // Sau khi user đã authenticated (ProtectedRoute đảm bảo) → fetch danh sách themes
  // để ThemePickerModal có dữ liệu hiển thị và apply per-user saved theme
  useEffect(() => {
    refreshThemes();
  }, [refreshThemes]);

  return (
    <ProtectedRoute>
      <Layout>
        {children}
      </Layout>
    </ProtectedRoute>
  );
};

export default ProtectedLayout;
