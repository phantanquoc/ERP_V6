import apiClient from './apiClient';
import { API_BASE_URL } from '../config/api';

const BASE = '/face-attendance';

interface KioskConfig {
  deviceKey: string;
  deviceId?: string;
}

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
  action: 'CHECK_IN' | 'CHECK_OUT' | 'FAILED' | 'ALREADY_RECORDED' | 'UNRECOGNIZED' | 'LIVENESS_FAILED';
  confidence: number | null;
  timestamp: string;
  ipAddress: string | null;
  employee?: { fullName: string; employeeCode: string };
}

export interface VerifyTopKMatch {
  rank: number;
  profileId: string;
  employeeId: string | null;
  employeeCode: string | null;
  fullName: string | null;
  position: string | null;
  department: string | null;
  confidence: number;
  minDistance: number;
  voteCount: number;
  score: number;
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
  matched?: boolean;
  action?: 'CHECK_IN' | 'CHECK_OUT' | 'ALREADY_RECORDED' | 'NO_MATCH' | 'COOLDOWN';
  employee?: { fullName: string; employeeCode: string; department?: string | null };
  confidence?: number;
  livenessPassed?: boolean;
  livenessScore?: number;
  lateMinutes?: number;
  topK?: VerifyTopKMatch[];
  message: string;
}

const faceAttendanceService = {
  /** Returns all employees with their face profile status */
  listProfiles: () =>
    apiClient.get<EmployeeFaceProfile[]>(`${BASE}/profiles`),

  enrollFace: (employeeId: string, images: string[]) =>
    apiClient.post<{ id: string }>(`${BASE}/profiles/${employeeId}/enroll`, { images }),

  enrollVariation: (employeeId: string, images: string[]) =>
    apiClient.post<{ addedCount: number; totalCount: number }>(`${BASE}/profiles/${employeeId}/enroll-variation`, { images }),

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

  getKioskConfig(): KioskConfig {
    return {
      deviceKey: localStorage.getItem('faceAttendance.deviceKey') || import.meta.env.VITE_FACE_DEVICE_KEY || '',
      deviceId: localStorage.getItem('faceAttendance.deviceId') || import.meta.env.VITE_FACE_DEVICE_ID,
    };
  },

  async kioskVerify(image: string, frames: string[], deviceKey: string, deviceId?: string) {
    const response = await fetch(`${API_BASE_URL}${BASE}/kiosk/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-device-key': deviceKey,
        ...(deviceId ? { 'x-device-id': deviceId } : {}),
      },
      body: JSON.stringify({ image, frames }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data?.message || `HTTP ${response.status}`);
    }

    return data as { success: boolean; data?: VerifyResult; message?: string };
  },

  /** Dev-only kiosk verify (no device key required) */
  kioskVerifyDev: (image: string, frames: string[]) =>
    apiClient.post<VerifyResult>(`${BASE}/kiosk/verify-dev`, { image, frames }),
};

export default faceAttendanceService;
