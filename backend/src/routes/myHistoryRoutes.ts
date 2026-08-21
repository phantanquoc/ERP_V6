import { Router } from 'express';
import { authenticate } from '@middlewares/auth';
import { requireRule } from '@middlewares/requireRule';
import { getMyHistoryHandler, getUserHistoryHandler } from '@controllers/myHistoryController';

const router = Router();

/**
 * GET /api/me/history
 * Authenticated user views their own personal history timeline.
 * Only requires authentication — no role restriction.
 */
router.get(
  '/me/history',
  authenticate,
  getMyHistoryHandler,
);

/**
 * GET /api/users/:userId/history
 * Manager views a subordinate's history.
 * ADMIN: bypass, any user.
 * DEPARTMENT_HEAD: same-department users only.
 * EMPLOYEE / TEAM_LEAD: 403.
 */
router.get(
  '/users/:userId/history',
  authenticate,
  requireRule('my-history', 'EXPORT'),
  getUserHistoryHandler,
);

export default router;
