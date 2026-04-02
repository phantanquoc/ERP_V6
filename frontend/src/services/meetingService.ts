/**
 * Meeting Service — CRUD operations for Meeting entity
 */
import apiClient from './apiClient';

// ─── Types ───────────────────────────────────────────────────────────────────

export type MeetingStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export interface MeetingParticipant {
  id: string;
  meetingId: string;
  employeeId: string;
  isConfirmed: boolean;
  employee: {
    id: string;
    employeeCode: string;
    user: { firstName: string; lastName: string; email: string };
    subDepartment?: { name: string };
  };
}

export interface Meeting {
  id: string;
  title: string;
  agenda?: string;
  meetingDate: string;
  startTime: string;
  endTime: string;
  room?: string;
  notes?: string;
  status: MeetingStatus;
  departmentId?: string;
  department?: { id: string; name: string };
  createdBy: string;
  creator?: { firstName: string; lastName: string };
  participants: MeetingParticipant[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateMeetingData {
  title: string;
  agenda?: string;
  meetingDate: string;
  startTime: string;
  endTime: string;
  room?: string;
  notes?: string;
  departmentId?: string;
  participantIds: string[];
}

export interface GetMeetingsParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  departmentId?: string;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const unwrap = <T>(response: any): T => {
  const d = response?.data;
  if (d?.data !== undefined) return d.data as T;
  if (Array.isArray(d)) return d as T;
  return d as T;
};

const unwrapPaginated = (response: any) => {
  const d = response?.data || {};
  return {
    data: Array.isArray(d.data) ? d.data : [],
    pagination: d.pagination || { page: 1, limit: 10, total: 0, totalPages: 0 },
  };
};

// ─── Service ─────────────────────────────────────────────────────────────────

export const meetingService = {
  /**
   * Get all meetings (admin / department head)
   */
  getAll: async (params: GetMeetingsParams = {}): Promise<{ data: Meeting[]; pagination: Pagination }> => {
    const response = await apiClient.get('/meetings', { params });
    return unwrapPaginated(response);
  },

  /**
   * Get meetings for current user (as creator or participant)
   */
  getMy: async (params: GetMeetingsParams = {}): Promise<{ data: Meeting[]; pagination: Pagination }> => {
    const response = await apiClient.get('/meetings/my', { params });
    return unwrapPaginated(response);
  },

  /**
   * Get today's meetings
   */
  getToday: async (params: GetMeetingsParams = {}): Promise<{ data: Meeting[]; pagination: Pagination }> => {
    const today = new Date().toISOString().split('T')[0];
    const response = await apiClient.get('/meetings/today', { params: { ...params, dateFrom: today, dateTo: today } });
    return unwrapPaginated(response);
  },

  /**
   * Get this week's meetings (Mon–Sun)
   */
  getThisWeek: async (params: GetMeetingsParams = {}): Promise<{ data: Meeting[]; pagination: Pagination }> => {
    const now = new Date();
    const day = now.getDay(); // 0=Sun
    const monday = new Date(now);
    monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    const response = await apiClient.get('/meetings/week', {
      params: {
        ...params,
        dateFrom: monday.toISOString().split('T')[0],
        dateTo: sunday.toISOString().split('T')[0],
      },
    });
    return unwrapPaginated(response);
  },

  /**
   * Get single meeting by ID
   */
  getById: async (id: string): Promise<Meeting> => {
    const response = await apiClient.get(`/meetings/${id}`);
    return unwrap(response);
  },

  /**
   * Create a new meeting
   */
  create: async (data: CreateMeetingData): Promise<Meeting> => {
    const response = await apiClient.post('/meetings', data);
    return unwrap(response);
  },

  /**
   * Update an existing meeting
   */
  update: async (id: string, data: Partial<CreateMeetingData>): Promise<Meeting> => {
    const response = await apiClient.put(`/meetings/${id}`, data);
    return unwrap(response);
  },

  /**
   * Delete a meeting
   */
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/meetings/${id}`);
  },

  /**
   * Confirm or decline meeting participation
   */
  confirm: async (id: string, isConfirmed: boolean): Promise<Meeting> => {
    const response = await apiClient.patch(`/meetings/${id}/confirm`, { isConfirmed });
    return unwrap(response);
  },

  /**
   * Update meeting status (e.g. mark COMPLETED or CANCELLED)
   */
  updateStatus: async (id: string, status: MeetingStatus): Promise<Meeting> => {
    const response = await apiClient.patch(`/meetings/${id}/status`, { status });
    return unwrap(response);
  },
};

export default meetingService;
