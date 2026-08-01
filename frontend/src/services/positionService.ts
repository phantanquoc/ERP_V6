import apiClient from './apiClient';

export type PositionCategory = 'PRODUCTION' | 'OFFICE' | 'MANAGEMENT';

export const POSITION_CATEGORY_LABEL: Record<PositionCategory, string> = {
  PRODUCTION: 'Sản xuất',
  OFFICE: 'Văn phòng',
  MANAGEMENT: 'Quản lý',
};

export interface Position {
  id: string;
  code: string;
  name: string;
  description?: string;
  category?: PositionCategory;
  level?: string;
  createdAt?: string;
  updatedAt?: string;
  employees?: any[];
  responsibilities?: any[];
  _count?: {
    levels?: number;
    responsibilities?: number;
  };
}

class PositionService {
  async getAllPositions(): Promise<Position[]> {
    try {
      const response = await apiClient.get('/positions');
      return response.data as Position[];
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getPositionById(id: string): Promise<Position> {
    try {
      const response = await apiClient.get(`/positions/${id}`);
      return response.data as Position;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async createPosition(data: Omit<Position, 'id' | 'createdAt' | 'updatedAt'>): Promise<Position> {
    try {
      const response = await apiClient.post('/positions', data);
      return response.data as Position;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async updatePosition(id: string, data: Partial<Position>): Promise<Position> {
    try {
      const response = await apiClient.patch(`/positions/${id}`, data);
      return response.data as Position;
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

  async getPositionUsage(id: string): Promise<{ employeeCount: number; levelCount: number; responsibilityCount: number }> {
    try {
      const response = await apiClient.get(`/positions/${id}/usage`);
      return response.data as { employeeCount: number; levelCount: number; responsibilityCount: number };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async bulkUpdateCategory(positionIds: string[], category: string): Promise<{ count: number }> {
    try {
      const response = await apiClient.patch('/positions/bulk-category', { positionIds, category });
      return response.data as { count: number };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getAllPositionLevels(): Promise<any[]> {
    try {
      const response = await apiClient.get('/position-levels');
      return response.data as any[];
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getPositionLevelsByPosition(positionId: string): Promise<any[]> {
    try {
      const response = await apiClient.get(`/position-levels/${positionId}/levels`);
      return response.data as any[];
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

