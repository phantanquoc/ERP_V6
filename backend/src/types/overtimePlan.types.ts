export enum OvertimePlanStatus {
  CHO_DUYET = 'CHO_DUYET',
  DA_DUYET = 'DA_DUYET',
  TU_CHOI = 'TU_CHOI',
  HOAN_THANH = 'HOAN_THANH',
  HUY = 'HUY',
}

export interface OvertimePlanItemInput {
  ngayTangCa: string; // ISO date string "YYYY-MM-DD"
  gioBatDau: string; // "HH:mm"
  gioKetThuc: string; // "HH:mm"
  workShiftId?: string;
  nguoiThamGia: string[]; // Array of employee IDs
  ghiChuItem?: string;
}

export interface CreateOvertimePlanRequest {
  items: OvertimePlanItemInput[];
  noiDung: string;
  ghiChu?: string;
  mucDoUuTien: string;
}

export interface UpdateOvertimePlanRequest {
  items?: OvertimePlanItemInput[];
  noiDung?: string;
  ghiChu?: string;
  mucDoUuTien?: string;
  trangThai?: OvertimePlanStatus;
}

export interface AcceptOvertimePlanRequest {
  itemId: string;
  trangThai: 'DA_TIEP_NHAN' | 'TU_CHOI';
}

export interface ApproveOvertimePlanRequest {
  trangThai: 'DA_DUYET' | 'TU_CHOI';
  lyDoTuChoi?: string;
}

export interface UpdateActualTimeRequest {
  itemId: string;
  actualTimes: Record<string, { gioVao: string; gioRa: string }>;
}

export interface OvertimePlanListQuery {
  page?: number;
  limit?: number;
  search?: string;
  mucDoUuTien?: string;
  trangThai?: OvertimePlanStatus;
  nguoiTao?: string;
  nguoiThamGia?: string;
  department?: string;
}

// Populated types for API responses
export interface PopulatedUser {
  id: string;
  firstName: string;
  lastName: string;
  employeeCode: string;
  department: string;
}

export interface PopulatedOvertimePlanItem {
  id: string;
  overtimePlanId: string;
  ngayTangCa: Date;
  gioBatDau: string;
  gioKetThuc: string;
  workShiftId: string | null;
  workShiftName: string | null;
  nguoiThamGiaIds: string[];
  nguoiThamGia: PopulatedUser[];
  ghiChuItem: string | null;
  trangThaiTiepNhan: Record<string, string>;
  gioThucTe: Record<string, { gioVao: string; gioRa: string }>;
  createdAt: Date;
  updatedAt: Date;
}
