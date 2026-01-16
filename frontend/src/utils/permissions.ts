import { UserRole } from '../types/auth';

// Định nghĩa departments trong hệ thống
export const DEPARTMENTS = {
  ADMIN: 'admin',           // Admin - toàn quyền
  GENERAL: 'general',       // Bộ phận tổng hợp
  QUALITY: 'quality',       // Bộ phận chất lượng
  BUSINESS: 'business',     // Bộ phận kinh doanh
  ACCOUNTING: 'accounting', // Bộ phận kế toán
  PURCHASING: 'purchasing', // Bộ phận thu mua
  PRODUCTION: 'production', // Bộ phận sản xuất
  TECHNICAL: 'technical',   // Bộ phận kỹ thuật
} as const;

// Định nghĩa sub-departments (phòng con trong bộ phận)
export const SUB_DEPARTMENTS = {
  // Quality sub-departments
  QUALITY_PERSONNEL: 'personnel',    // Phòng chất lượng nhân sự
  QUALITY_PROCESS: 'process',        // Phòng chất lượng quy trình

  // Business sub-departments
  BUSINESS_INTERNATIONAL: 'international', // Phòng KD Quốc Tế
  BUSINESS_DOMESTIC: 'domestic',           // Phòng KD Nội Địa

  // Accounting sub-departments
  ACCOUNTING_ADMIN: 'admin',         // Phòng KT Hành chính
  ACCOUNTING_TAX: 'tax',             // Phòng KT thuế

  // Purchasing sub-departments
  PURCHASING_MATERIALS: 'materials', // Phòng thu mua NVL
  PURCHASING_EQUIPMENT: 'equipment', // Phòng mua Thiết bị

  // Production sub-departments
  PRODUCTION_MANAGEMENT: 'management', // Phòng QLSX
  PRODUCTION_WAREHOUSE: 'warehouse',   // Quản lý kho

  // Technical sub-departments
  TECHNICAL_QUALITY: 'quality',      // Phòng QLHTM
  TECHNICAL_MECHANICAL: 'mechanical', // Phòng cơ- điện

  // General sub-departments
  GENERAL_PRICING: 'pricing',        // Phòng giá thành
  GENERAL_PARTNERS: 'partners',      // Phòng chăm sóc
} as const;

// Định nghĩa roles trong phòng ban
export const DEPARTMENT_ROLES = {
  HEAD: 'head',           // Trưởng bộ phận
  EMPLOYEE: 'employee',   // Nhân viên
} as const;

// Định nghĩa permissions cho từng module dựa trên phòng ban
export interface DepartmentPermission {
  module: string;
  allowedDepartments: string[];
  adminOnly?: boolean; // Chỉ admin mới được truy cập
}

// Cấu hình permissions cho từng menu item theo phòng ban
export const DEPARTMENT_PERMISSIONS: DepartmentPermission[] = [
  {
    module: 'dashboard',
    allowedDepartments: Object.values(DEPARTMENTS) // Tất cả đều có thể xem dashboard
  },
  {
    module: 'common',
    allowedDepartments: Object.values(DEPARTMENTS), // Tất cả departments đều có thể truy cập
    adminOnly: false
  },
  {
    module: 'general',
    allowedDepartments: [DEPARTMENTS.ADMIN, DEPARTMENTS.GENERAL]
  },
  {
    module: 'quality',
    allowedDepartments: [DEPARTMENTS.ADMIN, DEPARTMENTS.QUALITY]
  },
  {
    module: 'business',
    allowedDepartments: [DEPARTMENTS.ADMIN, DEPARTMENTS.BUSINESS]
  },
  {
    module: 'accounting',
    allowedDepartments: [DEPARTMENTS.ADMIN, DEPARTMENTS.ACCOUNTING]
  },
  {
    module: 'purchasing',
    allowedDepartments: [DEPARTMENTS.ADMIN, DEPARTMENTS.PURCHASING]
  },
  {
    module: 'production',
    allowedDepartments: [DEPARTMENTS.ADMIN, DEPARTMENTS.PRODUCTION]
  },
  {
    module: 'technical',
    allowedDepartments: [DEPARTMENTS.ADMIN, DEPARTMENTS.TECHNICAL]
  }
];

