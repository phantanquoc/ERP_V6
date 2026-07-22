import { LoginRequest, RegisterRequest, AuthResponse, User, UserRole } from '../types/auth';
import { API_BASE_URL } from '../config/api';

// ─── Mapping helpers (shared between login and fetchMe) ─────────────────────

function mapBackendRoleToUserRole(backendRole: string): UserRole {
  switch (backendRole?.toUpperCase()) {
    case 'ADMIN': return UserRole.ADMIN;
    case 'DEPARTMENT_HEAD': return UserRole.DEPARTMENT_HEAD;
    case 'TEAM_LEAD': return UserRole.TEAM_LEAD;
    case 'EMPLOYEE': return UserRole.EMPLOYEE;
    default: return UserRole.EMPLOYEE;
  }
}

function mapDeptCodeToPermCode(deptCode?: string | null): string | undefined {
  if (!deptCode) return undefined;
  const map: Record<string, string> = {
    'DEPT_GENERAL': 'general',
    'DEPT_QUALITY': 'quality',
    'DEPT_BUSINESS': 'business',
    'DEPT_ACCOUNTING': 'accounting',
    'DEPT_PURCHASING': 'purchasing',
    'DEPT_PRODUCTION': 'production',
    'DEPT_TECHNICAL': 'technical',
  };
  return map[deptCode];
}

function mapSubDeptCodeToPermCode(subDeptCode?: string | null): string | undefined {
  if (!subDeptCode) return undefined;
  const map: Record<string, string> = {
    'SUBDEPT_GENERAL_PRICING': 'pricing',
    'SUBDEPT_GENERAL_PARTNERS': 'partners',
    'SUBDEPT_QUALITY_PERSONNEL': 'personnel',
    'SUBDEPT_QUALITY_PROCESS': 'process',
    'SUBDEPT_BUSINESS_INTERNATIONAL': 'international',
    'SUBDEPT_BUSINESS_DOMESTIC': 'domestic',
    'SUBDEPT_ACCOUNTING_ADMIN': 'admin',
    'SUBDEPT_ACCOUNTING_TAX': 'tax',
    'SUBDEPT_PURCHASING_MATERIALS': 'materials',
    'SUBDEPT_PURCHASING_EQUIPMENT': 'equipment',
    'SUBDEPT_PRODUCTION_MANAGEMENT': 'management',
    'SUBDEPT_PRODUCTION_WAREHOUSE': 'warehouse',
    'SUBDEPT_PRODUCTION_DATA': 'data',
    'SUBDEPT_TECHNICAL_QUALITY': 'quality',
    // Legacy: MECHANICAL merged into QUALITY (Phòng đảm bảo và cải tiến).
    // Any residual user tied to the old code still resolves to the merged sub-module.
    'SUBDEPT_TECHNICAL_MECHANICAL': 'quality',
    'SUBDEPT_TECHNICAL_PROJECTS': 'projects',
  };
  return map[subDeptCode];
}

function mapDepartmentNameToCode(departmentName?: string): string | undefined {
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
}

function mapSubDepartmentNameToCode(subDepartmentName?: string): string | undefined {
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
    'Phòng đảm bảo và cải tiến': 'quality',
    // Legacy names — both old sub-depts merged into QUALITY.
    'Phòng QLHTM': 'quality',
    'Phòng cơ- điện': 'quality',
    'Phòng phát triển': 'projects',
  };
  return nameMap[subDepartmentName];
}

function mapEmployeeStatus(status?: string): 'Đang làm việc' | 'Nghỉ phép' | 'Tạm nghỉ' | 'Đã nghỉ việc' | 'Thử việc' | undefined {
  if (!status) return undefined;
  switch (status.toUpperCase()) {
    case 'ACTIVE': return 'Đang làm việc';
    case 'ON_LEAVE': return 'Nghỉ phép';
    case 'INACTIVE': return 'Tạm nghỉ';
    case 'TERMINATED': return 'Đã nghỉ việc';
    case 'PROBATION': return 'Thử việc';
    default: return undefined;
  }
}

function buildUserFromResponse(userData: any, employeeData: any): User {
  return {
    _id: userData.id,
    username: userData.email.split('@')[0],
    email: userData.email,
    firstName: userData.firstName,
    lastName: userData.lastName,
    role: mapBackendRoleToUserRole(userData.role),
    department: userData.role === 'ADMIN'
      ? 'admin'
      : (mapDeptCodeToPermCode(userData.departmentCode) ?? mapDepartmentNameToCode(userData.departmentName) ?? undefined),
    departmentCode: userData.departmentCode ?? undefined,
    departmentName: userData.departmentName ?? undefined,
    subDepartment: mapSubDeptCodeToPermCode(userData.subDepartmentCode) ?? mapSubDepartmentNameToCode(userData.subDepartmentName),
    subDepartmentName: userData.subDepartmentName,
    secondaryDepartments: (userData.secondaryDepartments ?? []).map((s: any) => ({
      departmentId: s.departmentId,
      subDepartmentId: s.subDepartmentId ?? null,
      role: mapBackendRoleToUserRole(s.role),
      departmentName: s.departmentName ?? null,
      subDepartmentName: s.subDepartmentName ?? null,
      departmentCode: mapDeptCodeToPermCode(s.departmentCode) ?? mapDepartmentNameToCode(s.departmentName),
      subDepartmentCode: mapSubDeptCodeToPermCode(s.subDepartmentCode) ?? mapSubDepartmentNameToCode(s.subDepartmentName),
    })),
    employeeId: employeeData?.id,
    employeeCode: employeeData?.employeeCode,
    position: employeeData?.position?.name || userData.position,
    positionLevelName: employeeData?.positionLevel?.level ?? undefined,
    gender: employeeData?.gender,
    dateOfBirth: employeeData?.dateOfBirth,
    address: employeeData?.address ?? undefined,
    contractType: employeeData?.contractType ?? undefined,
    educationLevel: employeeData?.educationLevel ?? undefined,
    specialization: employeeData?.specialization ?? undefined,
    specialSkills: employeeData?.specialSkills ?? undefined,
    weight: employeeData?.weight,
    height: employeeData?.height,
    shirtSize: employeeData?.shirtSize,
    pantSize: employeeData?.pantSize,
    shoeSize: employeeData?.shoeSize,
    phoneNumber: employeeData?.phoneNumber,
    bankAccount: employeeData?.bankAccount,
    lockerNumber: employeeData?.lockerNumber,
    employeeStatus: mapEmployeeStatus(employeeData?.status),
    baseSalary: employeeData?.baseSalary,
    kpiLevel: employeeData?.kpiLevel,
    responsibilityCode: employeeData?.responsibilityCode,
    evaluationScore: employeeData?.evaluationScore,
    notes: employeeData?.notes,
    hireDate: employeeData?.hireDate,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

// ─── Custom error types ─────────────────────────────────────────────────────
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

      const authResponse: AuthResponse = {
        user: buildUserFromResponse(data.data.user, data.data.employee),
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

  static async fetchMe(): Promise<User | null> {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) return null;

      const { default: apiClient } = await import('./apiClient');
      const data = await apiClient.get<any>('/auth/me', { skipKioskExpiry: true });
      if (!data.success || !data.data) return null;

      const user = buildUserFromResponse(data.data.user, data.data.employee);
      localStorage.setItem('user', JSON.stringify(user));
      return user;
    } catch {
      return null;
    }
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
