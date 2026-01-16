import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

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
  private getAuthToken(): string {
    return localStorage.getItem('accessToken') || '';
  }

  private getHeaders() {
    return {
      'Authorization': `Bearer ${this.getAuthToken()}`,
      'Content-Type': 'application/json',
    };
  }

  async getAllPositions(): Promise<Position[]> {
    try {
      const response = await axios.get(`${API_BASE_URL}/positions`, {
        headers: this.getHeaders(),
      });
      return response.data.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getPositionById(id: string): Promise<Position> {
    try {
      const response = await axios.get(`${API_BASE_URL}/positions/${id}`, {
        headers: this.getHeaders(),
      });
      return response.data.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async createPosition(data: Omit<Position, 'id' | 'createdAt' | 'updatedAt'>): Promise<Position> {
    try {
      const response = await axios.post(`${API_BASE_URL}/positions`, data, {
        headers: this.getHeaders(),
      });
      return response.data.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async updatePosition(id: string, data: Partial<Position>): Promise<Position> {
    try {
      const response = await axios.patch(`${API_BASE_URL}/positions/${id}`, data, {
        headers: this.getHeaders(),
      });
      return response.data.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async deletePosition(id: string): Promise<void> {
    try {
      await axios.delete(`${API_BASE_URL}/positions/${id}`, {
        headers: this.getHeaders(),
      });
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getAllPositionLevels(): Promise<any[]> {
    try {
      const response = await axios.get(`${API_BASE_URL}/position-levels`, {
        headers: this.getHeaders(),
      });
      return response.data.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getPositionLevelsByPosition(positionId: string): Promise<any[]> {
    try {
      const response = await axios.get(`${API_BASE_URL}/position-levels/${positionId}/levels`, {
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

export default new PositionService();

