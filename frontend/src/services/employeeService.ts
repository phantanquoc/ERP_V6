import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

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
  positionId: string;
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
  private getAuthToken(): string {
    return localStorage.getItem('accessToken') || '';
  }

  private getHeaders() {
    return {
      'Authorization': `Bearer ${this.getAuthToken()}`,
      'Content-Type': 'application/json',
    };
  }

  async getAllEmployees(page: number = 1, limit: number = 10): Promise<PaginatedResponse<Employee>> {
    try {
      const response = await axios.get(`${API_BASE_URL}/employees`, {
        params: { page, limit },
        headers: this.getHeaders(),
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getEmployeeById(id: string): Promise<Employee> {
    try {
      const response = await axios.get(`${API_BASE_URL}/employees/${id}`, {
        headers: this.getHeaders(),
      });
      return response.data.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getEmployeeByCode(code: string): Promise<Employee> {
    try {
      const response = await axios.get(`${API_BASE_URL}/employees/code/${code}`, {
        headers: this.getHeaders(),
      });
      return response.data.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async createEmployee(data: CreateEmployeeRequest): Promise<Employee> {
    try {
      const response = await axios.post(`${API_BASE_URL}/employees`, data, {
        headers: this.getHeaders(),
      });
      return response.data.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async updateEmployee(id: string, data: UpdateEmployeeRequest): Promise<Employee> {
    try {
      const response = await axios.patch(`${API_BASE_URL}/employees/${id}`, data, {
        headers: this.getHeaders(),
      });
      return response.data.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async deleteEmployee(id: string): Promise<void> {
    try {
      await axios.delete(`${API_BASE_URL}/employees/${id}`, {
        headers: this.getHeaders(),
      });
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async generateEmployeeCode(): Promise<string> {
    try {
      const response = await axios.post(`${API_BASE_URL}/employees/generate-code`,
        {},
        {
          headers: this.getHeaders(),
        }
      );
      return response.data.data.employeeCode;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  private handleError(error: any): Error {
    if (axios.isAxiosError(error)) {
      const message = error.response?.data?.message || error.message;
      return new Error(message);
    }
    return new Error('An unexpected error occurred');
  }
}

export default new EmployeeService();

