import apiClient from './apiClient';
import { User as UserType } from '../types/auth';

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
   async getAllUsers(page: number = 1, limit: number = 10): Promise<PaginatedResponse<any>> {
    try {
       const response = await apiClient.get('/users', { params: { page, limit } });
       return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getUserById(id: string): Promise<any> {
    try {
       const response = await apiClient.get(`/users/${id}`);
       return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async createUser(data: CreateUserRequest): Promise<any> {
    try {
       const response = await apiClient.post('/users', data);
       return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async updateUser(id: string, data: UpdateUserRequest): Promise<any> {
    try {
       const response = await apiClient.patch(`/users/${id}`, data);
       return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async deleteUser(id: string): Promise<void> {
    try {
       await apiClient.delete(`/users/${id}`);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async changePassword(data: ChangePasswordRequest): Promise<void> {
    try {
       await apiClient.post('/users/change-password', data);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async updateProfile(data: UpdateProfileRequest): Promise<any> {
    try {
       const response = await apiClient.patch('/users/profile', data);
       return response.data;
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
}

export default new UserService();

