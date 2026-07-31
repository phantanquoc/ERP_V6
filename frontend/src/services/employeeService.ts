import apiClient from './apiClient';
import { API_BASE_URL } from '../config/api';

interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface Employee {
  id: string;
  userId: string;
  employeeCode: string;
  gender?: string;
  dateOfBirth?: string;
  phoneNumber?: string;
  address?: string;
  positionId: string;
  positionLevelId?: string;
  subDepartmentId?: string;
  status: string;
  hireDate: string;
  contractType: string;
  educationLevel?: string;
  specialization?: string;
  specialSkills?: string;
  baseSalary: number;
  kpiLevel?: number;
  responsibilityCode?: string;
  weight?: number;
  height?: number;
  shirtSize?: string;
  pantSize?: string;
  shoeSize?: string;
  bankAccount?: string;
  lockerNumber?: string;
  notes?: string;
  user?: {
    email: string;
    firstName: string;
    lastName: string;
    departmentId?: string;
    role?: string;
  };
  position?: {
    id: string;
    name: string;
    code: string;
  };
  positionLevel?: {
    id: string;
    level: string;
    baseSalary: number;
    kpiSalary: number;
  };
  subDepartment?: {
    id: string;
    name: string;
    code: string;
    departmentId?: string;
  };
  departmentName?: string;
  subDepartmentName?: string;
}

interface CreateEmployeeRequest {
  employeeCode: string;
  userId: string;
  gender?: string;
  dateOfBirth?: string;
  phoneNumber?: string;
  address?: string;
  positionId?: string;
  positionLevelId?: string;
  subDepartmentId?: string;
  status?: string;
  hireDate: string;
  contractType?: string;
  educationLevel?: string;
  specialization?: string;
  specialSkills?: string;
  baseSalary: number;
  kpiLevel?: number;
  responsibilityCode?: string;
  weight?: number;
  height?: number;
  shirtSize?: string;
  pantSize?: string;
  shoeSize?: string;
  bankAccount?: string;
  lockerNumber?: string;
  notes?: string;
}

interface UpdateEmployeeRequest {
  gender?: string;
  dateOfBirth?: string;
  phoneNumber?: string;
  address?: string;
  positionId?: string;
  positionLevelId?: string;
  departmentId?: string;
  subDepartmentId?: string;
  status?: string;
  hireDate?: string;
  contractType?: string;
  educationLevel?: string;
  specialization?: string;
  specialSkills?: string;
  baseSalary?: number;
  kpiLevel?: number;
  responsibilityCode?: string;
  weight?: number;
  height?: number;
  shirtSize?: string;
  pantSize?: string;
  shoeSize?: string;
  bankAccount?: string;
  lockerNumber?: string;
  notes?: string;
}

class EmployeeService {
  async getAllEmployees(page: number = 1, limit: number = 10, departmentId?: string): Promise<PaginatedResponse<Employee>> {
    try {
      const params: Record<string, string | number> = { page, limit };
      if (departmentId) params.departmentId = departmentId;
      const response = await apiClient.get('/employees', { params });
      return response;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getEmployeesForAssignment(params: {
    page?: number;
    limit?: number;
    departmentId?: string;
    departmentCode?: string;
    subDepartmentId?: string;
    subDepartmentCode?: string;
    positionName?: string;
    positionCode?: string;
    search?: string;
  } = {}): Promise<{ data: Employee[]; pagination?: PaginationMeta }> {
    try {
      const response = await apiClient.get<Employee[]>('/employees/for-assignment', {
        params: {
          page: params.page ?? 1,
          limit: params.limit ?? 200,
          departmentId: params.departmentId,
          departmentCode: params.departmentCode,
          subDepartmentId: params.subDepartmentId,
          subDepartmentCode: params.subDepartmentCode,
          positionName: params.positionName,
          positionCode: params.positionCode,
          search: params.search,
        },
      });
      return {
        data: response.data || [],
        pagination: response.pagination,
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getEmployeeById(id: string): Promise<Employee> {
    try {
      const response = await apiClient.get(`/employees/${id}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getEmployeeByCode(code: string): Promise<Employee> {
    try {
      const response = await apiClient.get(`/employees/code/${code}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async createEmployee(data: CreateEmployeeRequest): Promise<Employee> {
    try {
      const response = await apiClient.post('/employees', data);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async updateEmployee(id: string, data: UpdateEmployeeRequest): Promise<Employee> {
    try {
      const response = await apiClient.patch(`/employees/${id}`, data);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async deleteEmployee(id: string): Promise<void> {
    try {
      await apiClient.delete(`/employees/${id}`);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async generateEmployeeCode(): Promise<string> {
    try {
      const response = await apiClient.post('/employees/generate-code', {});
      return (response.data as { employeeCode: string }).employeeCode;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  private handleError(error: unknown): Error {
    if (error instanceof Error) {
      const message = error.message;
      return new Error(message);
    }
    return new Error('An unexpected error occurred');
  }

  async exportToExcel(filters?: { search?: string }): Promise<void> {
    const token = localStorage.getItem('accessToken');
    const params = new URLSearchParams();
    if (filters?.search) params.append('search', filters.search);
    const url = `${API_BASE_URL}/employees/export/excel${params.toString() ? `?${params.toString()}` : ''}`;
    const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) throw new Error('Failed to export to Excel');
    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `danh-sach-nhan-vien-${Date.now()}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  }
}

export default new EmployeeService();
