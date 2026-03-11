import apiClient from './apiClient';

export interface PositionResponsibility {
  id: string;
  positionId: string;
  title: string;
  description: string;
  weight: number;
  createdAt?: string;
  updatedAt?: string;
}

class PositionResponsibilityService {
  private handleError(error: any): Error {
    if (error instanceof Error) {
      const message = error.message;
      return new Error(message);
    }
    return new Error('An unexpected error occurred');
  }

  async getAllResponsibilities(positionId: string): Promise<PositionResponsibility[]> {
    try {
      const response = await apiClient.get(`/position-responsibilities/${positionId}/responsibilities`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getResponsibilityById(id: string): Promise<PositionResponsibility> {
    try {
      const response = await apiClient.get(`/position-responsibilities/responsibility/${id}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async createResponsibility(
    positionId: string,
    data: Omit<PositionResponsibility, 'id' | 'positionId' | 'createdAt' | 'updatedAt'>
  ): Promise<PositionResponsibility> {
    try {
      const response = await apiClient.post(`/position-responsibilities/${positionId}/responsibilities`, data);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async updateResponsibility(
    id: string,
    data: Partial<PositionResponsibility>
  ): Promise<PositionResponsibility> {
    try {
      const response = await apiClient.patch(`/position-responsibilities/responsibility/${id}`, data);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async deleteResponsibility(id: string): Promise<void> {
    try {
      await apiClient.delete(`/position-responsibilities/responsibility/${id}`);
    } catch (error) {
      throw this.handleError(error);
    }
  }
}

export default new PositionResponsibilityService();

