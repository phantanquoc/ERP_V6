import apiClient from './apiClient';

export interface LeaveRequest {
  id: string;
  code: string;
  employeeId: string;
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
    subDepartment?: {
      name: string;
    };
  };
  leaveType: 'ANNUAL' | 'SICK' | 'PERSONAL' | 'MATERNITY' | 'EMERGENCY' | 'COMPENSATORY';
  startDate: string;
  endDate: string;
  startTime?: string;
  endTime?: string;
  isHalfDay: boolean;
  halfDayPeriod?: 'MORNING' | 'AFTERNOON';
  reason: string;
  attachments: string[];
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLeaveRequestData {
  employeeId: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  startTime?: string;
  endTime?: string;
  isHalfDay: boolean;
  halfDayPeriod?: string;
  reason: string;
  attachments?: string[];
}

class LeaveRequestService {
  private baseURL = '/leave-requests';

  async createLeaveRequest(data: CreateLeaveRequestData): Promise<LeaveRequest> {
    const response = await apiClient.post(this.baseURL, data);
    return response.data.data;
  }

  async getAllLeaveRequests(params?: {
    page?: number;
    limit?: number;
    status?: string;
    employeeId?: string;
    leaveType?: string;
  }): Promise<{
    data: LeaveRequest[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const response = await apiClient.get<any>(this.baseURL, { params });

    if (Array.isArray(response.data)) {
      return {
        data: response.data,
        pagination: response.pagination || { page: 1, limit: 10, total: 0, totalPages: 0 },
      };
    } else if (response.data && typeof response.data === 'object') {
      return {
        data: response.data.data || [],
        pagination: response.data.pagination || { page: 1, limit: 10, total: 0, totalPages: 0 },
      };
    }

    return {
      data: [],
      pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
    };
  }

  async getLeaveRequestById(id: string): Promise<LeaveRequest> {
    const response = await apiClient.get(`${this.baseURL}/${id}`);
    return response.data.data;
  }

  async approveLeaveRequest(id: string, approvedBy: string): Promise<LeaveRequest> {
    const response = await apiClient.patch(`${this.baseURL}/${id}/approve`, { approvedBy });
    return response.data.data;
  }

  async rejectLeaveRequest(id: string, approvedBy: string, rejectionReason: string): Promise<LeaveRequest> {
    const response = await apiClient.patch(`${this.baseURL}/${id}/reject`, {
      approvedBy,
      rejectionReason,
    });
    return response.data.data;
  }

  async exportToExcel(filters?: { status?: string; employeeId?: string; leaveType?: string }): Promise<void> {
    const token = localStorage.getItem('accessToken');
    const params = new URLSearchParams();

    if (filters?.status) params.append('status', filters.status);
    if (filters?.employeeId) params.append('employeeId', filters.employeeId);
    if (filters?.leaveType) params.append('leaveType', filters.leaveType);

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    const url = `${API_URL}${this.baseURL}/export/excel${params.toString() ? `?${params.toString()}` : ''}`;

    console.log('📤 Exporting to:', url);

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    console.log('📥 Response status:', response.status);

    if (!response.ok) {
      throw new Error('Failed to export to Excel');
    }

    const blob = await response.blob();
    console.log('📦 Blob size:', blob.size, 'type:', blob.type);

    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `danh-sach-don-nghi-phep-${Date.now()}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  }
}

export default new LeaveRequestService();

