import { LoginRequest, RegisterRequest, AuthResponse, User, UserRole } from '../types/auth';
import { API_BASE_URL } from '../config/api';

// Custom error type for IP rate limit lock
export class IpLockedError extends Error {
  public lockedUntil: Date;
  constructor(message: string, lockedUntil: Date) {
    super(message);
    this.name = 'IpLockedError';
    this.lockedUntil = lockedUntil;
  }
}

class AuthService {
  static async login(credentials: LoginRequest): Promise<AuthResponse> {
    try {
      console.log('Attempting login with:', credentials.identifier);
      console.log('API URL:', `${API_BASE_URL}/auth/login`);

      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          identifier: credentials.identifier,
          password: credentials.password,
        }),
      });

      console.log('Response status:', response.status);

      if (!response.ok) {
        let errorMessage = 'Đăng nhập thất bại';
        try {
          const errorData = await response.json();
          // Handle IP locked (HTTP 429)
          if (response.status === 429 && errorData.lockedUntil) {
            throw new IpLockedError(errorData.message || 'IP bị khóa', new Date(errorData.lockedUntil));
          }
          errorMessage = errorData.message || errorMessage;
        } catch (e) {
          if (e instanceof IpLockedError) throw e;
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log('Response data:', data);

      if (!data.success || !data.data) {
        throw new Error(data.message || 'Đăng nhập thất bại');
      }

      // Map backend role to frontend UserRole
      const mapBackendRoleToUserRole = (backendRole: string): UserRole => {
        switch (backendRole?.toUpperCase()) {
          case 'ADMIN':
            return UserRole.ADMIN;
          case 'DEPARTMENT_HEAD':
            return UserRole.DEPARTMENT_HEAD;
          case 'TEAM_LEAD':
            return UserRole.TEAM_LEAD;
          case 'EMPLOYEE':
            return UserRole.EMPLOYEE;
          default:
            return UserRole.EMPLOYEE;
        }
      };

      // Map department name to department code for permission system.
      // Returns undefined if name is unknown — caller must supply a default if needed.
      const mapDepartmentNameToCode = (departmentName?: string): string | undefined => {
        if (!departmentName) return undefined;

        const nameMap: Record<string, string> = {
          'Bộ phận tổng hợp': 'general',
          'Bộ phận chất lượng': 'quality',
          'Bộ phận kinh doanh': 'business',
          'Bộ phận kế toán': 'accounting',
          'Bộ phận thu mua': 'purchasing',
          'Bộ phận sản xuất': 'production',
          'Bộ phận kỹ thuật': 'technical',
        };

        return nameMap[departmentName];
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
          'Dữ liệu sản xuất': 'data',
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
          department: data.data.user.role === 'ADMIN' ? 'admin' : (mapDepartmentNameToCode(data.data.user.departmentName) ?? 'general'),
          subDepartment: mapSubDepartmentNameToCode(data.data.user.subDepartmentName),
          // New: map secondaryDepartments array
          secondaryDepartments: (data.data.user.secondaryDepartments ?? []).map((s: any) => ({
            departmentId: s.departmentId,
            subDepartmentId: s.subDepartmentId ?? null,
            role: mapBackendRoleToUserRole(s.role),
            departmentName: s.departmentName ?? null,
            subDepartmentName: s.subDepartmentName ?? null,
            departmentCode: s.departmentCode ?? mapDepartmentNameToCode(s.departmentName),
            subDepartmentCode: s.subDepartmentCode ?? mapSubDepartmentNameToCode(s.subDepartmentName),
          })),
          // @deprecated backward compat — populated from secondaryDepartments[0]
          secondaryDepartment: data.data.user.secondaryDepartmentName ? mapDepartmentNameToCode(data.data.user.secondaryDepartmentName) : undefined,
          secondarySubDepartment: data.data.user.secondarySubDepartmentName ? mapSubDepartmentNameToCode(data.data.user.secondarySubDepartmentName) : undefined,
          secondaryRole: data.data.user.secondaryRole ? mapBackendRoleToUserRole(data.data.user.secondaryRole) : undefined,
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

      console.log('Login successful for:', authResponse.user.email);
      return authResponse;
    } catch (error) {
      console.error('Login error:', error);
      if (error instanceof IpLockedError) throw error;
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        throw new Error(`Không thể kết nối đến server. Vui lòng kiểm tra backend đang chạy tại ${API_BASE_URL}`);
      }
      throw error;
    }
  }

  static async register(userData: RegisterRequest): Promise<AuthResponse> {
    throw new Error('Đăng ký tài khoản hiện chưa được hỗ trợ');
  }

  static async forgotPassword(identifier: string): Promise<string> {
    const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ identifier }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Yêu cầu thất bại');
    }

    return data.message;
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

      console.log('Logout successful');
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
        // Check if session was replaced by another device login
        try {
          const errorData = await response.json();
          if (errorData.code === 'SESSION_REPLACED') {
            localStorage.setItem('session_replaced', 'true');
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('user');
            window.location.href = '/login';
            return null;
          }
        } catch (_e) {
          // ignore JSON parse error
        }
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
