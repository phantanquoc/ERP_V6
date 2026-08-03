/**
 * Shared lookup (classification) types — change: shared-lookup-table.
 *
 * Mirrors backend `common.lookups` / `common.lookup_change_logs`. Group names are kept
 * in sync with LOOKUP_GROUPS in backend/src/services/lookupService.ts.
 */

/** The 11 classification groups served by /api/lookups. */
export const LOOKUP_GROUPS = {
  DON_VI_TINH: 'DON_VI_TINH',
  PHAN_LOAI_VAT_TU: 'PHAN_LOAI_VAT_TU',
  LOAI_CHI_PHI: 'LOAI_CHI_PHI',
  LOAI_CHI_PHI_XUAT_KHAU: 'LOAI_CHI_PHI_XUAT_KHAU',
  KHU_VUC: 'KHU_VUC',
  MUC_DO_LOI: 'MUC_DO_LOI',
  LOAI_LOI: 'LOAI_LOI',
  LOAI_SAN_PHAM: 'LOAI_SAN_PHAM',
  LOAI_KHACH_HANG: 'LOAI_KHACH_HANG',
  VAI_TRO_DU_AN: 'VAI_TRO_DU_AN',
  DON_VI_TIEN: 'DON_VI_TIEN',
} as const;

export type LookupGroup = (typeof LOOKUP_GROUPS)[keyof typeof LOOKUP_GROUPS];

/** Vietnamese display labels for each group, for admin UI selectors. */
export const LOOKUP_GROUP_LABELS: Record<LookupGroup, string> = {
  DON_VI_TINH: 'Đơn vị tính',
  PHAN_LOAI_VAT_TU: 'Phân loại vật tư',
  LOAI_CHI_PHI: 'Loại chi phí',
  LOAI_CHI_PHI_XUAT_KHAU: 'Loại chi phí xuất khẩu',
  KHU_VUC: 'Khu vực',
  MUC_DO_LOI: 'Mức độ lỗi',
  LOAI_LOI: 'Loại lỗi',
  LOAI_SAN_PHAM: 'Loại sản phẩm',
  LOAI_KHACH_HANG: 'Loại khách hàng',
  VAI_TRO_DU_AN: 'Vai trò dự án',
  DON_VI_TIEN: 'Đơn vị tiền',
};

export interface Lookup {
  id: string;
  group: string;
  code: string;
  label: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/** One table/column that stores this label, with how many rows hold it. */
export interface LookupUsageBreakdown {
  table: string;
  column: string;
  count: number;
}

export interface LookupUsage {
  usageCount: number;
  breakdown: LookupUsageBreakdown[];
}

export type LookupChangeAction =
  | 'CREATE'
  | 'UPDATE_LABEL'
  | 'CASCADE_RENAME'
  | 'UPDATE_SORT_ORDER'
  | 'SOFT_DELETE'
  | 'REACTIVATE';

export interface LookupChangeLog {
  id: string;
  lookupId: string | null;
  group: string;
  action: LookupChangeAction;
  oldLabel: string | null;
  newLabel: string | null;
  affectedRecords: number;
  affectedTables: LookupUsageBreakdown[] | null;
  changedByUserId: string | null;
  createdAt: string;
}

export interface CreateLookupData {
  group: LookupGroup | string;
  label: string;
  sortOrder?: number;
}

export interface UpdateLookupData {
  label?: string;
  sortOrder?: number;
  isActive?: boolean;
  /**
   * Set true to authorise a cascade rename. Without it, a label change on an in-use
   * lookup is refused with 409 and NOTHING is written — that 409 is the safety gate.
   */
  confirmCascade?: boolean;
}

/**
 * Detail the backend flattens at the TOP LEVEL of a 409 body when a label change
 * would touch existing rows. Drives the admin confirmation dialog.
 */
export interface CascadeConfirmationDetail {
  requiresConfirmation: true;
  message: string;
  oldLabel: string;
  newLabel: string;
  affectedRecords: number;
}
