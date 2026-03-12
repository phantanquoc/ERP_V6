import apiClient from './apiClient';

interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface Employee {
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
  };
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
  async getAllEmployees(page: number = 1, limit: number = 10): Promise<PaginatedResponse<Employee>> {
    try {
      const response = await apiClient.get('/employees', { params: { page, limit } });
      return response;
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
      return response.data.employeeCode;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  private handleError(error: any): Error {
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
    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
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

