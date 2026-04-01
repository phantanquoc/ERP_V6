/**
 * IP Blocking Middleware
 * ─────────────────────────────────────────────────────────────────────────────
 * Implements IP-based brute-force attack protection by maintaining a blocklist
 * of IP addresses in the database.
 *
 * How it works:
 *   1. Every failed login attempt is recorded in the `login_attempts` table.
 *   2. After 3 failed attempts within a 5-minute window → IP is blocked for 1 min.
 *   3. The block is automatically lifted when it expires (no cron job needed).
 *   4. Admins can manually unblock IPs via the API.
 *
 * Two-layer defence with rateLimiter:
 *   ┌─────────────────────────────────────────────────────────┐
 *   │  Layer 1: express-rate-limit (loginRateLimiter)        │
 *   │  → Blocks at 5 requests / min (fast attacks)          │
 *   │                                                         │
 *   │  Layer 2: IP blocking (this module)                     │
 *   │  → Hard block after 3 failures (sustained attacks)    │
 *   └─────────────────────────────────────────────────────────┘
 *
 * Fail-open: if the database check fails, the request is allowed through and
 * an error is logged. This prioritises availability over strict blocking.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { Request, Response, NextFunction } from 'express';
import prisma from '@config/database';
import logger from '@config/logger';
import { getClientIp } from './rateLimiter';

/* ─────────────────────────────────────────────────────────────────────────────
   Constants
   ───────────────────────────────────────────────────────────────────────────── */

/**
 * Number of consecutive failed login attempts before an IP is blocked.
 * Set to 3 as a reasonable balance between security and user experience
 * (user might mistype once or twice before remembering the correct password).
 */
const FAILED_ATTEMPTS_THRESHOLD = 3;

/**
 * Time window (in milliseconds) for counting failed attempts.
 * Only failures within this window are counted toward the threshold.
 */
const ATTEMPT_WINDOW_MS = 5 * 60 * 1000;   // 5 minutes

/**
 * How long an IP remains blocked after being flagged.
 * 5 minutes is long enough to frustrate automated attacks without being
 * overly punishing to a legitimate user who genuinely forgot their password.
 */
const BLOCK_DURATION_MS = 60 * 1000;          // 1 minute

/* ─────────────────────────────────────────────────────────────────────────────
   Middleware: Check if Client IP is Blocked
   ───────────────────────────────────────────────────────────────────────────── */

/**
 * Express middleware that runs BEFORE the login route handler.
 *
 * Checks whether the requesting IP is currently on the blocklist.
 * If blocked, returns HTTP 403 immediately — the login handler is never reached.
 *
 * Auto-cleanup: if the block has already expired, it is deactivated and the
 * request is allowed through. This avoids stale rows accumulating in the DB.
 *
 * @param req - Express Request (IP extracted via getClientIp)
 * @param res - Express Response (returns 403 if blocked)
 * @param next - Pass control to next middleware (only if not blocked)
 *
 * @example
 * ```typescript
 * router.post('/login',
 *   ipBlockCheck,           // ← blocks banned IPs before anything else
 *   loginRateLimiter,
 *   validate(loginSchema),
 *   authController.login
 * );
 * ```
 */
