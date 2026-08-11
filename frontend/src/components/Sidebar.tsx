import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, ClipboardList, ShieldCheck, Briefcase, Calculator, ShoppingCart, Factory, Wrench, Settings, ChevronDown, ChevronRight, ChevronLeft, ScanFace, BookOpen, History, Bell, BarChart2 } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { hasModuleAccess, hasSubModuleAccess, isAdmin } from '../utils/permissions';
import { useQuery } from '@tanstack/react-query';
import notificationService from '../services/notificationService';
import { UserRole } from '../types/auth';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

// Icon colors tuned for a white sidebar: -600 clears 3:1 contrast,
// amber/orange need -700 because those hues are inherently light.
const MODULE_COLORS: Record<string, string> = {
  dashboard: 'text-blue-600',
  common: 'text-slate-600',
  general: 'text-amber-700',
  quality: 'text-emerald-600',
  business: 'text-sky-600',
  accounting: 'text-violet-600',
  purchasing: 'text-orange-700',
  production: 'text-rose-600',
  technical: 'text-cyan-600',
};

// Static hover classes. Tailwind's JIT only scans literal strings in source,
// so these must never be built by concatenation at runtime.
const MODULE_HOVER_COLORS: Record<string, string> = {
  dashboard: 'group-hover:text-blue-600',
  common: 'group-hover:text-slate-600',
  general: 'group-hover:text-amber-700',
  quality: 'group-hover:text-emerald-600',
  business: 'group-hover:text-sky-600',
  accounting: 'group-hover:text-violet-600',
  purchasing: 'group-hover:text-orange-700',
  production: 'group-hover:text-rose-600',
  technical: 'group-hover:text-cyan-600',
};

// Static background classes for the sub-item bullet dot (replaces a runtime
// `colorClass.replace('text-', 'bg-')` that Tailwind could never see).
const MODULE_DOT_COLORS: Record<string, string> = {
  dashboard: 'bg-blue-600',
  common: 'bg-slate-600',
  general: 'bg-amber-700',
  quality: 'bg-emerald-600',
  business: 'bg-sky-600',
  accounting: 'bg-violet-600',
  purchasing: 'bg-orange-700',
  production: 'bg-rose-600',
  technical: 'bg-cyan-600',
};

// Solid -50 tints instead of /10 opacity: on white, 10% alpha is effectively invisible.
const MODULE_ACTIVE_BG: Record<string, string> = {
  dashboard: 'bg-blue-50 border-blue-500',
  common: 'bg-slate-50 border-slate-500',
  general: 'bg-amber-50 border-amber-500',
  quality: 'bg-emerald-50 border-emerald-500',
  business: 'bg-sky-50 border-sky-500',
  accounting: 'bg-violet-50 border-violet-500',
  purchasing: 'bg-orange-50 border-orange-500',
  production: 'bg-rose-50 border-rose-500',
  technical: 'bg-cyan-50 border-cyan-500',
};

