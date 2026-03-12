import apiClient from './apiClient';

export interface WorkShift {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  isActive: boolean;
}

class WorkShiftService {
  async getAll(): Promise<WorkShift[]> {
    try {
      const response = await apiClient.get('/work-shifts');
      return response.data || [];
    } catch (error) {
      console.error('Error fetching work shifts:', error);
      throw error;
    }
  }

  async create(data: { name: string; startTime: string; endTime: string }): Promise<WorkShift> {
    try {
      const response = await apiClient.post('/work-shifts', data);
      return response.data;
    } catch (error) {
      console.error('Error creating work shift:', error);
      throw error;
    }
  }

  async update(id: string, data: Partial<WorkShift>): Promise<WorkShift> {
    try {
      const response = await apiClient.put(`/work-shifts/${id}`, data);
      return response.data;
    } catch (error) {
      console.error('Error updating work shift:', error);
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await apiClient.delete(`/work-shifts/${id}`);
    } catch (error) {
      console.error('Error deleting work shift:', error);
      throw error;
    }
  }
}

export default new WorkShiftService();

