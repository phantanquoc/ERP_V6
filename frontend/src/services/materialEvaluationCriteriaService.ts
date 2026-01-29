/**
 * Service for interacting with the MaterialEvaluationCriteria API
 * Handles CRUD operations for material evaluation criteria
 */

import apiClient from './apiClient';

export interface MaterialEvaluationCriteria {
  id: string;
  code: number;
  description: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCriteriaData {
  code: number;
  description: string;
}

class MaterialEvaluationCriteriaService {
  private readonly basePath = '/material-evaluation-criteria';

  /**
   * Get all material evaluation criteria
   */
  async getAllCriteria(): Promise<MaterialEvaluationCriteria[]> {
    const response = await apiClient.get<MaterialEvaluationCriteria[]>(this.basePath);
    return response.data || [];
  }

  /**
   * Get a single criteria by ID
   */
  async getCriteriaById(id: string): Promise<MaterialEvaluationCriteria> {
    const response = await apiClient.get<MaterialEvaluationCriteria>(`${this.basePath}/${id}`);
    if (!response.data) {
      throw new Error('Criteria not found');
    }
    return response.data;
  }

  /**
   * Create a new criteria
   */
  async createCriteria(data: CreateCriteriaData): Promise<MaterialEvaluationCriteria> {
    const response = await apiClient.post<MaterialEvaluationCriteria>(this.basePath, data);
    if (!response.data) {
      throw new Error('Failed to create criteria');
    }
    return response.data;
  }

  /**
   * Update an existing criteria
   */
  async updateCriteria(id: string, data: Partial<MaterialEvaluationCriteria>): Promise<MaterialEvaluationCriteria> {
    const response = await apiClient.put<MaterialEvaluationCriteria>(`${this.basePath}/${id}`, data);
    if (!response.data) {
      throw new Error('Failed to update criteria');
    }
    return response.data;
  }

  /**
   * Delete a criteria
   */
  async deleteCriteria(id: string): Promise<void> {
    await apiClient.delete(`${this.basePath}/${id}`);
  }

  /**
   * Seed default criteria
   */
  async seedDefaultCriteria(): Promise<MaterialEvaluationCriteria[]> {
    const response = await apiClient.post<MaterialEvaluationCriteria[]>(`${this.basePath}/seed`);
    return response.data || [];
  }
}

export default new MaterialEvaluationCriteriaService();

