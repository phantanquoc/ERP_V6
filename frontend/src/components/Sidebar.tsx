import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, ClipboardList, ShieldCheck, Briefcase, Calculator, ShoppingCart, Factory, Wrench, Settings, ChevronDown, ChevronRight, ChevronLeft, ScanFace, BookOpen } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { hasModuleAccess, hasSubModuleAccess, isAdmin } from '../utils/permissions';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

const MODULE_COLORS: Record<string, string> = {
  dashboard: 'text-blue-400',
  common: 'text-slate-400',
  general: 'text-amber-400',
  quality: 'text-emerald-400',
  business: 'text-sky-400',
  accounting: 'text-violet-400',
  purchasing: 'text-orange-400',
  production: 'text-rose-400',
  technical: 'text-cyan-400',
};

const MODULE_ACTIVE_BG: Record<string, string> = {
  dashboard: 'bg-blue-500/10 border-blue-400',
  common: 'bg-slate-500/10 border-slate-400',
  general: 'bg-amber-500/10 border-amber-400',
  quality: 'bg-emerald-500/10 border-emerald-400',
  business: 'bg-sky-500/10 border-sky-400',
  accounting: 'bg-violet-500/10 border-violet-400',
  purchasing: 'bg-orange-500/10 border-orange-400',
  production: 'bg-rose-500/10 border-rose-400',
  technical: 'bg-cyan-500/10 border-cyan-400',
};

const Sidebar = ({ collapsed, onToggle, mobileOpen, onMobileClose }: SidebarProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
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
      { path: '/production/warehouse', name: 'Quản lý kho', subModule: 'warehouse' },
      { path: '/production/data', name: 'Dữ liệu SX', subModule: 'data' },
    ], module: 'production' },
    { path: '/technical', name: 'Bộ phận kỹ thuật', icon: <Wrench size={20} />, subItems: [
      { path: '/technical/quality', name: 'QLHTM', subModule: 'quality' },
      { path: '/technical/mechanical', name: 'Cơ điện', subModule: 'mechanical' },
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
        ${collapsed ? 'w-16' : 'w-64'} bg-gradient-to-b from-gray-900 via-gray-900 to-gray-950 text-white flex flex-col h-full transition-all duration-300
        fixed md:relative z-50
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0
      `}>
        {/* Header */}
        <div className="p-3 border-b border-gray-800/50 flex items-center justify-between">
          {!collapsed ? (
            <img src="/abf-logo.png" alt="An Binh Foods" className="h-9 object-contain rounded" />
          ) : (
            <img src="/abf-logo.png" alt="ABF" className="w-8 h-8 object-contain rounded mx-auto" />
          )}
          <button
            onClick={onToggle}
            className="p-1.5 rounded-lg hover:bg-gray-800 transition-colors"
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
              const colorClass = MODULE_COLORS[item.module] || 'text-gray-400';
              const activeBg = MODULE_ACTIVE_BG[item.module] || 'bg-gray-800 border-gray-400';

              return (
                <li key={item.path}>
                  {item.subItems.length === 0 ? (
                    <Link
                      to={item.path}
                      className={`flex items-center px-3 py-2.5 rounded-lg transition-all duration-200 group border-l-2 ${
                        active
                          ? `${activeBg} text-white`
                          : 'border-transparent text-gray-400 hover:bg-gray-800/50 hover:text-white'
                      }`}
                      title={collapsed ? item.name : ''}
                    >
                      <span className={`${active ? colorClass : 'text-gray-500 group-hover:' + colorClass} transition-colors ${collapsed ? '' : 'mr-3'}`}>
                        {item.icon}
                      </span>
                      {!collapsed && <span className="text-sm font-medium">{item.name}</span>}
                    </Link>
                  ) : (
                    <>
                      <div
                        className={`flex items-center px-3 py-2.5 rounded-lg transition-all duration-200 cursor-pointer group border-l-2 ${
                          active
                            ? `${activeBg} text-white`
                            : 'border-transparent text-gray-400 hover:bg-gray-800/50 hover:text-white'
                        }`}
                        onClick={() => {
                          navigate(item.path);
                          if (!collapsed) toggleExpand(item.path);
                        }}
                        title={collapsed ? item.name : ''}
                      >
                        <span className={`${active ? colorClass : 'text-gray-500 group-hover:' + colorClass} transition-colors ${collapsed ? '' : 'mr-3'}`}>
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
                        <ul className="mt-1 ml-4 pl-3 border-l border-gray-800 space-y-0.5">
                          {item.subItems
                            .filter((subItem: any) => {
                              if (!user) return false;
                              return hasSubModuleAccess(item.module, subItem.subModule, user.department, user.subDepartment, user.role, user.secondaryDepartments);
                            })
                            .map((subItem: any) => (
                              <li key={subItem.path}>
                                <Link
                                  to={subItem.path}
                                  className={`flex items-center px-3 py-2 rounded-md text-sm transition-all duration-200 ${
                                    location.pathname === subItem.path
                                      ? 'text-white bg-gray-800/70'
                                      : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/30'
                                  }`}
                                >
                                  <span className={`w-1.5 h-1.5 rounded-full mr-2.5 ${
                                    location.pathname === subItem.path ? colorClass.replace('text-', 'bg-') : 'bg-gray-700'
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
        <div className="border-t border-gray-800/50 p-2 space-y-1">
          <Link
            to="/huong-dan"
            className={`flex items-center px-3 py-2.5 rounded-lg text-sm transition-all duration-200 ${
              location.pathname === '/huong-dan'
                ? 'bg-gray-800 text-white'
                : 'text-gray-400 hover:bg-gray-800/50 hover:text-white'
            }`}
            title={collapsed ? 'Hướng dẫn' : ''}
          >
            <span className={`text-gray-500 ${collapsed ? '' : 'mr-3'}`}><BookOpen size={20} /></span>
            {!collapsed && <span className="font-medium">Hướng dẫn</span>}
          </Link>

          {user && isAdmin(user.department) && (
            <>
              <Link
                to="/diemdanh/admin"
                className={`flex items-center px-3 py-2.5 rounded-lg text-sm transition-all duration-200 ${
                  location.pathname === '/diemdanh/admin'
                    ? 'bg-gray-800 text-white'
                    : 'text-gray-400 hover:bg-gray-800/50 hover:text-white'
                }`}
                title={collapsed ? 'Chấm công khuôn mặt' : ''}
              >
                <span className={`text-gray-500 ${collapsed ? '' : 'mr-3'}`}><ScanFace size={20} /></span>
                {!collapsed && <span className="font-medium">Chấm công khuôn mặt</span>}
              </Link>
              <Link
                to="/system-settings"
                className={`flex items-center px-3 py-2.5 rounded-lg text-sm transition-all duration-200 ${
                  location.pathname === '/system-settings'
                    ? 'bg-gray-800 text-white'
                    : 'text-gray-400 hover:bg-gray-800/50 hover:text-white'
                }`}
                title={collapsed ? 'Cài đặt hệ thống' : ''}
              >
                <span className={`text-gray-500 ${collapsed ? '' : 'mr-3'}`}><Settings size={20} /></span>
                {!collapsed && <span className="font-medium">Cài đặt hệ thống</span>}
              </Link>
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default Sidebar;