// Kiểm tra quyền truy cập module dựa trên phòng ban
export const hasModuleAccess = (
  module: string,
  userRole: UserRole,
  userDepartment?: string
): boolean => {
  const permission = DEPARTMENT_PERMISSIONS.find(p => p.module === module);

  if (!permission) return false;

  // Nếu không có department thì không có quyền truy cập
  if (!userDepartment) return false;

  // Admin (department = 'admin') luôn có quyền truy cập tất cả
  if (userDepartment === DEPARTMENTS.ADMIN) return true;

  // Kiểm tra xem department của user có trong danh sách được phép không
  return permission.allowedDepartments.includes(userDepartment);
};

// Kiểm tra quyền truy cập sub-module (trang con trong bộ phận)
export const hasSubModuleAccess = (
  department: string,
  subModule: string,
  userDepartment?: string,
  userSubDepartment?: string,
  userRole?: string
): boolean => {
  // Admin luôn có quyền truy cập
  if (userDepartment === DEPARTMENTS.ADMIN) return true;

  // Phải cùng department
  if (userDepartment !== department) return false;

  // MANAGER (Trưởng bộ phận hoặc Trưởng phòng) có thể truy cập tất cả sub-modules trong bộ phận
  if (userRole === UserRole.MANAGER) return true;

  // EMPLOYEE chỉ có thể truy cập sub-module của mình
  if (userRole === UserRole.EMPLOYEE) {
    return userSubDepartment === subModule;
  }

  // Mặc định không có quyền
  return false;
};

// Kiểm tra xem user có phải admin không
export const isAdmin = (userDepartment?: string): boolean => {
  return userDepartment === DEPARTMENTS.ADMIN;
};

// Kiểm tra quyền xem dashboard features dựa trên phòng ban
export const getDashboardPermissions = (userDepartment?: string) => {
  const adminAccess = isAdmin(userDepartment);

  return {
    canViewAllStats: adminAccess, // Chỉ admin mới xem được tất cả stats
    canViewChart: adminAccess,    // Chỉ admin mới xem được chart
    canViewRecentActivities: adminAccess, // Chỉ admin mới xem được hoạt động gần đây
    canViewPersonalStats: true,   // Tất cả đều có thể xem stats cá nhân
    canViewDepartmentStats: !adminAccess, // Nhân viên phòng ban xem stats phòng ban
  };
};

// Lấy stats data dựa trên phòng ban
export const getStatsForDepartment = (userDepartment?: string) => {
  const baseStats = [
    {
      title: "Công việc của tôi",
      value: 5,
      icon: "briefcase",
      color: "bg-blue-500"
    }
  ];

  // Admin xem tất cả stats của công ty
  if (isAdmin(userDepartment)) {
    return [
      {
        title: "Tổng nhân viên",
        value: 1250,
        icon: "users",
        color: "bg-blue-500"
      },
      {
        title: "Doanh thu",
        value: 45000000,
        icon: "dollar-sign",
        color: "bg-green-500"
      },
      {
        title: "Đơn hàng",
        value: 320,
        icon: "shopping-cart",
        color: "bg-purple-500"
      },
      {
        title: "Sản phẩm",
        value: 128,
        icon: "package",
        color: "bg-orange-500"
      }
    ];
  }

  // Nhân viên phòng ban chỉ xem stats của phòng ban mình
  const departmentStats = getDepartmentStats(userDepartment);
  return [
    ...baseStats,
    ...departmentStats
  ];
};

