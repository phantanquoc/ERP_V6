import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, BarChart2, Briefcase, Calculator, ShoppingCart, Factory, Settings, ChevronDown, ChevronRight, ChevronLeft } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { hasModuleAccess, hasSubModuleAccess } from '../utils/permissions';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

const Sidebar = ({ collapsed, onToggle }: SidebarProps) => {
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
    <div className={`${collapsed ? 'w-16' : 'w-64'} bg-gray-900 text-white flex flex-col h-full transition-all duration-300`}>
      {/* Header with toggle button */}
      <div className="p-4 border-b border-gray-800 flex items-center justify-between">
        {!collapsed && <h1 className="text-xl font-bold">ABF System</h1>}
        <button
          onClick={onToggle}
          className="p-1 rounded hover:bg-gray-800 transition-colors"
          title={collapsed ? 'Mở menu' : 'Thu gọn menu'}
        >
          {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto">
        <ul className="py-2">
          {menuItems.map((item) => (
            <li key={item.path} className="mb-1">
              {(item.path === '/' || item.path === '/common') ? (
                <Link
                  to={item.path}
                  className={`flex items-center px-4 py-3 text-gray-300 hover:bg-gray-800 hover:text-white transition-colors ${
                    location.pathname === item.path ? 'bg-gray-800 text-white' : ''
                  }`}
                  title={collapsed ? item.name : ''}
                >
                  <span className={collapsed ? '' : 'mr-3'}>{item.icon}</span>
                  {!collapsed && <span>{item.name}</span>}
                </Link>
              ) : (
                <>
                  <div
                    className={`flex items-center px-4 py-3 text-gray-300 hover:bg-gray-800 hover:text-white transition-colors cursor-pointer ${
                      location.pathname.startsWith(item.path) ? 'bg-gray-800 text-white' : ''
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
                    <ul className="bg-gray-800 py-1">
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
                              className={`flex items-center pl-12 pr-4 py-2 text-gray-300 hover:bg-gray-700 hover:text-white transition-colors ${
                                location.pathname === subItem.path ? 'bg-gray-700 text-white' : ''
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
    </div>
  );
};

export default Sidebar;
