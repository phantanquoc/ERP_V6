import apiClient from './apiClient';

export interface Holiday {
  id: string;
  name: string;
  date: string;
  note?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateHolidayData {
  name: string;
  date: string;
  note?: string;
}

export interface UpdateHolidayData {
  name?: string;
  date?: string;
  note?: string;
}

class HolidayService {
  async list(year?: number): Promise<Holiday[]> {
    const params = year ? { year } : undefined;
    const response = await apiClient.get('/holidays', { params });
    return response.data;
  }

  async create(data: CreateHolidayData): Promise<Holiday> {
    const response = await apiClient.post('/holidays', data);
    return response.data;
  }

  async update(id: string, data: UpdateHolidayData): Promise<Holiday> {
    const response = await apiClient.put(`/holidays/${id}`, data);
    return response.data;
  }

  async delete(id: string): Promise<void> {
    await apiClient.delete(`/holidays/${id}`);
  }
}

export default new HolidayService();
