import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

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
  private getAuthToken(): string {
    return localStorage.getItem('accessToken') || '';
  }

  private getHeaders() {
    return {
      'Authorization': `Bearer ${this.getAuthToken()}`,
      'Content-Type': 'application/json',
    };
  }

  private handleError(error: any): Error {
    if (axios.isAxiosError(error)) {
      const message = error.response?.data?.message || error.message;
      return new Error(message);
    }
    return new Error('An unexpected error occurred');
  }

  async getAllResponsibilities(positionId: string): Promise<PositionResponsibility[]> {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/position-responsibilities/${positionId}/responsibilities`,
        { headers: this.getHeaders() }
      );
      return response.data.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getResponsibilityById(id: string): Promise<PositionResponsibility> {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/position-responsibilities/responsibility/${id}`,
        { headers: this.getHeaders() }
      );
      return response.data.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async createResponsibility(
    positionId: string,
    data: Omit<PositionResponsibility, 'id' | 'positionId' | 'createdAt' | 'updatedAt'>
  ): Promise<PositionResponsibility> {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/position-responsibilities/${positionId}/responsibilities`,
        data,
        { headers: this.getHeaders() }
      );
      return response.data.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async updateResponsibility(
    id: string,
    data: Partial<PositionResponsibility>
  ): Promise<PositionResponsibility> {
    try {
      const response = await axios.patch(
        `${API_BASE_URL}/position-responsibilities/responsibility/${id}`,
        data,
        { headers: this.getHeaders() }
      );
      return response.data.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async deleteResponsibility(id: string): Promise<void> {
    try {
      await axios.delete(
        `${API_BASE_URL}/position-responsibilities/responsibility/${id}`,
        { headers: this.getHeaders() }
      );
    } catch (error) {
      throw this.handleError(error);
    }
  }
}

export default new PositionResponsibilityService();

