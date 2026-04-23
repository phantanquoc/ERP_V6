import apiClient from './apiClient';

const BASE = '/face-attendance';

/** Shape returned by GET /api/face-attendance/profiles */
export interface EmployeeFaceProfile {
  employeeId: string;
  employeeCode: string;
  fullName: string;
  email: string;
  faceProfile: {
    id: string;
    isActive: boolean;
    enrolledAt: string;
    imageCount: number;
  } | null;
}

export interface FaceAttendanceLog {
  id: string;
  employeeId: string;
  action: 'CHECK_IN' | 'CHECK_OUT' | 'FAILED' | 'ALREADY_RECORDED';
  confidence: number | null;
  timestamp: string;
  ipAddress: string | null;
  employee?: { fullName: string; employeeCode: string };
}

export interface AttendanceDevice {
  id: string;
  name: string;
  location: string | null;
  isActive: boolean;
  apiKey: string;
  createdAt: string;
}

export interface VerifyResult {
  action: 'CHECK_IN' | 'CHECK_OUT' | 'ALREADY_RECORDED' | 'NO_MATCH';
  employee?: { fullName: string; employeeCode: string; department?: { name: string } };
  confidence?: number;
  message: string;
}

const faceAttendanceService = {
  /** Returns all employees with their face profile status */
  listProfiles: () =>
    apiClient.get<EmployeeFaceProfile[]>(`${BASE}/profiles`),

  enrollFace: (employeeId: string, images: string[]) =>
    apiClient.post<{ id: string }>(`${BASE}/profiles/${employeeId}/enroll`, { images }),

  toggleProfile: (profileId: string) =>
    apiClient.patch<{ isActive: boolean }>(`${BASE}/profiles/${profileId}/toggle`, {}),

  deleteProfile: (employeeId: string) =>
    apiClient.delete<void>(`${BASE}/profiles/${employeeId}`),

  getLogs: (page = 1, limit = 50) =>
    apiClient.get<{ logs: FaceAttendanceLog[]; total: number; page: number; totalPages: number }>(
      `${BASE}/logs`, { params: { page, limit } }
    ),

  listDevices: () =>
    apiClient.get<AttendanceDevice[]>(`${BASE}/devices`),

  createDevice: (name: string, location?: string) =>
    apiClient.post<AttendanceDevice>(`${BASE}/devices`, { name, location }),

  toggleDevice: (deviceId: string) =>
    apiClient.patch<AttendanceDevice>(`${BASE}/devices/${deviceId}/toggle`, {}),

  /** Dev-only kiosk verify (no device key required) */
  kioskVerifyDev: (image: string) =>
    apiClient.post<VerifyResult>(`${BASE}/kiosk/verify-dev`, { image }),
};

export default faceAttendanceService;
