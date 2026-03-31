/**
 * Authentication & Authorization Middleware
 * ─────────────────────────────────────────────────────────────────────────────
 * Handles JWT token verification and role-based access control (RBAC).
 *
 * Architecture:
 *   authenticate()  → verifies the JWT token, attaches user to req.user
 *   authorize()     → checks if the authenticated user has the required role
 *
 * Usage:
 *   router.get('/admin/users', authenticate, authorize('ADMIN'), controller);
 *   router.get('/profile',     authenticate, controller);
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { Response, NextFunction } from 'express';
import { verifyAccessToken } from '@utils/helpers';
import { AuthenticationError } from '@utils/errors';
import logger from '@config/logger';
import type { AuthenticatedRequest } from '@types';

/* ─────────────────────────────────────────────────────────────────────────────
   Authentication Middleware
   ───────────────────────────────────────────────────────────────────────────── */

/**
 * Verifies the Bearer JWT token from the Authorization header.
 *
 * On success:
 *   • Decoded JWT payload is attached to `req.user`
 *   • Control is passed to the next middleware (`next()`)
 *
 * On failure:
 *   • Returns HTTP 401 with a descriptive message
 *   • The error is NOT passed to `next()` (already handled here)
 *
 * @param req  - Express Request (must contain Authorization header)
 * @param res  - Express Response
 * @param next - Pass to next middleware (only on success)
 *
 * @example
 * ```typescript
 * // Authorization: Bearer eyJhbGciOiJIUzI1NiJ9...
 * router.get('/profile', authenticate, profileController.get);
 * ```
 */
export const authenticate = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  try {
    // Extract token from "Bearer <token>" format
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      // Do NOT throw — that would trigger the Express error handler
      // Instead, respond directly and return
      res.status(401).json({
        success: false,
        message: 'Không có token xác thực',
      });
      return;
    }

    const decoded = verifyAccessToken(token);
    req.user = decoded;
    next();

  } catch (error) {
    if (error instanceof AuthenticationError) {
      res.status(401).json({ success: false, message: error.message });
    } else {
      // Token verification failed for any other reason (expired, malformed, etc.)
      res.status(401).json({ success: false, message: 'Token không hợp lệ hoặc đã hết hạn' });
    }
  }
};

/* ─────────────────────────────────────────────────────────────────────────────
   Authorization Middleware
   ───────────────────────────────────────────────────────────────────────────── */

/**
 * Creates a middleware that enforces role-based access control (RBAC).
 *
 * Checks whether `req.user.role` is included in the allowed roles list.
 * Must be used AFTER `authenticate` — it reads `req.user` which is only set
 * by the authenticate middleware.
 *
 * @param allowedRoles - One or more role names that are permitted to access the route
 *                       Accepts both individual args and arrays: authorize('ADMIN')
 *                       or authorize(['ADMIN', 'DEPARTMENT_HEAD'])
 *
 * @returns Express middleware function
 *
 * @example
 * ```typescript
 * // Single role
 * router.delete('/users/:id', authenticate, authorize('ADMIN'), controller);
 *
 * // Multiple roles (ANY match grants access)
 * router.patch('/reports', authenticate, authorize(['ADMIN', 'DEPARTMENT_HEAD']), controller);
 * ```
 */
export const authorize = (...allowedRoles: string[]) => {
  return (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): void => {
    // ── Guard: ensure authenticate() ran before this ─────────────────────────
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Chưa xác thực — vui lòng đăng nhập trước',
      });
      return;
    }

    // Flatten in case an array was passed: authorize(['ADMIN', 'TEAM_LEAD'])
    const roles = allowedRoles.flat();

    // ── RBAC check ───────────────────────────────────────────────────────────
    if (!roles.includes(req.user.role)) {
      logger?.warn?.(`Unauthorized access attempt: role=${req.user.role}, required=${roles}`);
      res.status(403).json({
        success: false,
        message: 'Bạn không có quyền thực hiện thao tác này',
      });
      return;
    }

    next();
  };
};
