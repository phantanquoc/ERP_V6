import apiClient from './apiClient';

interface SubDepartment {
  id: string;
  code: string;
  name: string;
  description?: string;
  departmentId?: string;
  department?: {
    id: string;
    code: string;
    name: string;
  };
}

class SubDepartmentService {
  async getAllSubDepartments(): Promise<SubDepartment[]> {
    try {
      const response = await apiClient.get('/sub-departments/public/all');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  private handleError(error: unknown): Error {
    if (error instanceof Error) {
      return new Error(error.message);
    }
    return new Error('An unexpected error occurred');
  }
}

export default new SubDepartmentService();