// Lấy stats theo department
const getDepartmentStats = (department?: string) => {
  switch (department) {
    case DEPARTMENTS.QUALITY:
      return [
        {
          title: "Kiểm tra chất lượng",
          value: 45,
          icon: "shield-check",
          color: "bg-green-500"
        },
        {
          title: "Lỗi phát hiện",
          value: 3,
          icon: "alert-triangle",
          color: "bg-red-500"
        },
        {
          title: "Sản phẩm đạt chuẩn",
          value: 98,
          icon: "check-circle",
          color: "bg-blue-500"
        }
      ];

    case DEPARTMENTS.PRODUCTION:
      return [
        {
          title: "Sản phẩm sản xuất",
          value: 150,
          icon: "package",
          color: "bg-blue-500"
        },
        {
          title: "Hiệu suất (%)",
          value: 95,
          icon: "trending-up",
          color: "bg-green-500"
        },
        {
          title: "Đơn hàng hoàn thành",
          value: 28,
          icon: "check-circle",
          color: "bg-purple-500"
        }
      ];

    case DEPARTMENTS.BUSINESS:
      return [
        {
          title: "Khách hàng mới",
          value: 12,
          icon: "users",
          color: "bg-green-500"
        },
        {
          title: "Hợp đồng ký",
          value: 8,
          icon: "file-text",
          color: "bg-blue-500"
        },
        {
          title: "Doanh thu tháng",
          value: 2500000,
          icon: "dollar-sign",
          color: "bg-yellow-500"
        }
      ];

    case DEPARTMENTS.ACCOUNTING:
      return [
        {
          title: "Hóa đơn xử lý",
          value: 156,
          icon: "file-text",
          color: "bg-blue-500"
        },
        {
          title: "Thanh toán",
          value: 89,
          icon: "dollar-sign",
          color: "bg-green-500"
        },
        {
          title: "Báo cáo tài chính",
          value: 4,
          icon: "trending-up",
          color: "bg-purple-500"
        }
      ];

    case DEPARTMENTS.PURCHASING:
      return [
        {
          title: "Đơn mua hàng",
          value: 23,
          icon: "shopping-cart",
          color: "bg-blue-500"
        },
        {
          title: "Nhà cung cấp",
          value: 15,
          icon: "users",
          color: "bg-green-500"
        },
        {
          title: "Tiết kiệm chi phí",
          value: 12,
          icon: "trending-up",
          color: "bg-yellow-500"
        }
      ];

    case DEPARTMENTS.TECHNICAL:
      return [
        {
          title: "Dự án kỹ thuật",
          value: 6,
          icon: "settings",
          color: "bg-blue-500"
        },
        {
          title: "Bảo trì thiết bị",
          value: 18,
          icon: "tool",
          color: "bg-orange-500"
        },
        {
          title: "Cải tiến quy trình",
          value: 3,
          icon: "trending-up",
          color: "bg-green-500"
        }
      ];

    case DEPARTMENTS.GENERAL:
      return [
        {
          title: "Báo cáo tổng hợp",
          value: 8,
          icon: "file-text",
          color: "bg-purple-500"
        },
        {
          title: "Hỗ trợ phòng ban",
          value: 12,
          icon: "users",
          color: "bg-blue-500"
        },
        {
          title: "Dự án chung",
          value: 5,
          icon: "briefcase",
          color: "bg-green-500"
        }
      ];

    default:
      return [
        {
          title: "Nhiệm vụ hoàn thành",
          value: 12,
          icon: "check-circle",
          color: "bg-green-500"
        }
      ];
  }
};

// Lấy tên phòng ban hiển thị
export const getDepartmentDisplayName = (department?: string): string => {
  switch (department) {
    case DEPARTMENTS.ADMIN: return 'Quản trị hệ thống';
    case DEPARTMENTS.GENERAL: return 'Bộ phận tổng hợp';
    case DEPARTMENTS.QUALITY: return 'Bộ phận chất lượng';
    case DEPARTMENTS.BUSINESS: return 'Bộ phận kinh doanh';
    case DEPARTMENTS.ACCOUNTING: return 'Bộ phận kế toán';
    case DEPARTMENTS.PURCHASING: return 'Bộ phận thu mua';
    case DEPARTMENTS.PRODUCTION: return 'Bộ phận sản xuất';
    case DEPARTMENTS.TECHNICAL: return 'Bộ phận kỹ thuật';
    default: return 'Chưa xác định';
  }
};
