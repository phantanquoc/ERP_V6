import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export interface AttendanceRecord {
  stt: number;
  id: string;
  employeeCode: string;
  employeeName: string;
  positionName: string;
  attendanceDate: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  workHours: number;
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EARLY' | 'ON_LEAVE';
  notes: string | null;
}

class AttendanceService {
  private apiUrl = `${API_BASE_URL}/attendances`;

  async getAttendanceByDateRange(startDate: string, endDate: string): Promise<AttendanceRecord[]> {
    try {
      const response = await axios.get(`${this.apiUrl}/date-range`, {
        params: {
          startDate: startDate,
          endDate: endDate,
        },
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });
      return response.data.data || [];
    } catch (error) {
      console.error('Error fetching attendance by date range:', error);
      throw error;
    }
  }

  async getEmployeeAttendance(employeeId: string, startDate: string, endDate: string): Promise<AttendanceRecord[]> {
    try {
      const response = await axios.get(`${this.apiUrl}/employee/${employeeId}`, {
        params: {
          startDate: new Date(startDate).toISOString(),
          endDate: new Date(endDate).toISOString(),
        },
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });
      return response.data.data || [];
    } catch (error) {
      console.error('Error fetching employee attendance:', error);
      throw error;
    }
  }

  async checkIn(employeeId: string): Promise<any> {
    try {
      const response = await axios.post(
        `${this.apiUrl}/check-in`,
        { employeeId },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
          },
        }
      );
      return response.data.data;
    } catch (error) {
      console.error('Error checking in:', error);
      throw error;
    }
  }

  async checkOut(employeeId: string): Promise<any> {
    try {
      const response = await axios.post(
        `${this.apiUrl}/check-out`,
        { employeeId },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
          },
        }
      );
      return response.data.data;
    } catch (error) {
      console.error('Error checking out:', error);
      throw error;
    }
  }

  async getTodayAttendance(employeeId: string): Promise<AttendanceRecord | null> {
    try {
      const today = new Date();
      const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString();
      const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString();

      const response = await axios.get(`${this.apiUrl}/employee/${employeeId}`, {
        params: {
          startDate: startOfDay,
          endDate: endOfDay,
        },
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });

      const records = response.data.data || [];
      return records.length > 0 ? records[0] : null;
    } catch (error) {
      console.error('Error fetching today attendance:', error);
      return null;
    }
  }

  async createAttendance(data: {
    employeeCode: string;
    attendanceDate: string;
    checkInTime?: string;
    checkOutTime?: string;
    status: string;
    notes?: string;
  }): Promise<AttendanceRecord> {
    try {
      // Create date at start of day in local timezone
      const attendanceDate = new Date(data.attendanceDate + 'T00:00:00');

      const response = await axios.post(
        this.apiUrl,
        {
          employeeId: data.employeeCode, // Will be resolved by backend
          attendanceDate: attendanceDate.toISOString(),
          checkInTime: data.checkInTime ? new Date(data.checkInTime).toISOString() : undefined,
          checkOutTime: data.checkOutTime ? new Date(data.checkOutTime).toISOString() : undefined,
          status: data.status,
          notes: data.notes,
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
          },
        }
      );
      return response.data.data;
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
  ): Promise<AttendanceRecord> {
    try {
      const response = await axios.put(
        `${this.apiUrl}/${attendanceId}`,
        {
          checkInTime: data.checkInTime ? new Date(data.checkInTime).toISOString() : undefined,
          checkOutTime: data.checkOutTime ? new Date(data.checkOutTime).toISOString() : undefined,
          status: data.status,
          notes: data.notes,
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
          },
        }
      );
      return response.data.data;
    } catch (error) {
      console.error('Error updating attendance:', error);
      throw error;
    }
  }

  async deleteAttendance(attendanceId: string): Promise<void> {
    try {
      await axios.delete(`${this.apiUrl}/${attendanceId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });
    } catch (error) {
      console.error('Error deleting attendance:', error);
      throw error;
    }
  }

  async exportToExcel(filters?: { search?: string }): Promise<void> {
    const token = localStorage.getItem('accessToken');
    const params = new URLSearchParams();
    if (filters?.search) params.append('search', filters.search);
    const url = `${API_BASE_URL}/attendances/export/excel${params.toString() ? `?${params.toString()}` : ''}`;
    const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) throw new Error('Failed to export to Excel');
    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `bang-cham-cong-${Date.now()}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  }
}

export default new AttendanceService();

