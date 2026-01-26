import axios from 'axios';
import { User as UserType } from '../types/auth';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface CreateUserRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: string;
  departmentId?: string | null;
  subDepartmentId?: string | null;
}

interface UpdateUserRequest {
  firstName?: string;
  lastName?: string;
  role?: string;
  isActive?: boolean;
  departmentId?: string | null;
  subDepartmentId?: string | null;
}

interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

interface UpdateProfileRequest {
  firstName?: string;
  lastName?: string;
  email?: string;
  phoneNumber?: string;
  bankAccount?: string;
  lockerNumber?: string;
  gender?: string;
  weight?: number;
  height?: number;
  shirtSize?: string;
  pantSize?: string;
  shoeSize?: string;
}

class UserService {
  private getAuthToken(): string {
    return localStorage.getItem('accessToken') || '';
  }

  private getHeaders() {
    return {
      'Authorization': `Bearer ${this.getAuthToken()}`,
      'Content-Type': 'application/json',
    };
  }

  async getAllUsers(page: number = 1, limit: number = 10): Promise<PaginatedResponse<any>> {
    try {
      const response = await axios.get(`${API_BASE_URL}/users`, {
        params: { page, limit },
        headers: this.getHeaders(),
      });
      return response.data.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getUserById(id: string): Promise<any> {
    try {
      const response = await axios.get(`${API_BASE_URL}/users/${id}`, {
        headers: this.getHeaders(),
      });
      return response.data.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async createUser(data: CreateUserRequest): Promise<any> {
    try {
      const response = await axios.post(`${API_BASE_URL}/users`, data, {
        headers: this.getHeaders(),
      });
      return response.data.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async updateUser(id: string, data: UpdateUserRequest): Promise<any> {
    try {
      const response = await axios.patch(`${API_BASE_URL}/users/${id}`, data, {
        headers: this.getHeaders(),
      });
      return response.data.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async deleteUser(id: string): Promise<void> {
    try {
      await axios.delete(`${API_BASE_URL}/users/${id}`, {
        headers: this.getHeaders(),
      });
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async changePassword(data: ChangePasswordRequest): Promise<void> {
    try {
      await axios.post(`${API_BASE_URL}/users/change-password`, data, {
        headers: this.getHeaders(),
      });
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async updateProfile(data: UpdateProfileRequest): Promise<any> {
    try {
      const response = await axios.patch(`${API_BASE_URL}/users/profile`, data, {
        headers: this.getHeaders(),
      });
      return response.data.data;
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

export default new UserService();

