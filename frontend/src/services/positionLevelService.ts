import apiClient from './apiClient';

export interface PositionLevel {
  id: string;
  positionId: string;
  level: string;
  baseSalary: number;
  kpiSalary: number;
  createdAt?: string;
  updatedAt?: string;
  position?: any;
}

class PositionLevelService {
  async getAllLevelsByPosition(positionId: string): Promise<PositionLevel[]> {
    try {
      const response = await apiClient.get(`/position-levels/${positionId}/levels`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getLevelById(id: string): Promise<PositionLevel> {
    try {
      const response = await apiClient.get(`/position-levels/level/${id}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async createLevel(positionId: string, data: Omit<PositionLevel, 'id' | 'positionId' | 'createdAt' | 'updatedAt'>): Promise<PositionLevel> {
    try {
      const response = await apiClient.post(`/position-levels/${positionId}/levels`, data);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async updateLevel(id: string, data: Partial<PositionLevel>): Promise<PositionLevel> {
    try {
      const response = await apiClient.patch(`/position-levels/level/${id}`, data);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async deleteLevel(id: string): Promise<void> {
    try {
      await apiClient.delete(`/position-levels/level/${id}`);
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

export default new PositionLevelService();