const Sidebar = ({ collapsed, onToggle, mobileOpen, onMobileClose }: SidebarProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Unread notification count for the sidebar badge
  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['notifications', 'unreadCount'],
    queryFn: () => notificationService.getUnreadCount(),
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });

  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({
    '/quality': false,
    '/general': false,
    '/business': false,
    '/accounting': false,
    '/purchasing': false,
    '/production': false,
    '/technical': false,
  });

  const toggleExpand = (path: string) => {
    setExpandedItems(prev => ({
      ...prev,
      [path]: !prev[path]
    }));
  };

  const allMenuItems = [
    { path: '/dashboard', name: 'Dashboard', icon: <LayoutDashboard size={20} />, subItems: [], module: 'dashboard' },
    { path: '/common', name: 'Chung', icon: <Users size={20} />, subItems: [], module: 'common' },
    { path: '/general', name: 'Bộ phận tổng hợp', icon: <ClipboardList size={20} />, subItems: [
      { path: '/general/pricing', name: 'Phòng giá thành', subModule: 'pricing' },
      { path: '/general/partners', name: 'Phòng chăm sóc', subModule: 'partners' },
    ], module: 'general' },
    { path: '/quality', name: 'Bộ phận chất lượng', icon: <ShieldCheck size={20} />, subItems: [
      { path: '/quality/personnel', name: 'CL nhân sự', subModule: 'personnel' },
      { path: '/quality/process', name: 'CL quy trình', subModule: 'process' },
    ], module: 'quality' },
    { path: '/business', name: 'Bộ phận kinh doanh', icon: <Briefcase size={20} />, subItems: [
      { path: '/business/international', name: 'KD Quốc Tế', subModule: 'international' },
      { path: '/business/domestic', name: 'KD Nội Địa', subModule: 'domestic' },
    ], module: 'business' },
    { path: '/accounting', name: 'Bộ phận kế toán', icon: <Calculator size={20} />, subItems: [
      { path: '/accounting/admin', name: 'KT Hành chính', subModule: 'admin' },
      { path: '/accounting/tax', name: 'KT Thuế', subModule: 'tax' },
    ], module: 'accounting' },
    { path: '/purchasing', name: 'Bộ phận thu mua', icon: <ShoppingCart size={20} />, subItems: [
      { path: '/purchasing/materials', name: 'Thu mua NVL', subModule: 'materials' },
      { path: '/purchasing/equipment', name: 'Mua thiết bị', subModule: 'equipment' },
    ], module: 'purchasing' },
    { path: '/production', name: 'Bộ phận sản xuất', icon: <Factory size={20} />, subItems: [
      { path: '/production/management', name: 'Quản lý SX', subModule: 'management' },
      { path: '/production/data', name: 'Dữ liệu SX', subModule: 'data' },
      { path: '/production/warehouse', name: 'Quản lý kho', subModule: 'warehouse' },
      { path: '/production/tablet-hub-preview', name: 'Tablet Hub (Xem trước)', adminOnly: true },
    ], module: 'production' },
    { path: '/technical', name: 'Bộ phận kỹ thuật', icon: <Wrench size={20} />, subItems: [
      { path: '/technical/quality', name: 'Đảm bảo & Cải tiến', subModule: 'quality' },
      { path: '/technical/projects', name: 'Phòng phát triển', subModule: 'projects' },
    ], module: 'technical' },
  ];

  const menuItems = allMenuItems.filter(item => {
    if (!user) return false;
    return hasModuleAccess(item.module, user.role, user.department, user.secondaryDepartments);
  });

  const isActive = (path: string) =>
    location.pathname === path || (path === '/dashboard' && location.pathname === '/');

  const isGroupActive = (path: string) => location.pathname.startsWith(path);

  return (
    <>
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={onMobileClose} />
      )}
      <div className={`
        ${collapsed ? 'w-16' : 'w-64'} bg-white text-gray-700 border-r border-gray-200 flex flex-col h-full transition-all duration-300
        fixed md:relative z-50
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0
      `}>
        {/* Header */}
        <div className={`p-3 border-b border-gray-200 flex items-center ${collapsed ? 'justify-between' : 'relative justify-center'}`}>
          {!collapsed ? (
            <span className="bg-white rounded-lg px-3 py-1.5 shadow-sm inline-flex items-center">
              <img src="/abf-logo.png" alt="An Binh Foods" className="h-8 object-contain" />
            </span>
          ) : (
            <span className="bg-white rounded-md px-1.5 py-1 shadow-sm inline-flex items-center mx-auto">
              <img src="/abf-logo.png" alt="ABF" className="w-7 h-auto object-contain" />
            </span>
          )}
          <button
            onClick={onToggle}
            className={`p-1.5 rounded-lg hover:bg-gray-100 transition-colors ${collapsed ? '' : 'absolute right-3'}`}
            title={collapsed ? 'Mở menu' : 'Thu gọn menu'}
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-2 py-3">
          <ul className="space-y-1">
            {menuItems.map((item) => {
              const active = item.subItems.length === 0 ? isActive(item.path) : isGroupActive(item.path);
              const colorClass = MODULE_COLORS[item.module] || 'text-gray-500';
              const hoverColorClass = MODULE_HOVER_COLORS[item.module] || 'group-hover:text-gray-500';
              const dotColorClass = MODULE_DOT_COLORS[item.module] || 'bg-gray-300';
              const activeBg = MODULE_ACTIVE_BG[item.module] || 'bg-gray-100 border-gray-400';

              return (
                <li key={item.path}>
                  {item.subItems.length === 0 ? (
                    <Link
                      to={item.path}
                      className={`flex items-center px-3 py-2.5 rounded-lg transition-all duration-200 group border-l-2 ${
                        active
                          ? `${activeBg} text-gray-900 font-semibold`
                          : 'border-transparent text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                      title={collapsed ? item.name : ''}
                    >
                      <span className={`${active ? colorClass : `text-gray-500 ${hoverColorClass}`} transition-colors ${collapsed ? '' : 'mr-3'}`}>
                        {item.icon}
                      </span>
                      {!collapsed && <span className="text-sm font-medium">{item.name}</span>}
                    </Link>
                  ) : (
                    <>
                      <div
                        className={`flex items-center px-3 py-2.5 rounded-lg transition-all duration-200 cursor-pointer group border-l-2 ${
                          active
                            ? `${activeBg} text-gray-900 font-semibold`
                            : 'border-transparent text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                        }`}
                        onClick={() => {
                          navigate(item.path);
                          if (!collapsed) toggleExpand(item.path);
                        }}
                        title={collapsed ? item.name : ''}
                      >
                        <span className={`${active ? colorClass : `text-gray-500 ${hoverColorClass}`} transition-colors ${collapsed ? '' : 'mr-3'}`}>
                          {item.icon}
                        </span>
                        {!collapsed && (
                          <>
                            <span className="text-sm font-medium">{item.name}</span>
                            <span className="ml-auto text-gray-500">
                              {expandedItems[item.path] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            </span>
                          </>
                        )}
                      </div>

                      {!collapsed && expandedItems[item.path] && item.subItems.length > 0 && (
                        <ul className="mt-1 ml-4 pl-3 border-l border-gray-200 space-y-0.5">
                          {item.subItems
                            .filter((subItem: any) => {
                              if (!user) return false;
                              // Admin-only items require ADMIN role
                              if (subItem.adminOnly && user.role !== UserRole.ADMIN) return false;
                              // Items with subModule check access via hasSubModuleAccess
                              if (subItem.subModule) {
                                return hasSubModuleAccess(item.module, subItem.subModule, user.department, user.subDepartment, user.role, user.secondaryDepartments);
                              }
                              // Items without subModule (e.g. adminOnly links) are visible if adminOnly check passed
                              return true;
                            })
                            .map((subItem: any) => (
                              <li key={subItem.path}>
                                <Link
                                  to={subItem.path}
                                  className={`flex items-center px-3 py-2 rounded-md text-sm transition-all duration-200 ${
                                    location.pathname === subItem.path
                                      ? 'text-gray-900 bg-gray-100'
                                      : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                                  }`}
                                >
                                  <span className={`w-1.5 h-1.5 rounded-full mr-2.5 ${
                                    location.pathname === subItem.path ? dotColorClass : 'bg-gray-300'
                                  }`} />
                                  {subItem.name}
                                </Link>
                              </li>
                            ))}
                        </ul>
                      )}
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Footer links */}
        <div className="border-t border-gray-200 p-2 space-y-1">
          <Link
            to="/my-history"
            className={`flex items-center px-3 py-2.5 rounded-lg text-sm transition-all duration-200 ${
              location.pathname === '/my-history'
                ? 'bg-gray-100 text-gray-900'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
            title={collapsed ? 'Lịch sử của tôi' : ''}
          >
            <span className={`text-gray-600 ${collapsed ? '' : 'mr-3'}`}><History size={20} /></span>
            {!collapsed && <span className="font-medium">Lịch sử của tôi</span>}
          </Link>

          <Link
            to="/my-notifications"
            className={`relative flex items-center px-3 py-2.5 rounded-lg text-sm transition-all duration-200 ${
              location.pathname === '/my-notifications'
                ? 'bg-gray-100 text-gray-900'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
            title={collapsed ? 'Thông báo của tôi' : ''}
          >
            <span className={`relative text-gray-600 ${collapsed ? '' : 'mr-3'}`}>
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 flex items-center justify-center min-w-[16px] h-4 rounded-full bg-red-500 text-white text-[10px] font-bold px-1">
                  {unreadCount}
                </span>
              )}
            </span>
            {!collapsed && <span className="font-medium">Thông báo của tôi</span>}
          </Link>

          <Link
            to="/huong-dan"
            className={`flex items-center px-3 py-2.5 rounded-lg text-sm transition-all duration-200 ${
              location.pathname === '/huong-dan'
                ? 'bg-gray-100 text-gray-900'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
            title={collapsed ? 'Hướng dẫn' : ''}
          >
            <span className={`text-gray-600 ${collapsed ? '' : 'mr-3'}`}><BookOpen size={20} /></span>
            {!collapsed && <span className="font-medium">Hướng dẫn</span>}
          </Link>

          {user && (user.role === UserRole.ADMIN || user.role === UserRole.DEPARTMENT_HEAD) && (
            <Link
              to="/dashboard/evaluation-calibration"
              className={`flex items-center px-3 py-2.5 rounded-lg text-sm transition-all duration-200 ${
                location.pathname === '/dashboard/evaluation-calibration'
                  ? 'bg-gray-100 text-gray-900'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
              title={collapsed ? 'Phân bố điểm đánh giá' : ''}
            >
              <span className={`text-gray-600 ${collapsed ? '' : 'mr-3'}`}><BarChart2 size={20} /></span>
              {!collapsed && <span className="font-medium">Phân bố điểm</span>}
            </Link>
          )}

          {user && isAdmin(user.department) && (
            <>
              <Link
                to="/diemdanh/admin"
                className={`flex items-center px-3 py-2.5 rounded-lg text-sm transition-all duration-200 ${
                  location.pathname === '/diemdanh/admin'
                    ? 'bg-gray-100 text-gray-900'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
                title={collapsed ? 'Chấm công khuôn mặt' : ''}
              >
                <span className={`text-gray-600 ${collapsed ? '' : 'mr-3'}`}><ScanFace size={20} /></span>
                {!collapsed && <span className="font-medium">Chấm công khuôn mặt</span>}
              </Link>
              <Link
                to="/system-settings"
                className={`flex items-center px-3 py-2.5 rounded-lg text-sm transition-all duration-200 ${
                  location.pathname === '/system-settings'
                    ? 'bg-gray-100 text-gray-900'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
                title={collapsed ? 'Cài đặt hệ thống' : ''}
              >
                <span className={`text-gray-600 ${collapsed ? '' : 'mr-3'}`}><Settings size={20} /></span>
                {!collapsed && <span className="font-medium">Cài đặt hệ thống</span>}
              </Link>
            </>
          )}
        </div>

        {/* Powered by Koola */}
        <div className="border-t border-gray-200 px-3 py-2">
          <a
            href="https://koola.vn"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 opacity-80 hover:opacity-100 transition-opacity"
            title="Powered by Koola"
          >
            {collapsed ? (
              <img src="/koola-logo.png" alt="Koola" className="w-5 h-5 object-contain" />
            ) : (
              <>
                <span className="text-[10px] text-gray-500">Powered by</span>
                <img src="/koola-logo.png" alt="Koola" className="h-4 object-contain" />
                <span className="text-[10px] font-semibold text-gray-600">KOOLA</span>
              </>
            )}
          </a>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
