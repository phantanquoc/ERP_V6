import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import UserProfileDropdown from './UserProfileDropdown';
import NotificationBell from './NotificationBell';
import { Menu } from 'lucide-react';
import { API_BASE_URL } from '../config/api';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [slogan, setSlogan] = useState('');

  // Fetch slogan từ API khi mount + lắng nghe WebSocket broadcast realtime
  useEffect(() => {
    const fetchAndSet = () =>
      fetch(`${API_BASE_URL}/system-settings/slogan`)
        .then(r => r.json())
        .then(json => setSlogan(json?.data?.value ?? ''))
        .catch(() => {/* ignore */});

    fetchAndSet();

    const handler = (e: Event) => setSlogan((e as CustomEvent<string>).detail ?? '');
    const onWsReconnected = () => fetchAndSet();

    window.addEventListener('systemSloganChanged', handler);
    window.addEventListener('wsReconnected', onWsReconnected);
    return () => {
      window.removeEventListener('systemSloganChanged', handler);
      window.removeEventListener('wsReconnected', onWsReconnected);
    };
  }, []);

  const toggleSidebar = () => {
    // On mobile, toggle the mobile overlay
    if (window.innerWidth < 768) {
      setMobileSidebarOpen(!mobileSidebarOpen);
    } else {
      setSidebarCollapsed(!sidebarCollapsed);
    }
  };

  return (
    <div className="flex h-screen bg-app-bg overflow-hidden">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={toggleSidebar}
        mobileOpen={mobileSidebarOpen}
        onMobileClose={() => setMobileSidebarOpen(false)}
      />
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="bg-white text-gray-900 shadow-sm border-b border-gray-200 px-6 py-1">
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

            {/* Centered slogan — dynamic from DB, hide if empty */}
            <div className="flex-1 px-4 overflow-hidden">
              {slogan && (
                <p className="text-sm font-medium text-black text-center italic truncate">
                  {slogan}
                </p>
              )}
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
