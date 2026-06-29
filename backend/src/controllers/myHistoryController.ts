import { Response, NextFunction } from 'express';
import { z } from 'zod';
import type { AuthenticatedRequest } from '@types';
import { getMyHistory } from '@services/myHistoryService';
import { ValidationError } from '@utils/errors';

// ─── Zod schema ───────────────────────────────────────────────────────────────

const historyQuerySchema = z.object({
  dateFrom: z.string().optional().transform((v) => (v ? new Date(v) : undefined)),
  dateTo: z.string().optional().transform((v) => (v ? new Date(v) : undefined)),
  types: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((v) => (v ? (Array.isArray(v) ? v : [v]) : undefined)),
  statuses: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((v) => (v ? (Array.isArray(v) ? v : [v]) : undefined)),
  roleFilter: z.enum(['created', 'related', 'both']).optional(),
  search: z.string().max(200).optional(),
  page: z
    .string()
    .optional()
    .transform((v) => (v ? Math.max(1, parseInt(v, 10)) : 1)),
  limit: z
    .string()
    .optional()
    .transform((v) => (v ? Math.min(100, Math.max(1, parseInt(v, 10))) : 20)),
});

function parseQuery(query: Record<string, unknown>) {
  const result = historyQuerySchema.safeParse(query);
  if (!result.success) {
    throw new ValidationError('Tham số truy vấn không hợp lệ: ' + result.error.issues[0]?.message);
  }
  const { dateFrom, dateTo } = result.data;
  if (dateFrom instanceof Date && isNaN(dateFrom.getTime())) {
    throw new ValidationError('dateFrom không phải ngày hợp lệ');
  }
  if (dateTo instanceof Date && isNaN(dateTo.getTime())) {
    throw new ValidationError('dateTo không phải ngày hợp lệ');
  }
  return result.data;
}

// ─── Controller handlers ──────────────────────────────────────────────────────

/**
 * GET /api/me/history — authenticated user views their own history
 */
export async function getMyHistoryHandler(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const params = parseQuery(req.query as Record<string, unknown>);
    const result = await getMyHistory({
      userId: req.user!.id,
      ...params,
    });

    res.json({
      success: true,
      data: result,
      pagination: {
        page: result.page,
        limit: params.limit,
        total: result.total,
        totalPages: result.totalPages,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/users/:userId/history — manager views a subordinate's history
 */
export async function getUserHistoryHandler(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const targetUserId = req.params.userId;

    const params = parseQuery(req.query as Record<string, unknown>);
    const result = await getMyHistory({
      userId: targetUserId,
      ...params,
    });

    res.json({
      success: true,
      data: result,
      pagination: {
        page: result.page,
        limit: params.limit,
        total: result.total,
        totalPages: result.totalPages,
      },
    });
  } catch (err) {
    next(err);
  }
}
