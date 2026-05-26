// Authentication types
export interface LoginRequest {
  identifier: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  confirmPassword: string;
}



export interface SecondaryDepartmentEntry {
  departmentId: string;
  subDepartmentId?: string | null;
  role: UserRole;
  departmentName?: string | null;
  subDepartmentName?: string | null;
  departmentCode?: string;
  subDepartmentCode?: string;
}

export interface User {
  _id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  department?: string;         // department CODE for RBAC
  departmentName?: string;     // department display name (Vietnamese)
  position?: string;
  secondaryDepartments?: SecondaryDepartmentEntry[];
  /** @deprecated use secondaryDepartments[0]?.departmentCode */
  secondaryDepartment?: string;
  /** @deprecated use secondaryDepartments[0]?.subDepartmentCode */
  secondarySubDepartment?: string;
  /** @deprecated use secondaryDepartments[0]?.role */
  secondaryRole?: UserRole;
  // Employee specific information
  employeeId?: string;
  employeeCode?: string;
  gender?: 'Nam' | 'Nữ' | 'Khác';
  dateOfBirth?: string;          // ISO date string
  address?: string;
  subDepartment?: string;        // sub-department CODE (for RBAC checks)
  subDepartmentName?: string;    // sub-department display name (for UI display)
  hireDate?: string;             // employee hire date (ISO string)
  contractType?: string;         // loại hợp đồng
  educationLevel?: string;       // trình độ học vấn
  specialization?: string;       // chuyên ngành
  specialSkills?: string;        // kỹ năng đặc biệt
  positionLevelName?: string;    // cấp chức vụ (display name)
  weight?: number;
  height?: number;
  shirtSize?: 'XS' | 'S' | 'M' | 'L' | 'XL' | 'XXL' | 'XXXL';
  pantSize?: string;
  shoeSize?: string;
  phoneNumber?: string;
  bankAccount?: string;
  lockerNumber?: string;
  employeeStatus?: 'Đang làm việc' | 'Nghỉ phép' | 'Tạm nghỉ' | 'Đã nghỉ việc' | 'Thử việc';
  // Additional employee information
  baseSalary?: number;
  kpiLevel?: number;
  responsibilityCode?: string;
  evaluationScore?: number;
  notes?: string;
  activities?: string[];
  profileDocuments?: string[];
  isActive: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

// Note: ApiResponse interface removed - not needed for frontend-only development



export enum UserRole {
  ADMIN = 'admin',
  DEPARTMENT_HEAD = 'department_head',
  TEAM_LEAD = 'team_lead',
  EMPLOYEE = 'employee',
  VIEWER = 'viewer'
}

export enum Department {
  HR = 'hr',
  FINANCE = 'finance',
  SALES = 'sales',
  MARKETING = 'marketing',
  IT = 'it',
  OPERATIONS = 'operations',
  PROCUREMENT = 'procurement'
}