export async function ipBlockCheck(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const ip = getClientIp(req);

  try {
    // ── Step 1: Look up the IP in the blocklist ──────────────────────────────
    const blocked = await prisma.blockedIp.findUnique({
      where: { ipAddress: ip },
    });

    // ── Step 2: No record found → allow through ───────────────────────────────
    if (!blocked || !blocked.isActive) {
      return next();
    }

    // ── Step 3: Check if the block has already expired ───────────────────────
    // This handles the race condition where:
    //   • The block was set at T=0
    //   • Current time is T=310s (past the 5-min expiry)
    //   • But the record still exists (not yet cleaned up)
    if (blocked.expiresAt < new Date()) {
      // ⚠️ SECURITY NOTE: auto-unblock on expiry. No admin action needed.
      // This keeps the blocked_ips table small without requiring a cron job.
      await prisma.blockedIp.update({
        where: { ipAddress: ip },
        data: {
          isActive:    false,
          unblockedAt: new Date(),
          unblockedBy: 'SYSTEM',   // Distinguishes auto-unblock from manual unblock
        },
      });
      logger.info(`IP auto-unblocked after expiry: ${ip}`);
      return next();
    }

    // ── Step 4: IP is actively blocked → reject the request ──────────────────
    const remainingSeconds = Math.ceil(
      (blocked.expiresAt.getTime() - Date.now()) / 1000
    );
    const remainingMinutes = Math.ceil(remainingSeconds / 60);

    logger.warn(`Blocked IP attempted login: ${ip}`, {
      reason:           blocked.reason,
      remainingSeconds,
      originalBlockAt: blocked.blockedAt,
    });

    res.status(403).json({
      success:      false,
      message:      `Địa chỉ IP đã bị khóa tạm thời. Vui lòng thử lại sau ${remainingMinutes} phút.`,
      blockedUntil:  blocked.expiresAt.toISOString(),
      retryAfter:   remainingSeconds,
    });

  } catch (error) {
    // ── Fail-open: if DB check fails, allow the request ─────────────────────
    // Rationale: blocking all users due to a DB outage is worse than allowing
    // a few requests through. Log the error so DevOps is alerted.
    logger.error('IP block check failed, allowing request:', error);
    next();
  }
}

/* ─────────────────────────────────────────────────────────────────────────────
   Record Failed Login Attempt
   ───────────────────────────────────────────────────────────────────────────── */

/**
 * Records a failed login attempt and automatically blocks the IP
 * if the failure threshold is reached.
 *
 * Call this in the `catch` block of your login controller — after any auth
 * failure (wrong password, inactive account, etc.), not just "wrong password".
 *
 * Flow:
 *   1. INSERT a new row into `login_attempts`
 *   2. COUNT recent failures for this IP (within ATTEMPT_WINDOW_MS)
 *   3. If count >= FAILED_ATTEMPTS_THRESHOLD → UPSERT a block record
 *
 * @param ip   - Client IP address
 * @param email - Associated email (optional, for audit log context)
 * @returns Object with `blocked` flag and current `attempts` count
 *
 * @example
 * ```typescript
 * catch (error) {
 *   await recordFailedAttempt(getClientIp(req), email);
 *   res.status(401).json({ success: false, message: error.message });
 * }
 * ```
 */
export async function recordFailedAttempt(
  ip: string,
  email?: string
): Promise<{ blocked: boolean; attempts: number }> {
  try {
    // ── Step 1: Persist the failed attempt ────────────────────────────────────
    await prisma.loginAttempt.create({
      data: {
        ipAddress: ip,
        email:     email ?? null,   // null = not provided / not applicable
        success:   false,
        expiresAt: new Date(Date.now() + ATTEMPT_WINDOW_MS), // auto-cleanup hint
      },
    });

    // ── Step 2: Count failures in the rolling window ─────────────────────────
    const recentAttempts = await prisma.loginAttempt.count({
      where: {
        ipAddress:   ip,
        success:      false,
        attemptedAt: {
          gte: new Date(Date.now() - ATTEMPT_WINDOW_MS),
        },
      },
    });

    logger.info(`Failed login attempt recorded: ${ip}`, {
      email,
      attempts:       recentAttempts,
      threshold:      FAILED_ATTEMPTS_THRESHOLD,
      windowMs:        ATTEMPT_WINDOW_MS,
    });

    // ── Step 3: Check if threshold is reached ─────────────────────────────────
    if (recentAttempts < FAILED_ATTEMPTS_THRESHOLD) {
      return { blocked: false, attempts: recentAttempts };
    }

    // ── Step 4: Block the IP ──────────────────────────────────────────────────
    // Check if already blocked to avoid redundant upsert (idempotent)
    const existingBlock = await prisma.blockedIp.findUnique({
      where: { ipAddress: ip },
    });

    if (existingBlock?.isActive) {
      // Already blocked — just return, don't re-upsert
      logger.warn(`IP already blocked: ${ip}`);
      return { blocked: true, attempts: recentAttempts };
    }

    await prisma.blockedIp.upsert({
      where: { ipAddress: ip },
      update: {
        isActive:    true,
        blockedAt:   new Date(),
        expiresAt:   new Date(Date.now() + BLOCK_DURATION_MS),
        reason:      'TOO_MANY_FAILED_ATTEMPTS',
        unblockedAt: null,
        unblockedBy: null,
      },
      create: {
        ipAddress:  ip,
        reason:     'TOO_MANY_FAILED_ATTEMPTS',
        blockedAt:  new Date(),
        expiresAt:  new Date(Date.now() + BLOCK_DURATION_MS),
        isActive:   true,
      },
    });

    logger.warn(`IP BLOCKED after ${FAILED_ATTEMPTS_THRESHOLD} failed attempts: ${ip}`, {
      email,
      blockedUntil: new Date(Date.now() + BLOCK_DURATION_MS).toISOString(),
    });

    return { blocked: true, attempts: recentAttempts };

  } catch (error) {
    // Graceful degradation: if recording fails, don't block the login flow
    logger.error('recordFailedAttempt error:', error);
    return { blocked: false, attempts: 0 };
  }
}

