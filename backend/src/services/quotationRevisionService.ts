import prisma from '@config/database';
import { NotFoundError } from '@utils/errors';
import { getPaginationParams, calculateTotalPages } from '@utils/helpers';
import type { PaginatedResponse } from '@types';

const formatUserName = (user: { firstName: string; lastName: string; email: string } | null): string | null => {
  if (!user) return null;
  const full = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim();
  return full.length > 0 ? full : user.email;
};

const enrichRevisions = async <T extends { createdBy: string; snapshot: any }>(
  rows: T[],
): Promise<Array<T & { createdByName: string | null }>> => {
  // Collect all user ids referenced in revisions and inside snapshots
  const userIds = new Set<string>();
  for (const r of rows) {
    if (r.createdBy && r.createdBy !== 'system') userIds.add(r.createdBy);
    const lockedBy = r.snapshot?.priceLockedBy;
    if (typeof lockedBy === 'string' && lockedBy.length > 0) userIds.add(lockedBy);
  }

  const users = userIds.size === 0
    ? []
    : await prisma.user.findMany({
        where: { id: { in: Array.from(userIds) } },
        select: { id: true, firstName: true, lastName: true, email: true },
      });
  const byId = new Map(users.map(u => [u.id, u]));

  return rows.map(r => {
    const snapshot = r.snapshot && typeof r.snapshot === 'object'
      ? {
          ...r.snapshot,
          priceLockedByName: typeof r.snapshot.priceLockedBy === 'string'
            ? formatUserName(byId.get(r.snapshot.priceLockedBy) ?? null)
            : null,
        }
      : r.snapshot;
    return {
      ...r,
      snapshot,
      createdByName: r.createdBy === 'system' ? 'Hệ thống' : formatUserName(byId.get(r.createdBy) ?? null),
    };
  });
};

class QuotationRevisionService {
  /**
   * List revisions for a quotation, paginated, newest first
   */
  async listByQuotation(
    quotationId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<PaginatedResponse<any>> {
    const { skip } = getPaginationParams(page, limit);

    // Verify quotation exists
    const quotation = await prisma.quotation.findUnique({ where: { id: quotationId }, select: { id: true } });
    if (!quotation) {
      throw new NotFoundError('Không tìm thấy báo giá');
    }

    const [revisions, total] = await Promise.all([
      prisma.quotationRevision.findMany({
        where: { quotationId },
        skip,
        take: limit,
        orderBy: { revisionNumber: 'desc' },
      }),
      prisma.quotationRevision.count({ where: { quotationId } }),
    ]);

    const enriched = await enrichRevisions(revisions);

    return {
      data: enriched,
      total,
      page,
      limit,
      totalPages: calculateTotalPages(total, limit),
    };
  }

  /**
   * Get a single revision by quotation and revision id
   */
  async getById(quotationId: string, revisionId: string): Promise<any> {
    const revision = await prisma.quotationRevision.findFirst({
      where: { id: revisionId, quotationId },
    });

    if (!revision) {
      throw new NotFoundError('Không tìm thấy phiên bản báo giá');
    }

    const [enriched] = await enrichRevisions([revision]);
    return enriched;
  }
}

export default new QuotationRevisionService();
