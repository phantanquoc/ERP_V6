import apiClient from './apiClient';

interface Department {
  id: string;
  code: string;
  name: string;
  description?: string;
}

class DepartmentService {
   async getAllDepartments(): Promise<Department[]> {
    try {
       const response = await apiClient.get('/departments/public/all');
       return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getDepartmentById(id: string): Promise<Department> {
    try {
       const response = await apiClient.get(`/departments/${id}`);
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

export default new DepartmentService();

