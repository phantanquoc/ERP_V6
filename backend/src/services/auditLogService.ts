import prisma from '@config/database';
import { ValidationError } from '@utils/errors';
import { AuditEntityType, AuditAction } from '@utils/auditLog';

const VALID_ENTITY_TYPES: AuditEntityType[] = ['QuotationRequest', 'Quotation', 'Order', 'ExportCost'];
const VALID_ACTIONS: AuditAction[] = ['CREATE', 'UPDATE', 'DELETE', 'STATUS_CHANGE', 'PRICE_UNLOCK'];

export interface ListAuditParams {
  entityType?: string;
  entityId?: string;
  action?: string;
  actorId?: string;
  page?: number;
  limit?: number;
}

const formatUserName = (user: { firstName: string; lastName: string; email: string } | null): string | null => {
  if (!user) return null;
  const full = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim();
  return full.length > 0 ? full : user.email;
};

class AuditLogService {
  async listAudit(params: ListAuditParams) {
    const { entityType, entityId, action, actorId, page = 1, limit = 20 } = params;

    if (entityType && !VALID_ENTITY_TYPES.includes(entityType as AuditEntityType)) {
      throw new ValidationError(`Loại thực thể không hợp lệ. Các giá trị hợp lệ: ${VALID_ENTITY_TYPES.join(', ')}`);
    }
    if (action && !VALID_ACTIONS.includes(action as AuditAction)) {
      throw new ValidationError(`Loại hành động không hợp lệ. Các giá trị hợp lệ: ${VALID_ACTIONS.join(', ')}`);
    }

    const skip = (page - 1) * limit;

    const where: any = {};
    if (entityType) where.entityType = entityType;
    if (entityId) where.entityId = entityId;
    if (action) where.action = action;
    if (actorId) where.actorId = actorId;

    const [rows, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.auditLog.count({ where }),
    ]);

    // Enrich actor names + compute per-entity sequence number
    const actorIds = new Set<string>();
    for (const r of rows) {
      if (r.actorId && r.actorId !== 'system') actorIds.add(r.actorId);
    }
    const users = actorIds.size === 0
      ? []
      : await prisma.user.findMany({
          where: { id: { in: Array.from(actorIds) } },
          select: { id: true, firstName: true, lastName: true, email: true },
        });
    const userById = new Map(users.map(u => [u.id, u]));

    // Compute sequence (v1, v2…) per (entityType, entityId) — chronological
    // We fetch only when entityId is specified to keep it cheap.
    let sequenceById = new Map<string, number>();
    if (entityId) {
      const allForEntity = await prisma.auditLog.findMany({
        where: { entityType, entityId },
        select: { id: true, createdAt: true },
        orderBy: { createdAt: 'asc' },
      });
      allForEntity.forEach((r, idx) => sequenceById.set(r.id, idx + 1));
    }

    const data = rows.map(r => ({
      ...r,
      actorName: r.actorId === 'system' ? 'Hệ thống' : formatUserName(userById.get(r.actorId) ?? null),
      sequenceNumber: sequenceById.get(r.id) ?? null,
    }));

    return {
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}

export default new AuditLogService();
