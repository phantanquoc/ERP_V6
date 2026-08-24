import { Router } from 'express';
import lookupController from '@controllers/lookupController';
import { authenticate } from '@middlewares/auth';
import { requireRule } from '@middlewares/requireRule';

const router = Router();

/**
 * Shared lookup (classification) routes — change: shared-lookup-table.
 *
 * ROUTE ORDER IS LOAD-BEARING. Express matches in declaration order, so every static
 * path must be declared before the parameterised `/:id` that would otherwise swallow it:
 * with `/:id` first, `GET /lookups/history` would bind `id = "history"` and return 404
 * "Không tìm thấy danh mục" instead of the history payload. The two-segment routes
 * (`/:id/usage`, `/:id/history`) are unambiguous against one-segment `/:id`, but are
 * kept above it so the whole file reads most-specific-first.
 *
 * Reads require only authentication; every mutation requires ADMIN.
 *
 * There is NO hard-delete route, and NO update/delete route for audit logs — history is
 * read-only and immutable (specs/lookup-audit-trail/spec.md). DELETE below maps to the
 * service's soft delete (isActive=false), which never removes a row.
 */

// --- Static paths first: must precede '/:id' ---
router.get('/history', authenticate, lookupController.getGroupHistory);

// --- Two-segment parameterised reads ---
router.get('/:id/usage', authenticate, lookupController.getUsage);
router.get('/:id/history', authenticate, lookupController.getHistory);

// --- Collection + single-segment parameterised routes ---
router.get('/', authenticate, lookupController.getAll);
router.get('/:id', authenticate, lookupController.getById);

// --- Mutations: ADMIN only ---
router.post('/', authenticate, requireRule('lookups', 'CREATE'), lookupController.create);
router.put('/:id', authenticate, requireRule('lookups', 'UPDATE'), lookupController.update);
// Soft delete only — sets isActive=false, never removes the row.
router.delete('/:id', authenticate, requireRule('lookups', 'CREATE'), lookupController.remove);

export default router;
