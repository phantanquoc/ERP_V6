import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

interface Department {
  id: string;
  code: string;
  name: string;
  description?: string;
}

class DepartmentService {
  private getAuthToken(): string {
    return localStorage.getItem('accessToken') || '';
  }

  private getHeaders() {
    return {
      'Authorization': `Bearer ${this.getAuthToken()}`,
      'Content-Type': 'application/json',
    };
  }

  async getAllDepartments(): Promise<Department[]> {
    try {
      const response = await axios.get(`${API_BASE_URL}/departments/public/all`);
      return response.data.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getDepartmentById(id: string): Promise<Department> {
    try {
      const response = await axios.get(`${API_BASE_URL}/departments/${id}`, {
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

export default new DepartmentService();

