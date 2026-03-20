export enum OvertimePlanStatus {
  CHO_DUYET = 'CHO_DUYET',
  DA_DUYET = 'DA_DUYET',
  TU_CHOI = 'TU_CHOI',
  HOAN_THANH = 'HOAN_THANH',
  HUY = 'HUY',
}

export interface CreateOvertimePlanRequest {
  nguoiThamGia: string[]; // Array of employee IDs
  noiDung: string;
  ngayTangCa: string; // ISO date string
  gioBatDau: string; // "HH:mm"
  gioKetThuc: string; // "HH:mm"
  ghiChu?: string;
  mucDoUuTien: string;
}

export interface UpdateOvertimePlanRequest {
  nguoiThamGia?: string[];
  noiDung?: string;
  ngayTangCa?: string;
  gioBatDau?: string;
  gioKetThuc?: string;
  ghiChu?: string;
  mucDoUuTien?: string;
  trangThai?: OvertimePlanStatus;
}

export interface AcceptOvertimePlanRequest {
  trangThai: 'DA_TIEP_NHAN' | 'TU_CHOI';
}

export interface ApproveOvertimePlanRequest {
  trangThai: 'DA_DUYET' | 'TU_CHOI';
  lyDoTuChoi?: string;
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
