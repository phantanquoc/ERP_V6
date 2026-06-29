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
