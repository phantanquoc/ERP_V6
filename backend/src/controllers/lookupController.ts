import { Response, NextFunction } from 'express';
import lookupService, { CascadeConfirmationRequiredError } from '@services/lookupService';
import { ValidationError, ConflictError } from '@utils/errors';
import type { AuthenticatedRequest } from '@types';

/**
 * HTTP layer for the shared lookup (classification) API — change: shared-lookup-table.
 *
 * All business logic lives in `@services/lookupService`. This controller only parses
 * requests, shapes responses, and translates two service-level errors into the exact
 * HTTP contract the spec requires:
 *
 *  1. `CascadeConfirmationRequiredError` → 409 carrying
 *     `{ requiresConfirmation, oldLabel, newLabel, affectedRecords }`. The shared
 *     errorHandler serialises only `{ success, message }`, so the detail the UI needs
 *     for its confirmation dialog would be dropped if we delegated via `next(error)`.
 *     A label change is NEVER cascaded without `confirmCascade` — the 409 is the gate.
 *  2. `softDelete` refusing an in-use label → 400 (see `remove` below).
 *
 * There is deliberately NO hard-delete handler here. DELETE maps to the service's
 * soft delete only, and the audit trail is exposed read-only.
 */
class LookupController {
  /**
   * GET /api/lookups?group=X&all=true&includeValue=Y
   *
   * `all=true` returns inactive entries too (admin view). `includeValue` additionally
   * returns one specific label even when inactive, so an edit form for an existing
   * record can render its stored value instead of silently blanking it.
   */
  async getAll(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const group = req.query.group as string | undefined;
      const includeInactive = req.query.all === 'true';
      const includeValue = req.query.includeValue as string | undefined;

      if (!group) {
        throw new ValidationError('Nhóm danh mục là bắt buộc');
      }

      const data = await lookupService.getAll(group, { includeInactive, includeValue });
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/lookups/history?group=X&page=&limit=
   *
   * Group-wide audit history. MUST be routed before `/:id` — see lookupRoutes.ts.
   */
  async getGroupHistory(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const group = req.query.group as string | undefined;
      if (!group) {
        throw new ValidationError('Nhóm danh mục là bắt buộc');
      }

      const result = await lookupService.getHistory(
        { group },
        { page: parseInt(req.query.page as string) || undefined, limit: parseInt(req.query.limit as string) || undefined }
      );

      res.json({ success: true, data: result.data, pagination: result.pagination });
    } catch (error) {
      next(error);
    }
  }

  /** GET /api/lookups/:id — lookup plus its usage count across every mapped column. */
  async getById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await lookupService.getById(req.params.id);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  /** GET /api/lookups/:id/usage — `{ usageCount, breakdown: [{table, column, count}] }`. */
  async getUsage(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await lookupService.getUsageCount(req.params.id);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  /** GET /api/lookups/:id/history — audit history for one lookup, newest first. */
  async getHistory(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await lookupService.getHistory(
        { lookupId: req.params.id },
        { page: parseInt(req.query.page as string) || undefined, limit: parseInt(req.query.limit as string) || undefined }
      );

      res.json({ success: true, data: result.data, pagination: result.pagination });
    } catch (error) {
      next(error);
    }
  }

  /** POST /api/lookups — ADMIN only. `code` is auto-generated from the label. */
  async create(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { group, label, sortOrder } = req.body;

      const data = await lookupService.create(
        { group, label, sortOrder },
        req.user?.id ?? null
      );

      res.status(201).json({ success: true, data, message: 'Tạo danh mục thành công' });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/lookups/:id — ADMIN only. Updates label, sortOrder and/or isActive.
   *
   * A label change on a lookup that is still in use requires `confirmCascade`. Without
   * it the service raises `CascadeConfirmationRequiredError` and we return 409 with the
   * affected-record detail — nothing is written. With it, the cascade runs synchronously
   * inside this request (design.md Q1) and every write is one atomic transaction.
   */
  async update(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { label, sortOrder, isActive, confirmCascade } = req.body;

      const data = await lookupService.update(
        req.params.id,
        { label, sortOrder, isActive },
        { confirmCascade: confirmCascade === true, changedByUserId: req.user?.id ?? null }
      );

      res.json({ success: true, data, message: 'Cập nhật danh mục thành công' });
    } catch (error) {
      // Surface the confirmation detail the shared errorHandler would otherwise drop.
      if (error instanceof CascadeConfirmationRequiredError) {
        res.status(409).json({
          success: false,
          message: error.message,
          ...error.detail,
        });
        return;
      }
      next(error);
    }
  }

  /**
   * DELETE /api/lookups/:id — ADMIN only. SOFT delete: sets isActive=false.
   *
   * This never removes a row. The service refuses while any record still stores the
   * label; it signals that with a ConflictError, but the API contract for this specific
   * case is 400 (specs/lookup-crud/spec.md "Block deletion of in-use lookup"), so we
   * restatus it here rather than change tested service behaviour.
   */
  async remove(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await lookupService.softDelete(req.params.id, req.user?.id ?? null);
      res.json({ success: true, data, message: 'Đã ẩn danh mục' });
    } catch (error) {
      if (error instanceof ConflictError) {
        res.status(400).json({ success: false, message: error.message });
        return;
      }
      next(error);
    }
  }
}

export default new LookupController();
