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
          <div className="relative flex items-center justify-center">
            {/* Toggle button - positioned absolutely to the left */}
            <div className="absolute left-0 flex items-center gap-2">
              <button
                onClick={toggleSidebar}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                title={sidebarCollapsed ? 'Mở menu' : 'Thu gọn menu'}
              >
                <Menu size={24} className="text-gray-600" />
              </button>
            </div>

            {/* Centered text */}
            <h1 className="text-xl font-semibold text-gray-800 text-center">
              NẾU CÓ NGÔI NHÀ THỨ 2 ĐÓ CHÍNH LÀ NƠI LÀM VIỆC CỦA MÌNH,
              <br />NƠI CÓ NHỮNG NGƯỜI ĐỒNG NGHIỆP TUYỆT VỜI, SẺ CHIA VÀ TRI KỶ.
            </h1>

            {/* Notification Bell and User dropdown - positioned absolutely to the right */}
            <div className="absolute right-0 flex items-center gap-2">
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
