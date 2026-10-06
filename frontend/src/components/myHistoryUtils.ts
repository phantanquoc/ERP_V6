import type { MyHistoryParams } from '../services/myHistoryService';

/**
 * Shared constants and helpers for the My History feature.
 * Co-located in the components directory to avoid react-refresh
 * warnings from exporting non-components from component files.
 */

/** Maps each group label to the entity type strings the backend recognises. Single source — imported by MyHistoryFilters and MyHistory. */
export const GROUP_TO_ENTITY_TYPES: Record<string, string[]> = {
  'Yêu cầu': ['quotation-request', 'supply-request', 'purchase-request', 'leave-request', 'repair-request', 'inspection-request', 'replenishment-request'],
  'Nhiệm vụ': ['task', 'overtime-plan', 'daily-work-report'],
  'Kế hoạch': ['work-plan', 'project', 'maintenance-plan'],
  'Báo cáo': ['fault-record', 'material-evaluation', 'finished-product', 'quality-evaluation', 'production-report', 'maintenance-record'],
  'Phiếu': ['warehouse-receipt', 'warehouse-issue', 'quotation', 'order', 'acceptance-handover', 'internal-inspection', 'customer-feedback', 'invoice', 'tax-report', 'private-feedback'],
};

/**
 * Status label-to-codes mapping. Each user-facing label maps to one or more
 * raw backend status codes (covers both VN and EN conventions).
 */
export const STATUS_LABEL_TO_CODES: { label: string; codes: string[] }[] = [
  { label: 'Chờ xử lý', codes: ['CHO_XU_LY', 'PENDING', 'MOI_TAO'] },
  { label: 'Chờ báo giá', codes: ['Chờ báo giá'] },
  { label: 'Đã chuyển mua hàng', codes: ['Đã chuyển mua hàng'] },
  { label: 'Chờ duyệt', codes: ['CHO_DUYET'] },
  { label: 'Đã tiếp nhận', codes: ['DA_TIEP_NHAN'] },
  { label: 'Đang kiểm tra', codes: ['DANG_KIEM_TRA'] },
  { label: 'Đã kiểm tra', codes: ['DA_KIEM_TRA'] },
  { label: 'Đang xử lý', codes: ['DANG_XU_LY', 'IN_PROGRESS', 'DANG_SUA_CHUA', 'LEN_KE_HOACH'] },
  { label: 'Chờ nghiệm thu', codes: ['CHO_NGHIEM_THU'] },
  { label: 'Đã nghiệm thu', codes: ['DA_NGHIEM_THU'] },
  { label: 'Hoàn thành', codes: ['HOAN_THANH', 'COMPLETED', 'DA_GIAO_HANG'] },
  { label: 'Đã duyệt', codes: ['DA_DUYET', 'APPROVED'] },
  { label: 'Từ chối', codes: ['TU_CHOI', 'REJECTED'] },
  { label: 'Đã hủy', codes: ['DA_HUY', 'CANCELLED'] },
];

export const STATUS_LABEL: Record<string, string> = Object.fromEntries(
  STATUS_LABEL_TO_CODES.flatMap(({ label, codes }) => codes.map((c) => [c, label]))
) as Record<string, string>;

export const STATUS_COLOR: Record<string, string> = {
  CHO_XU_LY: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  PENDING: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  MOI_TAO: 'bg-slate-50 text-slate-600 border-slate-200',
  CHO_DUYET: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  DA_TIEP_NHAN: 'bg-sky-50 text-sky-700 border-sky-200',
  DANG_KIEM_TRA: 'bg-blue-50 text-blue-700 border-blue-200',
  DA_KIEM_TRA: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  DANG_XU_LY: 'bg-blue-50 text-blue-700 border-blue-200',
  IN_PROGRESS: 'bg-blue-50 text-blue-700 border-blue-200',
  DANG_SUA_CHUA: 'bg-blue-50 text-blue-700 border-blue-200',
  LEN_KE_HOACH: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  CHO_NGHIEM_THU: 'bg-amber-50 text-amber-700 border-amber-200',
  DA_NGHIEM_THU: 'bg-teal-50 text-teal-700 border-teal-200',
  HOAN_THANH: 'bg-green-50 text-green-700 border-green-200',
  COMPLETED: 'bg-green-50 text-green-700 border-green-200',
  DA_GIAO_HANG: 'bg-green-50 text-green-700 border-green-200',
  DA_DUYET: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  APPROVED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  TU_CHOI: 'bg-red-50 text-red-700 border-red-200',
  REJECTED: 'bg-red-50 text-red-700 border-red-200',
  DA_HUY: 'bg-gray-100 text-gray-500 border-gray-200',
  'Chờ báo giá': 'bg-amber-50 text-amber-700 border-amber-200',
  'Đã chuyển mua hàng': 'bg-green-50 text-green-700 border-green-200',
  CANCELLED: 'bg-gray-100 text-gray-500 border-gray-200',
};

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


/** Single-source entity type labels — use everywhere instead of duplicating. */
export const ENTITY_TYPE_LABELS: Record<string, string> = {
  'quotation-request': 'Yêu cầu báo giá',
  'supply-request': 'Yêu cầu cung ứng',
  'purchase-request': 'Yêu cầu mua hàng',
  'leave-request': 'Yêu cầu nghỉ phép',
  'repair-request': 'Yêu cầu sửa chữa',
  'inspection-request': 'Yêu cầu kiểm tra',
  'replenishment-request': 'Yêu cầu bổ sung',
  'task': 'Nhiệm vụ',
  'overtime-plan': 'Kế hoạch tăng ca',
  'work-plan': 'Kế hoạch công việc',
  'project': 'Dự án',
  'maintenance-plan': 'Kế hoạch bảo trì',
  'daily-work-report': 'Báo cáo công việc',
  'private-feedback': 'Phản hồi',
  'fault-record': 'Ghi nhận lỗi',
  'material-evaluation': 'Đánh giá nguyên liệu',
  'finished-product': 'Thành phẩm',
  'quality-evaluation': 'Đánh giá chất lượng',
  'production-report': 'Báo cáo sản xuất',
  'internal-inspection': 'Kiểm tra nội bộ',
  'customer-feedback': 'Phản hồi khách hàng',
  'tax-report': 'Báo cáo thuế',
  'warehouse-receipt': 'Phiếu nhập kho',
  'warehouse-issue': 'Phiếu xuất kho',
  'quotation': 'Báo giá',
  'order': 'Đơn hàng',
  'maintenance-record': 'Phiếu bảo trì',
  'acceptance-handover': 'Biên bản nghiệm thu',
  'invoice': 'Hóa đơn',
};

export function detectPreset(params: MyHistoryParams): DatePreset {
  if ((params as any).range === 'all') return 'all';
  if (!params.dateFrom && !params.dateTo) return '30';
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
