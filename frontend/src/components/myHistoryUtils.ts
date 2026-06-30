/**
 * Shared constants and helpers for the My History feature.
 * Co-located in the components directory to avoid react-refresh
 * warnings from exporting non-components from component files.
 */

/** Maps each group label to the entity type strings the backend recognises. */
export const GROUP_TO_ENTITY_TYPES: Record<string, string[]> = {
  'Yêu cầu': ['quotation-request', 'supply-request', 'purchase-request', 'leave-request', 'repair-request'],
  'Nhiệm vụ': ['task'],
  'Kế hoạch': ['work-plan', 'project', 'maintenance-plan'],
  'Báo cáo': ['daily-work-report', 'private-feedback', 'fault-record', 'material-evaluation', 'finished-product', 'quality-evaluation', 'production-report', 'internal-inspection', 'customer-feedback', 'tax-report'],
  'Phiếu': ['warehouse-receipt', 'warehouse-issue', 'quotation', 'maintenance-record', 'acceptance-handover', 'invoice'],
};

/**
 * Status label-to-codes mapping. Each user-facing label maps to one or more
 * raw backend status codes (covers both VN and EN conventions).
 */
export const STATUS_LABEL_TO_CODES: { label: string; codes: string[] }[] = [
  { label: 'Chờ duyệt', codes: ['CHO_DUYET', 'PENDING'] },
  { label: 'Đã duyệt', codes: ['DA_DUYET', 'APPROVED'] },
  { label: 'Hoàn thành', codes: ['HOAN_THANH', 'COMPLETED'] },
  { label: 'Đã hủy', codes: ['DA_HUY', 'CANCELLED'] },
  { label: 'Đang xử lý', codes: ['DANG_XU_LY', 'IN_PROGRESS'] },
  { label: 'Mới tạo', codes: ['MOI_TAO'] },
  { label: 'Từ chối', codes: ['TU_CHOI', 'REJECTED'] },
];

/** Returns true if at least one code from this label entry is in activeStatuses */
export function isStatusLabelActive(codes: string[], activeStatuses: string[]): boolean {
  return codes.some((c) => activeStatuses.includes(c));
}

export type DatePreset = '7' | '30' | '90' | '365' | 'all' | 'custom';

/** Solid dot color per group — used on the timeline rail. */
export const GROUP_DOT_COLOR: Record<string, string> = {
  'Yêu cầu': 'bg-red-500',
  'Nhiệm vụ': 'bg-blue-500',
  'Kế hoạch': 'bg-indigo-500',
  'Báo cáo': 'bg-amber-500',
  'Phiếu': 'bg-green-500',
};

import type { MyHistoryParams } from '../services/myHistoryService';

export function detectPreset(params: MyHistoryParams): DatePreset {
  if (!params.dateFrom && !params.dateTo) return 'all';
  if (params.dateTo && params.dateFrom) {
    const from = new Date(params.dateFrom);
    const to = new Date(params.dateTo);
    const diffDays = Math.round((to.getTime() - from.getTime()) / 86400000);
    if (diffDays >= 6 && diffDays <= 8) return '7';
    if (diffDays >= 29 && diffDays <= 31) return '30';
    if (diffDays >= 89 && diffDays <= 91) return '90';
    if (diffDays >= 364 && diffDays <= 366) return '365';
    return 'custom';
  }
  if (params.dateFrom && !params.dateTo) {
    const from = new Date(params.dateFrom);
    const today = new Date();
    const diffDays = Math.round((today.getTime() - from.getTime()) / 86400000);
    if (diffDays >= 6 && diffDays <= 8) return '7';
    if (diffDays >= 29 && diffDays <= 31) return '30';
    if (diffDays >= 89 && diffDays <= 91) return '90';
    if (diffDays >= 364 && diffDays <= 366) return '365';
  }
  return 'custom';
}
