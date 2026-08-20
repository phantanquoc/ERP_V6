import React, { Suspense, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSystemSettings } from '../contexts/SystemSettingsContext';
import Sidebar from './Sidebar';
import UserProfileDropdown from './UserProfileDropdown';
import NotificationBell from './NotificationBell';
import { Menu, Loader2 } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  useAuth();
  const { settings } = useSystemSettings();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    // On mobile, toggle the mobile overlay
    if (window.innerWidth < 768) {
      setMobileSidebarOpen(!mobileSidebarOpen);
    } else {
      setSidebarCollapsed(!sidebarCollapsed);
    }
  };

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={toggleSidebar}
        mobileOpen={mobileSidebarOpen}
        onMobileClose={() => setMobileSidebarOpen(false)}
      />
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200 px-4 sm:px-6 py-1">
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

            {/* Centered text - static on desktop */}
            <div className="flex-1 px-4 overflow-hidden hidden md:block">
              <p className="text-sm font-medium text-gray-900 italic text-center leading-snug whitespace-pre-line line-clamp-2">
                {settings?.slogan || 'Nếu có ngôi nhà thứ 2 đó chính là nơi làm việc của mình, nơi có những người đồng nghiệp tuyệt vời, sẻ chia và tri kỷ.'}
              </p>
            </div>

            {/* Mobile: marquee scrolling (single line) */}
            <div className="flex-1 px-2 overflow-hidden md:hidden">
              <div className="marquee-container">
                <p className="marquee-text text-sm font-medium text-gray-900 italic">
                  {(settings?.slogan || 'Nếu có ngôi nhà thứ 2 đó chính là nơi làm việc của mình, nơi có những người đồng nghiệp tuyệt vời, sẻ chia và tri kỷ.').replace(/\n/g, ' — ')}
                </p>
              </div>
            </div>

            {/* Notification Bell and User dropdown - positioned to the right */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <NotificationBell />
              <UserProfileDropdown />
            </div>
          </div>
        </header>

        {/* Main Content — dashboards use -m-4 sm:-m-6 to escape this padding (responsive offset handled per page) */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <Suspense fallback={
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          }>
            {children}
          </Suspense>
        </main>
      </div>
    </div>
  );
};

export default Layout;
