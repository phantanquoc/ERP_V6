import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

export interface InternalInspection {
  id: string;
  stt: number;
  inspectionCode: string;
  inspectionDate: string;
  inspectionPlanCode: string;
  violationCode: string;
  violationContent: string;
  violationLevel: string;
  violationCategory: string;
  violationDescription: string;
  inspectedBy: string;
  inspectedByCode: string;
  verifiedBy1: string;
  verifiedBy1Code: string;
  verifiedBy2: string;
  verifiedBy2Code: string;
  status: string;
  notes?: string;
}

class InternalInspectionService {
  private getAuthHeader() {
    const token = localStorage.getItem('accessToken');
    return {
      Authorization: `Bearer ${token}`,
    };
  }

  async getAllInspections(month?: number, year?: number): Promise<InternalInspection[]> {
    try {
      const params: any = {};
      if (month) params.month = month;
      if (year) params.year = year;

      const response = await axios.get(`${API_BASE_URL}`, {
        params,
        headers: this.getAuthHeader(),
      });
      return response.data.data || [];
    } catch (error) {
      console.error('Error fetching inspections:', error);
      throw error;
    }
  }

  async getInspectionById(id: string): Promise<InternalInspection> {
    try {
      const response = await axios.get(`${API_BASE_URL}/${id}`, {
        headers: this.getAuthHeader(),
      });
      return response.data.data;
    } catch (error) {
      console.error('Error fetching inspection:', error);
      throw error;
    }
  }

  async createInspection(data: any): Promise<InternalInspection> {
    try {
      const response = await axios.post(`${API_BASE_URL}`, data, {
        headers: this.getAuthHeader(),
      });
      return response.data.data;
    } catch (error) {
      console.error('Error creating inspection:', error);
      throw error;
    }
  }

  async updateInspection(id: string, data: any): Promise<InternalInspection> {
    try {
      const response = await axios.patch(`${API_BASE_URL}/${id}`, data, {
        headers: this.getAuthHeader(),
      });
      return response.data.data;
    } catch (error) {
      console.error('Error updating inspection:', error);
      throw error;
    }
  }

  async deleteInspection(id: string): Promise<void> {
    try {
      await axios.delete(`${API_BASE_URL}/${id}`, {
        headers: this.getAuthHeader(),
      });
    } catch (error) {
      console.error('Error deleting inspection:', error);
      throw error;
    }
  }

  async searchInspections(query: string): Promise<InternalInspection[]> {
    try {
      const response = await axios.get(`${API_BASE_URL}`, {
        params: { search: query },
        headers: this.getAuthHeader(),
      });
      return response.data.data || [];
    } catch (error) {
      console.error('Error searching inspections:', error);
      throw error;
    }
  }
}

export default new InternalInspectionService();

