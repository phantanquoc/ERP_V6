 import apiClient from './apiClient';
 
 const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

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
  async getAllInspections(month?: number, year?: number): Promise<InternalInspection[]> {
    try {
      const params: any = {};
      if (month) params.month = month;
      if (year) params.year = year;

       const response = await apiClient.get('/internal-inspections', {
        params,
      });
       return response.data || [];
    } catch (error) {
      console.error('Error fetching inspections:', error);
      throw error;
    }
  }

  async getInspectionById(id: string): Promise<InternalInspection> {
    try {
       const response = await apiClient.get(`/internal-inspections/${id}`);
       return response.data;
    } catch (error) {
      console.error('Error fetching inspection:', error);
      throw error;
    }
  }

  async createInspection(data: any): Promise<InternalInspection> {
    try {
       const response = await apiClient.post('/internal-inspections', data);
       return response.data;
    } catch (error) {
      console.error('Error creating inspection:', error);
      throw error;
    }
  }

  async updateInspection(id: string, data: any): Promise<InternalInspection> {
    try {
       const response = await apiClient.patch(`/internal-inspections/${id}`, data);
       return response.data;
    } catch (error) {
      console.error('Error updating inspection:', error);
      throw error;
    }
  }

  async deleteInspection(id: string): Promise<void> {
    try {
       await apiClient.delete(`/internal-inspections/${id}`);
    } catch (error) {
      console.error('Error deleting inspection:', error);
      throw error;
    }
  }

  async searchInspections(query: string): Promise<InternalInspection[]> {
    try {
       const response = await apiClient.get('/internal-inspections', {
        params: { search: query },
      });
       return response.data || [];
    } catch (error) {
      console.error('Error searching inspections:', error);
      throw error;
    }
  }

  async exportToExcel(): Promise<void> {
    const token = localStorage.getItem('accessToken');
     const url = `${API_BASE_URL}/internal-inspections/export/excel`;

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) throw new Error('Failed to export to Excel');

    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `kiem-tra-noi-bo-${Date.now()}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  }
}

export default new InternalInspectionService();

