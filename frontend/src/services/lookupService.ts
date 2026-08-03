import apiClient, { ApiError } from './apiClient';
import type {
  CascadeConfirmationDetail,
  CreateLookupData,
  Lookup,
  LookupChangeLog,
  LookupUsage,
  UpdateLookupData,
} from '../types/lookup';

export interface LookupListParams {
  group: string;
  /** Include inactive entries (admin view). */
  all?: boolean;
  /**
   * Retain one specific label even when it is inactive, so an edit form for an
   * existing record renders its stored value instead of silently blanking it
   * (design.md Q2 — zero-data-loss requirement).
   */
  includeValue?: string;
}

export interface LookupHistoryParams {
  page?: number;
  limit?: number;
}

export interface LookupHistoryResult {
  data: LookupChangeLog[];
  pagination?: { page: number; limit: number; total: number; totalPages: number };
}

/**
 * Type guard for the cascade-confirmation 409. The backend flattens the detail at the
 * TOP LEVEL of the body (not under `data`), so we read it from `ApiError.body`.
 */
export function isCascadeConfirmation(error: unknown): CascadeConfirmationDetail | null {
  if (!(error instanceof ApiError) || error.statusCode !== 409) return null;
  const body = error.body as Partial<CascadeConfirmationDetail> | undefined;
  if (!body || body.requiresConfirmation !== true) return null;
  return {
    requiresConfirmation: true,
    message: body.message ?? error.message,
    oldLabel: body.oldLabel ?? '',
    newLabel: body.newLabel ?? '',
    affectedRecords: body.affectedRecords ?? 0,
  };
}

class LookupService {
  /** GET /lookups?group=&all=&includeValue= */
  async list({ group, all, includeValue }: LookupListParams): Promise<Lookup[]> {
    const response = await apiClient.get<Lookup[]>('/lookups', {
      params: {
        group,
        ...(all ? { all: 'true' } : {}),
        ...(includeValue ? { includeValue } : {}),
      },
    });
    return response.data ?? [];
  }

  /** GET /lookups/:id — includes usage count. */
  async getById(id: string): Promise<Lookup & { usage?: LookupUsage }> {
    const response = await apiClient.get<Lookup & { usage?: LookupUsage }>(`/lookups/${id}`);
    return response.data as Lookup & { usage?: LookupUsage };
  }

  /** GET /lookups/:id/usage */
  async getUsage(id: string): Promise<LookupUsage> {
    const response = await apiClient.get<LookupUsage>(`/lookups/${id}/usage`);
    return response.data ?? { usageCount: 0, breakdown: [] };
  }

  /** POST /lookups — ADMIN only. `code` is auto-generated server-side. */
  async create(data: CreateLookupData): Promise<Lookup> {
    const response = await apiClient.post<Lookup>('/lookups', data);
    return response.data as Lookup;
  }

  /**
   * PUT /lookups/:id — ADMIN only.
   *
   * A label change on an in-use lookup throws a 409 ApiError whose body carries the
   * cascade detail; pass `confirmCascade: true` to authorise the cascade. Use
   * `isCascadeConfirmation(error)` to detect and read that detail.
   */
  async update(id: string, data: UpdateLookupData): Promise<Lookup> {
    const response = await apiClient.put<Lookup>(`/lookups/${id}`, data);
    return response.data as Lookup;
  }

  /** DELETE /lookups/:id — SOFT delete (isActive=false). 400 when still in use. */
  async remove(id: string): Promise<Lookup> {
    const response = await apiClient.delete<Lookup>(`/lookups/${id}`);
    return response.data as Lookup;
  }

  /** GET /lookups/history?group= */
  async getGroupHistory(group: string, params?: LookupHistoryParams): Promise<LookupHistoryResult> {
    const response = await apiClient.get<LookupChangeLog[]>('/lookups/history', {
      params: { group, ...params },
    });
    return { data: response.data ?? [], pagination: response.pagination };
  }

  /** GET /lookups/:id/history */
  async getHistory(id: string, params?: LookupHistoryParams): Promise<LookupHistoryResult> {
    const response = await apiClient.get<LookupChangeLog[]>(`/lookups/${id}/history`, {
      params,
    });
    return { data: response.data ?? [], pagination: response.pagination };
  }
}

export default new LookupService();
