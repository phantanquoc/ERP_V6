import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, BarChart2, Briefcase, Calculator, ShoppingCart, Factory, Settings, ChevronDown, ChevronRight, ChevronLeft, CalendarDays } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { hasModuleAccess, hasSubModuleAccess } from '../utils/permissions';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

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
    {
      path: '/',
      name: 'Dashboard',
      icon: <LayoutDashboard size={20} />,
      subItems: [],
      module: 'dashboard'
    },
    {
      path: '/common',
      name: 'Chung',
      icon: <BarChart2 size={20} />,
      subItems: [],
      module: 'common'
    },
    {
      path: '/meetings',
      name: 'Cuộc họp',
      icon: <CalendarDays size={20} />,
      subItems: [],
      module: 'meetings'
    },
    {
      path: '/general',
      name: 'Bộ phận tổng hợp',
      icon: <BarChart2 size={20} />,
      subItems: [
        { path: '/general/pricing', name: 'Phòng giá thành', subModule: 'pricing' },
        { path: '/general/partners', name: 'Phòng chăm sóc', subModule: 'partners' },
      ],
      module: 'general'
    },
    {
      path: '/quality',
      name: 'Bộ phận chất lượng',
      icon: <BarChart2 size={20} />,
      subItems: [
        { path: '/quality/personnel', name: 'Phòng chất lượng nhân sự', subModule: 'personnel' },
        { path: '/quality/process', name: 'Phòng chất lượng quy trình', subModule: 'process' },
      ],
      module: 'quality'
    },
    {
      path: '/business',
      name: 'Bộ phận kinh doanh',
      icon: <Briefcase size={20} />,
      subItems: [
        { path: '/business/international', name: 'Phòng KD Quốc Tế', subModule: 'international' },
        { path: '/business/domestic', name: 'Phòng KD Nội Địa', subModule: 'domestic' },
      ],
      module: 'business'
    },
    {
      path: '/accounting',
      name: 'Bộ phận kế toán',
      icon: <Calculator size={20} />,
      subItems: [
        { path: '/accounting/admin', name: 'Phòng KT Hành chính', subModule: 'admin' },
        { path: '/accounting/tax', name: 'Phòng KT thuế', subModule: 'tax' },
      ],
      module: 'accounting'
    },
    {
      path: '/purchasing',
      name: 'Bộ phận Thu mua',
      icon: <ShoppingCart size={20} />,
      subItems: [
        { path: '/purchasing/materials', name: 'Phòng thu mua NVL', subModule: 'materials' },
        { path: '/purchasing/equipment', name: 'Phòng mua Thiết bị', subModule: 'equipment' },
      ],
      module: 'purchasing'
    },
    {
      path: '/production',
      name: 'Bộ phận sản xuất',
      icon: <Factory size={20} />,
      subItems: [
        { path: '/production/management', name: 'Phòng QLSX', subModule: 'management' },
        { path: '/production/warehouse', name: 'Quản lý kho', subModule: 'warehouse' },
        { path: '/production/data', name: 'Dữ liệu sản xuất', subModule: 'data' },
      ],
      module: 'production'
    },
    {
      path: '/technical',
      name: 'Bộ phận kỹ thuật',
      icon: <Settings size={20} />,
      subItems: [
        { path: '/technical/quality', name: 'Phòng QLHTM', subModule: 'quality' },
        { path: '/technical/mechanical', name: 'Phòng cơ- điện', subModule: 'mechanical' },
      ],
      module: 'technical'
    },
  ];

  // Filter menu items based on department permissions
  const menuItems = allMenuItems.filter(item => {
    if (!user) return false;
    return hasModuleAccess(item.module, user.role, user.department);
  });

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={onMobileClose}
        />
      )}
      <div className={`
        ${collapsed ? 'w-16' : 'w-64'} bg-sidebar text-sidebar-text flex flex-col h-full transition-all duration-300
        fixed md:relative z-50
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0
      `}>
      {/* Header with toggle button */}
      <div className="p-4 border-b border-white/10 flex items-center justify-between">
        {!collapsed && <h1 className="text-xl font-bold">ABF System</h1>}
        <button
          onClick={onToggle}
          className="p-1 rounded hover:bg-white/10 transition-colors"
          title={collapsed ? 'Mở menu' : 'Thu gọn menu'}
        >
          {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto min-h-0">
        <ul className="py-2">
          {menuItems.map((item) => (
            <li key={item.path} className="mb-1">
              {(item.path === '/' || item.path === '/common') ? (
                <Link
                  to={item.path}
                  className={`flex items-center px-4 py-3 text-sidebar-text/80 hover:bg-white/10 hover:text-sidebar-text transition-colors ${
                    location.pathname === item.path ? 'bg-white/20 text-sidebar-text' : ''
                  }`}
                  title={collapsed ? item.name : ''}
                >
                  <span className={collapsed ? '' : 'mr-3'}>{item.icon}</span>
                  {!collapsed && <span>{item.name}</span>}
                </Link>
              ) : (
                <>
                  <div
                    className={`flex items-center px-4 py-3 text-sidebar-text/80 hover:bg-white/10 hover:text-sidebar-text transition-colors cursor-pointer ${
                      location.pathname.startsWith(item.path) ? 'bg-white/20 text-sidebar-text' : ''
                    }`}
                    onClick={() => {
                      navigate(item.path);
                      if (!collapsed) {
                        toggleExpand(item.path);
                      }
                    }}
                    title={collapsed ? item.name : ''}
                  >
                    <span className={collapsed ? '' : 'mr-3'}>{item.icon}</span>
                    {!collapsed && (
                      <>
                        <span>{item.name}</span>
                        <span className="ml-auto">
                          {expandedItems[item.path] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        </span>
                      </>
                    )}
                  </div>

                  {!collapsed && expandedItems[item.path] && item.subItems.length > 0 && (
                    <ul className="bg-black/20 py-1">
                      {item.subItems
                        .filter((subItem: any) => {
                          if (!user) return false;
                          return hasSubModuleAccess(
                            item.module,
                            subItem.subModule,
                            user.department,
                            user.subDepartment,
                            user.role
                          );
                        })
                        .map((subItem: any) => (
                          <li key={subItem.path}>
                            <Link
                              to={subItem.path}
                              className={`flex items-center pl-12 pr-4 py-2 text-sidebar-text/70 hover:bg-white/10 hover:text-sidebar-text transition-colors ${
                                location.pathname === subItem.path ? 'bg-white/20 text-sidebar-text' : ''
                              }`}
                            >
                              <span>{subItem.name}</span>
                            </Link>
                          </li>
                        ))}
                    </ul>
                  )}
                </>
              )}
            </li>
          ))}
        </ul>
      </nav>

      {/* Admin-only: Settings link at bottom */}
      {user?.role === 'ADMIN' && (
        <div className="border-t border-white/10 p-2">
          <Link
            to="/settings"
            title={collapsed ? 'Cài đặt hệ thống' : ''}
            className={`flex items-center px-3 py-3 rounded-lg transition-colors ${
              location.pathname === '/settings'
                ? 'bg-white/20 text-sidebar-text'
                : 'text-sidebar-text/70 hover:bg-white/10 hover:text-sidebar-text'
            }`}
          >
            <svg
              width="20"
              height="20"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              className="flex-shrink-0"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.8}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.8}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            {!collapsed && (
              <span className="ml-3 text-sm font-medium">Cài đặt hệ thống</span>
            )}
          </Link>
        </div>
      )}
    </div>
    </>
  );
};

export default Sidebar;
