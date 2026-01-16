import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export interface FileAttachment {
  fileName: string;
  fileUrl: string;
  fileSize?: number;
  uploadedAt?: string;
}

export interface DailyWorkReport {
  id: string;
  employeeId: string;
  reportDate: string;
  workDescription: string;
  achievements?: string;
  challenges?: string;
  planForNextDay?: string;
  workHours?: number;
  status: 'DRAFT' | 'SUBMITTED' | 'REVIEWED' | 'APPROVED' | 'REJECTED';
  supervisorComment?: string;
  supervisorId?: string;
  reviewedAt?: string;
  attachments?: string | FileAttachment[];
  createdAt: string;
  updatedAt: string;
  employee?: {
    id: string;
    employeeCode: string;
    user: {
      firstName: string;
      lastName: string;
      email: string;
    };
    position: {
      name: string;
    };
  };
}

export interface CreateDailyWorkReportRequest {
  reportDate: string;
  workDescription: string;
  achievements?: string;
  challenges?: string;
  planForNextDay?: string;
  workHours?: number;
  status?: string;
  attachments?: string;
}

export interface UpdateDailyWorkReportRequest {
  reportDate?: string;
  workDescription?: string;
  achievements?: string;
  challenges?: string;
  planForNextDay?: string;
  workHours?: number;
  status?: string;
  attachments?: string;
}

export interface ReportStatistics {
  month: number;
  year: number;
  totalReports: number;
  submittedReports: number;
  reviewedReports: number;
  approvedReports: number;
  rejectedReports: number;
  totalWorkHours: number;
  averageWorkHours: number;
}

class DailyWorkReportService {
  private getAuthToken(): string {
    return localStorage.getItem('accessToken') || '';
  }

  private getHeaders() {
    return {
      'Authorization': `Bearer ${this.getAuthToken()}`,
      'Content-Type': 'application/json',
    };
  }

  async getMyReports(page: number = 1, limit: number = 10): Promise<any> {
    try {
      const response = await axios.get(`${API_BASE_URL}/daily-work-reports/my-reports`, {
        params: { page, limit },
        headers: this.getHeaders(),
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Không thể tải báo cáo');
    }
  }

  async getMyStatistics(month?: number, year?: number): Promise<ReportStatistics> {
    try {
      const response = await axios.get(`${API_BASE_URL}/daily-work-reports/my-statistics`, {
        params: { month, year },
        headers: this.getHeaders(),
      });
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Không thể tải thống kê');
    }
  }

  async getReportById(id: string): Promise<DailyWorkReport> {
    try {
      const response = await axios.get(`${API_BASE_URL}/daily-work-reports/${id}`, {
        headers: this.getHeaders(),
      });
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Không thể tải báo cáo');
    }
  }

  async createReport(data: CreateDailyWorkReportRequest): Promise<DailyWorkReport> {
    try {
      const response = await axios.post(`${API_BASE_URL}/daily-work-reports`, data, {
        headers: this.getHeaders(),
      });
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Không thể tạo báo cáo');
    }
  }

  async updateReport(id: string, data: UpdateDailyWorkReportRequest): Promise<DailyWorkReport> {
    try {
      const response = await axios.patch(`${API_BASE_URL}/daily-work-reports/${id}`, data, {
        headers: this.getHeaders(),
      });
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Không thể cập nhật báo cáo');
    }
  }

  async deleteReport(id: string): Promise<void> {
    try {
      await axios.delete(`${API_BASE_URL}/daily-work-reports/${id}`, {
        headers: this.getHeaders(),
      });
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Không thể xóa báo cáo');
    }
  }
}

export default new DailyWorkReportService();

