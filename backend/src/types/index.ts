export interface JwtPayload {
  id: string;
  email: string;
  role: string;
}

export interface AuthRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    departmentId?: string | null;
    departmentName?: string | null;
    subDepartmentId?: string | null;
    subDepartmentName?: string | null;
  };
  employee?: {
    id: string;
    employeeCode: string;
    gender?: string | null;
    dateOfBirth?: Date | null;
    phoneNumber?: string | null;
    address?: string | null;
    positionId: string;
    position?: { id: string; name: string };
    positionLevelId?: string | null;
    positionLevel?: { id: string; level: string; baseSalary: number; kpiSalary: number } | null;
    subDepartmentId?: string | null;
    status: string;
    hireDate: Date;
    contractType: string;
    educationLevel?: string | null;
    specialization?: string | null;
    specialSkills?: string | null;
    baseSalary: number;
    kpiLevel?: number | null;
    responsibilityCode?: string | null;
    weight?: number | null;
    height?: number | null;
    shirtSize?: string | null;
    pantSize?: string | null;
    shoeSize?: string | null;
    bankAccount?: string | null;
    lockerNumber?: string | null;
    notes?: string | null;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const UserRole = {
  ADMIN: 'ADMIN',
  DEPARTMENT_HEAD: 'DEPARTMENT_HEAD',
  TEAM_LEAD: 'TEAM_LEAD',
  EMPLOYEE: 'EMPLOYEE',
} as const;

export type UserRole = typeof UserRole[keyof typeof UserRole];

import { Request } from 'express';

export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
  userDepartmentId?: string | null;
  userSubDepartmentId?: string | null;
}

// Export task types
export * from './task.types';
