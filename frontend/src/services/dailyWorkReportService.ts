 import apiClient from './apiClient';

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
  files?: File[];
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
  files?: File[];
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
  async getMyReports(page: number = 1, limit: number = 10): Promise<any> {
    try {
       const response = await apiClient.get('/daily-work-reports/my-reports', {
        params: { page, limit },
      });
       return response;
    } catch (error: any) {
       throw new Error(error instanceof Error ? error.message : 'Không thể tải báo cáo');
    }
  }

  async getMyStatistics(month?: number, year?: number): Promise<ReportStatistics> {
    try {
       const response = await apiClient.get('/daily-work-reports/my-statistics', {
        params: { month, year },
      });
       return response.data;
    } catch (error: any) {
       throw new Error(error instanceof Error ? error.message : 'Không thể tải thống kê');
    }
  }

  async getReportById(id: string): Promise<DailyWorkReport> {
    try {
       const response = await apiClient.get(`/daily-work-reports/${id}`);
       return response.data;
    } catch (error: any) {
       throw new Error(error instanceof Error ? error.message : 'Không thể tải báo cáo');
    }
  }

  async createReport(data: CreateDailyWorkReportRequest): Promise<DailyWorkReport> {
    try {
      const formData = new FormData();
      formData.append('reportDate', data.reportDate);
      formData.append('workDescription', data.workDescription);
      if (data.achievements) formData.append('achievements', data.achievements);
      if (data.challenges) formData.append('challenges', data.challenges);
      if (data.planForNextDay) formData.append('planForNextDay', data.planForNextDay);
      if (data.workHours !== undefined) formData.append('workHours', data.workHours.toString());
      if (data.status) formData.append('status', data.status);
      if (data.files && data.files.length > 0) {
        data.files.forEach(file => {
          formData.append('files', file);
        });
      }

       const response = await apiClient.post('/daily-work-reports', formData);
       return response.data;
    } catch (error: any) {
       throw new Error(error instanceof Error ? error.message : 'Không thể tạo báo cáo');
    }
  }

  async updateReport(id: string, data: UpdateDailyWorkReportRequest): Promise<DailyWorkReport> {
    try {
      const formData = new FormData();
      if (data.reportDate) formData.append('reportDate', data.reportDate);
      if (data.workDescription) formData.append('workDescription', data.workDescription);
      if (data.achievements !== undefined) formData.append('achievements', data.achievements);
      if (data.challenges !== undefined) formData.append('challenges', data.challenges);
      if (data.planForNextDay !== undefined) formData.append('planForNextDay', data.planForNextDay);
      if (data.workHours !== undefined) formData.append('workHours', data.workHours.toString());
      if (data.status) formData.append('status', data.status);
      if (data.files && data.files.length > 0) {
        data.files.forEach(file => {
          formData.append('files', file);
        });
      }

       const response = await apiClient.patch(`/daily-work-reports/${id}`, formData);
       return response.data;
    } catch (error: any) {
       throw new Error(error instanceof Error ? error.message : 'Không thể cập nhật báo cáo');
    }
  }

  async deleteReport(id: string): Promise<void> {
    try {
       await apiClient.delete(`/daily-work-reports/${id}`);
    } catch (error: any) {
       throw new Error(error instanceof Error ? error.message : 'Không thể xóa báo cáo');
    }
  }
}

export default new DailyWorkReportService();

