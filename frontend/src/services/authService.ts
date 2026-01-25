import { LoginRequest, RegisterRequest, AuthResponse, User, UserRole } from '../types/auth';

// API Base URL
const API_BASE_URL = import.meta.env.VITE_API_URL || (import.meta.env.VITE_API_URL || 'http://localhost:5000/api') + '';

class AuthService {
  static async login(credentials: LoginRequest): Promise<AuthResponse> {
    try {
      console.log('🔐 Attempting login with:', credentials.email);
      console.log('📡 API URL:', `${API_BASE_URL}/auth/login`);

      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      console.log('📊 Response status:', response.status);

      if (!response.ok) {
        let errorMessage = 'Đăng nhập thất bại';
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch (e) {
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log('✅ Response data:', data);

      if (!data.success || !data.data) {
        throw new Error(data.message || 'Đăng nhập thất bại');
      }

      // Map backend role to frontend UserRole
      const mapBackendRoleToUserRole = (backendRole: string): UserRole => {
        switch (backendRole?.toUpperCase()) {
          case 'ADMIN':
            return UserRole.ADMIN;
          case 'DEPARTMENT_HEAD':
            return UserRole.MANAGER;
          case 'TEAM_LEAD':
            return UserRole.MANAGER;
          case 'EMPLOYEE':
            return UserRole.EMPLOYEE;
          default:
            return UserRole.EMPLOYEE;
        }
      };

      // Map department name to department code for permission system
      const mapDepartmentNameToCode = (departmentName?: string): string => {
        if (!departmentName) return 'general';

        const nameMap: Record<string, string> = {
          'Bộ phận tổng hợp': 'general',
          'Bộ phận chất lượng': 'quality',
          'Bộ phận kinh doanh': 'business',
          'Bộ phận kế toán': 'accounting',
          'Bộ phận thu mua': 'purchasing',
          'Bộ phận sản xuất': 'production',
          'Bộ phận kỹ thuật': 'technical',
        };

        return nameMap[departmentName] || 'general';
      };

      // Map subdepartment name to subdepartment code
      const mapSubDepartmentNameToCode = (subDepartmentName?: string): string | undefined => {
        if (!subDepartmentName) return undefined;

        const nameMap: Record<string, string> = {
          'Phòng giá thành': 'pricing',
          'Phòng chăm sóc': 'partners',
          'Phòng chất lượng nhân sự': 'personnel',
          'Phòng chất lượng quy trình': 'process',
          'Phòng KD Quốc Tế': 'international',
          'Phòng KD Nội Địa': 'domestic',
          'Phòng KT Hành chính': 'admin',
          'Phòng KT thuế': 'tax',
          'Phòng thu mua NVL': 'materials',
          'Phòng mua Thiết bị': 'equipment',
          'Phòng QLSX': 'management',
          'Quản lý kho': 'warehouse',
          'Phòng QLHTM': 'quality',
          'Phòng cơ- điện': 'mechanical',
        };

        return nameMap[subDepartmentName];
      };

      const authResponse: AuthResponse = {
        user: {
          _id: data.data.user.id,
          username: data.data.user.email.split('@')[0],
          email: data.data.user.email,
          firstName: data.data.user.firstName,
          lastName: data.data.user.lastName,
          role: mapBackendRoleToUserRole(data.data.user.role),
          department: data.data.user.role === 'ADMIN' ? 'admin' : mapDepartmentNameToCode(data.data.user.departmentName),
          subDepartment: mapSubDepartmentNameToCode(data.data.user.subDepartmentName),
          // Employee information
          employeeId: data.data.employee?.id,
          employeeCode: data.data.employee?.employeeCode,
          position: data.data.employee?.position?.name || data.data.user.position,
          gender: data.data.employee?.gender,
          weight: data.data.employee?.weight,
          height: data.data.employee?.height,
          shirtSize: data.data.employee?.shirtSize,
          pantSize: data.data.employee?.pantSize,
          shoeSize: data.data.employee?.shoeSize,
          phoneNumber: data.data.employee?.phoneNumber,
          bankAccount: data.data.employee?.bankAccount,
          lockerNumber: data.data.employee?.lockerNumber,
          employeeStatus: data.data.employee?.status,
          baseSalary: data.data.employee?.baseSalary,
          kpiLevel: data.data.employee?.kpiLevel,
          responsibilityCode: data.data.employee?.responsibilityCode,
          evaluationScore: data.data.employee?.evaluationScore,
          notes: data.data.employee?.notes,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        accessToken: data.data.accessToken,
        refreshToken: data.data.refreshToken,
      };

      // Store in localStorage
      localStorage.setItem('accessToken', authResponse.accessToken);
      localStorage.setItem('refreshToken', authResponse.refreshToken);
      localStorage.setItem('user', JSON.stringify(authResponse.user));

      console.log('🎉 Login successful for:', authResponse.user.email);
      return authResponse;
    } catch (error) {
      console.error('❌ Login error:', error);
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        throw new Error('Không thể kết nối đến server. Vui lòng kiểm tra backend đang chạy tại http://localhost:5000');
      }
      throw error;
    }
  }

  static async register(userData: RegisterRequest): Promise<AuthResponse> {
    throw new Error('Đăng ký tài khoản hiện chưa được hỗ trợ');
  }

  static async logout(): Promise<void> {
    try {
      const refreshToken = localStorage.getItem('refreshToken');

      if (refreshToken) {
        await fetch(`${API_BASE_URL}/auth/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ refreshToken }),
        });
      }

      console.log('🚪 Logout successful');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
    }
  }

  static async refreshToken(): Promise<string | null> {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) return null;

      const response = await fetch(`${API_BASE_URL}/auth/refresh-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        throw new Error('Token refresh failed');
      }

      const data = await response.json();

      if (!data.success || !data.data) {
        throw new Error('Token refresh failed');
      }

      const newAccessToken = data.data.accessToken;
      localStorage.setItem('accessToken', newAccessToken);

      return newAccessToken;
    } catch (error) {
      console.error('Token refresh error:', error);
      this.logout();
      return null;
    }
  }

  static getCurrentUser(): User | null {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  }

  static updateCurrentUser(userData: Partial<User>): void {
    const currentUser = this.getCurrentUser();
    if (currentUser) {
      const updatedUser = { ...currentUser, ...userData };
      localStorage.setItem('user', JSON.stringify(updatedUser));
    }
  }

  static getAccessToken(): string | null {
    return localStorage.getItem('accessToken');
  }

  static isAuthenticated(): boolean {
    return !!this.getAccessToken() && !!this.getCurrentUser();
  }
}

export default AuthService;
