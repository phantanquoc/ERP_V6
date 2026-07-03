import apiClient from './apiClient';

export interface HistoryItem {
  entityType: string;
  entityId: string;
  group: 'Yêu cầu' | 'Nhiệm vụ' | 'Kế hoạch' | 'Báo cáo' | 'Phiếu';
  title: string;
  code?: string | null;
  status?: string | null;
  createdAt: string; // ISO string from API
  role: 'creator' | 'related';
  metadata?: Record<string, unknown>;
  routeHint: string;
}

export interface HistoryGroupCounts {
  'Yêu cầu': number;
  'Nhiệm vụ': number;
  'Kế hoạch': number;
  'Báo cáo': number;
  'Phiếu': number;
}

export interface HistoryResult {
  items: HistoryItem[];
  total: number;
  page: number;
  totalPages: number;
  groupCounts: HistoryGroupCounts;
}

export interface MyHistoryParams {
  dateFrom?: string;   // YYYY-MM-DD
  dateTo?: string;     // YYYY-MM-DD
  types?: string[];
  statuses?: string[];
  roleFilter?: 'created' | 'related' | 'both';
  search?: string;
  page?: number;
  limit?: number;
}

function buildQueryString(params: MyHistoryParams): string {
  const parts: string[] = [];

  if (params.dateFrom) parts.push(`dateFrom=${encodeURIComponent(params.dateFrom)}`);
  if (params.dateTo) parts.push(`dateTo=${encodeURIComponent(params.dateTo)}`);
  if (params.types?.length) params.types.forEach((t) => parts.push(`types=${encodeURIComponent(t)}`));
  if (params.statuses?.length) params.statuses.forEach((s) => parts.push(`statuses=${encodeURIComponent(s)}`));
  if (params.roleFilter) parts.push(`roleFilter=${params.roleFilter}`);
  if (params.search) parts.push(`search=${encodeURIComponent(params.search)}`);
  if (params.page != null) parts.push(`page=${params.page}`);
  if (params.limit != null) parts.push(`limit=${params.limit}`);

  return parts.length ? `?${parts.join('&')}` : '';
}

export async function fetchMyHistory(params: MyHistoryParams = {}): Promise<HistoryResult> {
  const qs = buildQueryString(params);
  const response = await apiClient.get<HistoryResult>(`/me/history${qs}`);
  return response.data as HistoryResult;
}

export async function fetchUserHistory(userId: string, params: MyHistoryParams = {}): Promise<HistoryResult> {
  const qs = buildQueryString(params);
  const response = await apiClient.get<HistoryResult>(`/users/${userId}/history${qs}`);
  return response.data as HistoryResult;
}

/**
 * Maps a history entity type to its REST detail endpoint (relative path, without /api prefix).
 * Returns null if the entity should not be shown in HistoryEntityDetailModal
 * (e.g., has its own list modal, or no dedicated detail endpoint).
 */
export function getEntityDetailEndpoint(entityType: string): string | null {
  const map: Record<string, string> = {
    'quotation-request': '/quotation-requests',
    'supply-request': '/supply-requests',
    'purchase-request': '/purchase-requests',
    'repair-request': '/repair-requests',
    'maintenance-plan': '/maintenance-plans',
    'project': '/projects',
    'fault-record': '/fault-records',
    'maintenance-record': '/maintenance-records',
    'material-evaluation': '/material-evaluations',
    'finished-product': '/finished-products',
    'quality-evaluation': '/quality-evaluations',
    'production-report': '/production-reports',
    'warehouse-receipt': '/warehouse-receipts',
    'warehouse-issue': '/warehouse-issues',
    'quotation': '/quotations',
    'order': '/orders',
    'internal-inspection': '/internal-inspections',
    'customer-feedback': '/customer-feedbacks',
    'invoice': '/invoices',
    'tax-report': '/tax-reports',
  };
  return map[entityType] ?? null;
}

/**
 * Maps a history entity type to the module key used by hasModuleAccess,
 * for deciding whether to show the "Mở trang gốc" button.
 */
export function getEntityModule(entityType: string): string | null {
  const map: Record<string, string> = {
    'quotation-request': 'business',
    'supply-request': 'production',
    'purchase-request': 'purchasing',
    'repair-request': 'technical',
    'maintenance-plan': 'technical',
    'project': 'technical',
    'fault-record': 'technical',
    'maintenance-record': 'technical',
    'material-evaluation': 'production',
    'finished-product': 'production',
    'quality-evaluation': 'quality',
    'production-report': 'production',
    'warehouse-receipt': 'production',
    'warehouse-issue': 'production',
    'quotation': 'business',
    'order': 'business',
    'internal-inspection': 'quality',
    'customer-feedback': 'business',
    'invoice': 'accounting',
    'tax-report': 'accounting',
  };
  return map[entityType] ?? null;
}
