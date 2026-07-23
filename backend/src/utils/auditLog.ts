import prisma from '@config/database';

// ── Entity type and action unions ─────────────────────────────────────────────

export type AuditEntityType = 'QuotationRequest' | 'Quotation' | 'Order' | 'ExportCost' | 'Process';
export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'STATUS_CHANGE' | 'PRICE_UNLOCK';

export interface RecordAuditParams {
  entityType: AuditEntityType;
  entityId: string;
  action: AuditAction;
  actorId: string;
  actorRole: string;
  before?: unknown;
  after?: unknown;
  note?: string;
}

/**
 * Write an audit log entry. Failures are swallowed and logged via console.warn —
 * audit writes must never bubble and block the primary operation.
 */
export async function recordAudit(params: RecordAuditParams): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        entityType: params.entityType,
        entityId: params.entityId,
        action: params.action,
        actorId: params.actorId,
        actorRole: params.actorRole,
        before: params.before !== undefined ? (params.before as any) : undefined,
        after: params.after !== undefined ? (params.after as any) : undefined,
        note: params.note,
      },
    });
  } catch (err) {
    console.warn('[auditLog] Failed to write audit log:', err);
  }
}