/* ─────────────────────────────────────────────────────────────────────────────
   Record Successful Login
   ───────────────────────────────────────────────────────────────────────────── */

/**
 * Clears all recorded failed attempts for an IP upon successful login.
 *
 * This resets the failure counter so the user doesn't get blocked for their
 * previous failed attempts after successfully logging in.
 *
 * @param ip - Client IP address of the successful login
 *
 * @example
 * ```typescript
 * const result = await authService.login(email, password, { ipAddress });
 * await recordSuccessfulLogin(ipAddress);  // clean up old failures
 * res.status(200).json({ success: true, data: result });
 * ```
 */
export async function recordSuccessfulLogin(ip: string): Promise<void> {
  try {
    // DELETE (not UPDATE) — we don't need audit history of old failures
    await prisma.loginAttempt.deleteMany({
      where: {
        ipAddress: ip,
        success:   false,
      },
    });
  } catch (error) {
    // Non-critical: login already succeeded, just log the cleanup failure
    logger.error('recordSuccessfulLogin error:', error);
  }
}

/* ─────────────────────────────────────────────────────────────────────────────
   Admin: List Blocked IPs
   ───────────────────────────────────────────────────────────────────────────── */

/**
 * Returns all currently active blocked IP addresses.
 * Used by the admin panel to display and manage the blocklist.
 *
 * @returns Array of blocked IP records (id, ipAddress, reason, blockedAt, expiresAt)
 *
 * @example
 * ```typescript
 * // GET /api/auth/admin/blocked-ips
 * const blocked = await getBlockedIps();
 * res.json({ success: true, data: blocked });
 * ```
 */
export async function getBlockedIps() {
  return prisma.blockedIp.findMany({
    where: { isActive: true },
    orderBy: { blockedAt: 'desc' },
    select: {
      ipAddress: true,
      reason:    true,
      blockedAt: true,
      expiresAt: true,
    },
  });
}

/* ─────────────────────────────────────────────────────────────────────────────
   Admin: Manual Unblock
   ───────────────────────────────────────────────────────────────────────────── */

/**
 * Manually removes an IP from the blocklist (admin action).
 *
 * Used when:
 *   • A legitimate user is blocked and needs immediate access
 *   • Security team has verified the IP is safe
 *
 * @param ipAddress - The IP address to unblock
 * @param adminId   - ID of the admin performing the unblock (for audit trail)
 * @returns true if unblocked successfully, false if DB operation failed
 *
 * @example
 * ```typescript
 * // POST /api/auth/admin/unblock  { ipAddress: '1.2.3.4' }
 * const ok = await unblockIp(ipAddress, req.user.id);
 * res.json({ success: ok, message: ok ? 'Đã mở khóa IP' : 'Không thể mở khóa' });
 * ```
 */
export async function unblockIp(ipAddress: string, adminId: string): Promise<boolean> {
  try {
    await prisma.blockedIp.update({
      where: { ipAddress },
      data: {
        isActive:    false,
        unblockedAt: new Date(),
        unblockedBy: adminId,
      },
    });
    logger.info(`IP manually unblocked: ${ipAddress} by admin ${adminId}`);
    return true;
  } catch (error) {
    logger.error('unblockIp error:', error);
    return false;
  }
}
