import type { SupplyRequest, SupplyRequestItem } from '../services/supplyRequestService';

export type SupplyRequestType = 'material' | 'equipment' | 'manpower' | 'mixed';

export const normalizeSupplyRequestCategory = (value?: string): string =>
  (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

export const getSupplyRequestTypeFromCategory = (value?: string): Exclude<SupplyRequestType, 'mixed'> => {
  const normalized = normalizeSupplyRequestCategory(value);

  if (
    normalized.includes('nhan luc') ||
    normalized.includes('nhan su') ||
    normalized.includes('tuyen dung')
  ) {
    return 'manpower';
  }

  if (
    normalized.includes('thiet bi') ||
    normalized.includes('cong cu') ||
    normalized.includes('tai san')
  ) {
    return 'equipment';
  }

  return 'material';
};

const detectItemType = (item?: Pick<SupplyRequestItem, 'phanLoai'> | null): Exclude<SupplyRequestType, 'mixed'> =>
  getSupplyRequestTypeFromCategory(item?.phanLoai);

export const getSupplyRequestType = (request?: Pick<SupplyRequest, 'items'> | null): SupplyRequestType => {
  const items = request?.items || [];
  const types = new Set(items.map((item) => detectItemType(item)));
  return types.size <= 1 ? (Array.from(types)[0] || 'material') : 'mixed';
};

export const getSupplyRequestTypeLabelByValue = (type: SupplyRequestType): string => {
  switch (type) {
    case 'equipment':
      return 'Thiết bị';
    case 'manpower':
      return 'Nhân lực';
    case 'mixed':
      return 'Hỗn hợp';
    case 'material':
    default:
      return 'Vật tư';
  }
};

export const getSupplyRequestTypeLabel = (request?: Pick<SupplyRequest, 'items'> | null): string =>
  getSupplyRequestTypeLabelByValue(getSupplyRequestType(request));

export const supportsProcurementFlow = (request?: Pick<SupplyRequest, 'items'> | null): boolean =>
  !(request?.items || []).some((item) => detectItemType(item) === 'manpower');

export const MANPOWER_CATEGORY_OPTIONS = ['Nhân lực', 'Nhân sự', 'Tuyển dụng'];
export const SUPPLY_REQUEST_APPROVAL_PENDING_STATUSES = ['Chờ duyệt', 'Chưa cung cấp'];
export const SUPPLY_REQUEST_FULL_STATUS_OPTIONS = ['Đã duyệt', 'Đang xử lý', 'Đã duyệt mua', 'Đã mua hàng', 'Đã cung cấp'];
export const SUPPLY_REQUEST_DIRECT_STATUS_OPTIONS = ['Đã duyệt', 'Đang xử lý', 'Đã cung cấp'];
export const SUPPLY_REQUEST_TABLE_STATUS_OPTIONS = ['Chờ duyệt', 'Đã duyệt', 'Đang xử lý', 'Đã duyệt mua', 'Đã mua hàng', 'Đã cung cấp', 'Từ chối'];

export const getRequestTypeDefaultUnit = (type: Exclude<SupplyRequestType, 'mixed'>): string =>
  type === 'manpower' ? 'Người' : 'Kg';

export const getRequestTypeAllowedUnits = (type: Exclude<SupplyRequestType, 'mixed'>): string[] =>
  type === 'manpower'
    ? ['Người', 'Vị trí', 'Ca']
    : ['Kg', 'Cái', 'Hệ', 'Lít', 'Thùng', 'Bộ'];

export const getAllowedSupplyRequestStatuses = (request?: Pick<SupplyRequest, 'items' | 'supportsProcurementFlow'> | null): string[] =>
  (request?.supportsProcurementFlow ?? supportsProcurementFlow(request))
    ? SUPPLY_REQUEST_FULL_STATUS_OPTIONS
    : SUPPLY_REQUEST_DIRECT_STATUS_OPTIONS;

export const isSupplyRequestPendingApproval = (status?: string): boolean =>
  SUPPLY_REQUEST_APPROVAL_PENDING_STATUSES.includes(status || '');

export const isSupplyRequestRejected = (status?: string): boolean =>
  status === 'Từ chối';
