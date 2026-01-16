import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

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
  private getAuthToken(): string {
    return localStorage.getItem('accessToken') || '';
  }

  private getHeaders() {
    return {
      'Authorization': `Bearer ${this.getAuthToken()}`,
      'Content-Type': 'application/json',
    };
  }

  async getAllLevelsByPosition(positionId: string): Promise<PositionLevel[]> {
    try {
      const response = await axios.get(`${API_BASE_URL}/position-levels/${positionId}/levels`, {
        headers: this.getHeaders(),
      });
      return response.data.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getLevelById(id: string): Promise<PositionLevel> {
    try {
      const response = await axios.get(`${API_BASE_URL}/position-levels/level/${id}`, {
        headers: this.getHeaders(),
      });
      return response.data.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async createLevel(positionId: string, data: Omit<PositionLevel, 'id' | 'positionId' | 'createdAt' | 'updatedAt'>): Promise<PositionLevel> {
    try {
      const response = await axios.post(`${API_BASE_URL}/position-levels/${positionId}/levels`, data, {
        headers: this.getHeaders(),
      });
      return response.data.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async updateLevel(id: string, data: Partial<PositionLevel>): Promise<PositionLevel> {
    try {
      const response = await axios.patch(`${API_BASE_URL}/position-levels/level/${id}`, data, {
        headers: this.getHeaders(),
      });
      return response.data.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async deleteLevel(id: string): Promise<void> {
    try {
      await axios.delete(`${API_BASE_URL}/position-levels/level/${id}`, {
        headers: this.getHeaders(),
      });
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

export default new PositionLevelService();

