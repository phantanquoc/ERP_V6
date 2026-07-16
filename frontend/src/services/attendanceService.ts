import apiClient from './apiClient';
import { downloadFile } from '../utils/downloadFile';
import { API_BASE_URL } from '../config/api';

export interface AttendanceRecord {
  stt: number;
  id: string;
  ids: string[];
  employeeCode: string;
  employeeName: string;
  positionName: string;
  departmentId: string | null;
  departmentName: string | null;
  attendanceDate: string;
  checkInTimes: string[];
  checkOutTimes: string[];
  workHours: number;
  status: 'PRESENT' | 'LATE' | 'ABSENT' | 'ON_LEAVE' | 'OVERTIME';
  notes: string | null;
}

export interface IndividualAttendanceRecord {
  stt: number;
  id: string;
  employeeCode?: string;
  employeeName?: string;
  positionName?: string;
  attendanceDate: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  workHours: number;
  status: 'PRESENT' | 'LATE' | 'ABSENT' | 'ON_LEAVE' | 'OVERTIME';
  isOvertime?: boolean;
  notes: string | null;
}

const toLocalIsoBoundary = (date: string, boundary: 'start' | 'end'): string => {
  const [year, month, day] = date.split('-').map(Number);
  const boundaryTime = boundary === 'start'
    ? [0, 0, 0, 0]
    : [23, 59, 59, 999];

  return new Date(
    year,
    (month || 1) - 1,
    day || 1,
    boundaryTime[0],
    boundaryTime[1],
    boundaryTime[2],
    boundaryTime[3]
  ).toISOString();
};

class AttendanceService {
  async getAttendanceByDateRange(startDate: string, endDate: string): Promise<AttendanceRecord[]> {
    try {
      const response = await apiClient.get('/attendances/date-range', {
        params: { startDate, endDate },
      });
      return response.data || [];
    } catch (error) {
      console.error('Error fetching attendance by date range:', error);
      throw error;
    }
  }

  async getEmployeeAttendance(employeeId: string, startDate: string, endDate: string): Promise<IndividualAttendanceRecord[]> {
    try {
      const response = await apiClient.get(`/attendances/employee/${employeeId}`, {
        params: {
          startDate: toLocalIsoBoundary(startDate, 'start'),
          endDate: toLocalIsoBoundary(endDate, 'end'),
        },
      });
      return response.data || [];
    } catch (error) {
      console.error('Error fetching employee attendance:', error);
      throw error;
    }
  }

  async checkIn(employeeId: string): Promise<any> {
    try {
      const response = await apiClient.post('/attendances/check-in', { employeeId });
      return response.data;
    } catch (error) {
      console.error('Error checking in:', error);
      throw error;
    }
  }

  async checkOut(employeeId: string): Promise<any> {
    try {
      const response = await apiClient.post('/attendances/check-out', { employeeId });
      return response.data;
    } catch (error) {
      console.error('Error checking out:', error);
      throw error;
    }
  }

  async overtimeCheckIn(employeeId: string): Promise<any> {
    try {
      const response = await apiClient.post('/attendances/overtime-check-in', { employeeId });
      return response.data;
    } catch (error) {
      console.error('Error overtime check-in:', error);
      throw error;
    }
  }

  async overtimeCheckOut(employeeId: string): Promise<any> {
    try {
      const response = await apiClient.post('/attendances/overtime-check-out', { employeeId });
      return response.data;
    } catch (error) {
      console.error('Error overtime check-out:', error);
      throw error;
    }
  }

  async getTodayAttendance(employeeId: string): Promise<IndividualAttendanceRecord | null> {
    try {
      const today = new Date();
      const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString();
      const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString();

      const response = await apiClient.get(`/attendances/employee/${employeeId}`, {
        params: {
          startDate: startOfDay,
          endDate: endOfDay,
        },
      });

      const records = response.data || [];
      return records.length > 0 ? records[0] : null;
    } catch (error) {
      console.error('Error fetching today attendance:', error);
      return null;
    }
  }

  async getTodayAttendances(employeeId: string): Promise<IndividualAttendanceRecord[]> {
    try {
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0).toISOString();
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999).toISOString();

      const response = await apiClient.get(`/attendances/employee/${employeeId}`, {
        params: {
          startDate: startOfDay,
          endDate: endOfDay,
        },
      });

      return response.data || [];
    } catch (error) {
      console.error('Error fetching today attendances:', error);
      return [];
    }
  }

  async createAttendance(data: {
    employeeId: string;
    attendanceDate: string;
    checkInTime?: string;
    checkOutTime?: string;
    status: string;
    notes?: string;
  }): Promise<any> {
    try {
      // Midnight UTC to match getTodayInAppTz() convention
      const attendanceDate = new Date(data.attendanceDate + 'T00:00:00.000Z');

      const response = await apiClient.post('/attendances', {
        employeeId: data.employeeId,
        attendanceDate: attendanceDate.toISOString(),
        checkInTime: data.checkInTime ? new Date(data.checkInTime).toISOString() : undefined,
        checkOutTime: data.checkOutTime ? new Date(data.checkOutTime).toISOString() : undefined,
        status: data.status,
        notes: data.notes,
      });
      return response.data;
    } catch (error) {
      console.error('Error creating attendance:', error);
      throw error;
    }
  }

  async updateAttendance(
    attendanceId: string,
    data: {
      checkInTime?: string;
      checkOutTime?: string;
      status?: string;
      notes?: string;
    }
  ): Promise<any> {
    try {
      const response = await apiClient.put(`/attendances/${attendanceId}`, {
        checkInTime: data.checkInTime ? new Date(data.checkInTime).toISOString() : undefined,
        checkOutTime: data.checkOutTime ? new Date(data.checkOutTime).toISOString() : undefined,
        status: data.status,
        notes: data.notes,
      });
      return response.data;
    } catch (error) {
      console.error('Error updating attendance:', error);
      throw error;
    }
  }

  async deleteAttendance(attendanceId: string): Promise<void> {
    try {
      await apiClient.delete(`/attendances/${attendanceId}`);
    } catch (error) {
      console.error('Error deleting attendance:', error);
      throw error;
    }
  }

  async exportToExcelCalendar(filters: {
    startDate?: string;
    endDate?: string;
    month?: number;
    year?: number;
    search?: string;
    departmentId?: string;
    positionId?: string;
  }): Promise<void> {
    const params = new URLSearchParams();
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    if (filters.month) params.append('month', filters.month.toString());
    if (filters.year) params.append('year', filters.year.toString());
    if (filters.search) params.append('search', filters.search);
    if (filters.departmentId) params.append('departmentId', filters.departmentId);
    if (filters.positionId) params.append('positionId', filters.positionId);
    const url = `${API_BASE_URL}/attendances/export/excel/calendar?${params.toString()}`;
    await downloadFile(url, `bang-cham-cong-${filters.year || ''}-${filters.month || ''}-${Date.now()}.xlsx`);
  }
}

export default new AttendanceService();
