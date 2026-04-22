import apiClient from './apiClient';

const BASE = '/api/face-attendance';

export interface FaceProfile {
  id: string;
  employeeId: string;
  isActive: boolean;
  enrolledAt: string;
  employee: {
    id: string;
    fullName: string;
    employeeCode: string;
    department?: { name: string };
  };
  _count?: { images: number };
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
  // Admin: profiles
  listProfiles: () =>
    apiClient.get<FaceProfile[]>(`${BASE}/profiles`),

  enrollFace: (employeeId: string, images: string[]) =>
    apiClient.post<FaceProfile>(`${BASE}/profiles/${employeeId}/enroll`, { images }),

  toggleProfile: (profileId: string) =>
    apiClient.patch<FaceProfile>(`${BASE}/profiles/${profileId}/toggle`, {}),

  deleteProfile: (employeeId: string) =>
    apiClient.delete<void>(`${BASE}/profiles/${employeeId}`),

  // Admin: logs
  getLogs: (page = 1, limit = 50) =>
    apiClient.get<{ logs: FaceAttendanceLog[]; total: number; page: number; totalPages: number }>(
      `${BASE}/logs`, { params: { page, limit } }
    ),

  // Admin: devices
  listDevices: () =>
    apiClient.get<AttendanceDevice[]>(`${BASE}/devices`),

  createDevice: (name: string, location?: string) =>
    apiClient.post<AttendanceDevice>(`${BASE}/devices`, { name, location }),

  toggleDevice: (deviceId: string) =>
    apiClient.patch<AttendanceDevice>(`${BASE}/devices/${deviceId}/toggle`, {}),

  // Kiosk: dev mode (no device key)
  kioskVerifyDev: (image: string) =>
    apiClient.post<VerifyResult>(`${BASE}/kiosk/verify-dev`, { image }),
};

export default faceAttendanceService;
