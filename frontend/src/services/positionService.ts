import apiClient from './apiClient';

export interface Position {
  id: string;
  code: string;
  name: string;
  description?: string;
  level?: string;
  createdAt?: string;
  updatedAt?: string;
  employees?: any[];
  responsibilities?: any[];
}

class PositionService {
  async getAllPositions(): Promise<Position[]> {
    try {
      const response = await apiClient.get('/positions');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getPositionById(id: string): Promise<Position> {
    try {
      const response = await apiClient.get(`/positions/${id}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async createPosition(data: Omit<Position, 'id' | 'createdAt' | 'updatedAt'>): Promise<Position> {
    try {
      const response = await apiClient.post('/positions', data);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async updatePosition(id: string, data: Partial<Position>): Promise<Position> {
    try {
      const response = await apiClient.patch(`/positions/${id}`, data);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async deletePosition(id: string): Promise<void> {
    try {
      await apiClient.delete(`/positions/${id}`);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getAllPositionLevels(): Promise<any[]> {
    try {
      const response = await apiClient.get('/position-levels');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getPositionLevelsByPosition(positionId: string): Promise<any[]> {
    try {
      const response = await apiClient.get(`/position-levels/${positionId}/levels`);
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

export default new PositionService();

