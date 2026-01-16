// Authentication types
export interface LoginRequest {
  email: string;
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



export interface User {
  _id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  department?: string;
  position?: string;
  // Employee specific information
  employeeId?: string;
  employeeCode?: string;
  gender?: 'Nam' | 'Nữ' | 'Khác';
  subDepartment?: string;
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
  MANAGER = 'manager',
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
