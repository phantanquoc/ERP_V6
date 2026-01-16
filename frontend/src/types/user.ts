export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'ADMIN' | 'DEPARTMENT_HEAD' | 'TEAM_LEAD' | 'EMPLOYEE';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  // Department information
  departmentId?: string;
  departmentName?: string;
  subDepartmentId?: string | null;
  subDepartmentName?: string | null;
}

export interface CreateUserRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: string;
}

export interface UpdateUserRequest {
  firstName?: string;
  lastName?: string;
  role?: string;
  isActive?: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

