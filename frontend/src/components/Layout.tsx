import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Sidebar from './Sidebar';
import UserProfileDropdown from './UserProfileDropdown';
import NotificationBell from './NotificationBell';
import { Menu } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar collapsed={sidebarCollapsed} onToggle={toggleSidebar} />
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-1">
          <div className="relative flex items-center justify-between">
            {/* Toggle button - positioned to the left */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={toggleSidebar}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                title={sidebarCollapsed ? 'Mở menu' : 'Thu gọn menu'}
              >
                <Menu size={24} className="text-gray-600" />
              </button>
            </div>

            {/* Centered text with padding to avoid overlap */}
            <div className="flex-1 px-4 overflow-hidden">
              <p className="text-sm font-medium text-gray-900 text-center italic truncate">
                Nếu có ngôi nhà thứ 2 đó chính là nơi làm việc của mình, nơi có những người đồng nghiệp tuyệt vời, sẻ chia và tri kỷ.
              </p>
            </div>

            {/* Notification Bell and User dropdown - positioned to the right */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <NotificationBell />
              <UserProfileDropdown />
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
