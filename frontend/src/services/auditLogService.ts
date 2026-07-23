import apiClient from './apiClient';

export type AuditEntityType = 'QuotationRequest' | 'Quotation' | 'Order' | 'ExportCost' | 'Process';
export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'STATUS_CHANGE' | 'PRICE_UNLOCK';

export interface AuditLog {
  id: string;
  entityType: AuditEntityType;
  entityId: string;
  action: AuditAction;
  actorId: string;
  actorRole: string;
  actorName?: string | null;
  sequenceNumber?: number | null;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
}

export interface AuditLogListResponse {
  success: boolean;
  data: AuditLog[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ListAuditParams {
  entityType?: AuditEntityType;
  entityId?: string;
  action?: AuditAction;
  actorId?: string;
  page?: number;
  limit?: number;
}

export const auditLogService = {
  async listAudit(params: ListAuditParams = {}): Promise<AuditLogListResponse> {
    const queryParams: Record<string, string | number> = {};
    if (params.entityType) queryParams.entityType = params.entityType;
    if (params.entityId) queryParams.entityId = params.entityId;
    if (params.action) queryParams.action = params.action;
    if (params.actorId) queryParams.actorId = params.actorId;
    if (params.page) queryParams.page = params.page;
    if (params.limit) queryParams.limit = params.limit;

    const response = await apiClient.get('/audit-logs', { params: queryParams });
    return response as unknown as AuditLogListResponse;
  },
};
