/**
 * Rate Limiter Middleware
 * ─────────────────────────────────────────────────────────────────────────────
 * Implements tiered rate limiting to protect the API from abuse, brute-force
 * attacks, and accidental resource exhaustion.
 *
 * Tiers:
 *   1. Global    → 100 requests / minute / IP   (all endpoints)
 *   2. Login     →   5 requests / minute / IP   (login endpoint only)
 *   3. API       →  60 requests / minute / IP   (general API endpoints)
 *
 * All limiters use the client's real IP (supporting X-Forwarded-For for
 * reverse proxies / load balancers behind nginx/Docker).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { isDevelopment } from '@config/env';
import logger from '@config/logger';

/* ─────────────────────────────────────────────────────────────────────────────
   IP Extraction
   ───────────────────────────────────────────────────────────────────────────── */

/**
 * Extracts the client's real IP address from the request.
 *
 * Priority:
 *   1. X-Forwarded-For header  (first comma-separated IP)
 *   2. socket.remoteAddress    (direct TCP connection)
 *   3. req.ip                  (Express parsed IP)
 *
 * Why this order?
 *   • X-Forwarded-For is set by nginx / reverse proxy → contains the *actual*
 *     client IP before it was NAT'ted or proxied.
 *   • socket.remoteAddress is the direct TCP peer — reliable for local dev.
 *   • req.ip is Express's fallback, also reliable.
 *
 * @param req - Express Request object
 * @returns The client's IP as a string, or 'unknown' if none found
 */
export function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];

  if (typeof forwarded === 'string') {
    // Take the first IP in the comma-separated list (client IP, not proxies)
    return forwarded.split(',')[0].trim();
  }

  if (Array.isArray(forwarded)) {
    return forwarded[0].split(',')[0].trim();
  }

  // Optional chaining prevents TypeError when socket is undefined in tests
  return req.socket?.remoteAddress || req.ip || 'unknown';
}

/* ─────────────────────────────────────────────────────────────────────────────
   Rate Limit Configuration Constants
   ───────────────────────────────────────────────────────────────────────────── */

const WINDOW_MS        = 60 * 1000;   // 1-minute sliding window
const GLOBAL_MAX       = 100;         // requests per window (global)
const LOGIN_MAX        = 5;           // login attempts per window (brute-force protection)
const API_MAX          = 60;          // API requests per window

/* ─────────────────────────────────────────────────────────────────────────────
   Shared Handler Factory
   ───────────────────────────────────────────────────────────────────────────── */

/**
 * Creates a consistent rate-limit error response (JSON, not HTML).
 *
 * @param scope     - Human-readable label for log correlation (e.g. 'Login', 'Global')
 * @param retrySecs - Seconds until the client may retry (shown to user)
 */
function buildRateLimitHandler(scope: string, retrySecs: number) {
  return (_req: Request, res: Response) => {
    const ip = getClientIp(_req);
    logger.warn(`Rate limit exceeded [${scope}]`, { ip });

    res.status(429).json({
      success:   false,
      message:   `Quá nhiều yêu cầu. Vui lòng thử lại sau ${retrySecs} giây.`,
      retryAfter: retrySecs,
    });
  };
}

/* ─────────────────────────────────────────────────────────────────────────────
   Tier 1: Global Rate Limiter
   ───────────────────────────────────────────────────────────────────────────── */

/**
 * Global rate limiter applied to ALL routes via `app.use(globalRateLimiter)`.
 *
 * Limits: 100 requests / minute / unique IP
 *
 * Skipped:
 *   • GET /health  — health checks should never be rate-limited (load balancer
 *                   probes rely on it to determine container health).
 */
export const globalRateLimiter = rateLimit({
  windowMs:  WINDOW_MS,
  max:       GLOBAL_MAX,

  // Return RFC-compliant RateLimit-* headers so clients can self-throttle
  standardHeaders: true,   // `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset`
  legacyHeaders:   false,  // disable old `X-RateLimit-*` headers

  // Use real client IP, not Express's proxy-detected IP (already handled in getClientIp)
  keyGenerator: (req: Request) => getClientIp(req),

  // 429 response format
  handler: buildRateLimitHandler('Global', 60),

  // Bypass rate limiting for the health endpoint
  skip: (req: Request) => req.originalUrl === '/health',
});

/* ─────────────────────────────────────────────────────────────────────────────
   Tier 2: Login Rate Limiter
   ───────────────────────────────────────────────────────────────────────────── */

/**
 * Strict per-IP rate limiter specifically for the `/api/auth/login` route.
 *
 * Limits: 5 attempts / minute / IP
 *
 * Rationale:
 *   Combined with `ipBlockCheck` middleware, this forms a two-layer defence:
 *     1. loginRateLimiter  → blocks fast brute-force (5 req/min)
 *     2. ipBlock          → blocks sustained brute-force (3 failures → 5 min hard block)
 *
 * The 5-attempt burst is generous enough for normal users who mistype their
 * password once or twice, but tight enough to stop scripted attacks.
 */
export const loginRateLimiter = rateLimit({
  windowMs:  WINDOW_MS,
  max:       LOGIN_MAX,
  standardHeaders: true,
  legacyHeaders:   false,
  keyGenerator: (req: Request) => getClientIp(req),

  handler: (_req: Request, res: Response) => {
    const ip = getClientIp(_req);
    logger.warn('Login rate limit exceeded', { ip });
    res.status(429).json({
      success:   false,
      message:   'Quá nhiều lần đăng nhập. Vui lòng thử lại sau 1 phút.',
      retryAfter: 60,
    });
  },
});

/* ─────────────────────────────────────────────────────────────────────────────
   Tier 3: API Rate Limiter
   ───────────────────────────────────────────────────────────────────────────── */

/**
 * Medium-tier rate limiter for general API endpoints.
 *
 * Limits: 60 requests / minute / IP
 *
 * Use this for route-level protection on sensitive endpoints (e.g. data export,
 * batch operations, search) where the global limiter is too permissive.
 *
 * @example
 * ```typescript
 * router.get('/reports/export', apiRateLimiter, reportController.export);
 * ```
 */
export const apiRateLimiter = rateLimit({
  windowMs:  WINDOW_MS,
  max:       API_MAX,
  standardHeaders: true,
  legacyHeaders:   false,
  keyGenerator: (req: Request) => getClientIp(req),

  handler: buildRateLimitHandler('API', 60),
});

/* ─────────────────────────────────────────────────────────────────────────────
   Conditional Limiter (Dev-Only Bypass)
   ───────────────────────────────────────────────────────────────────────────── */

/**
 * Wraps a rate limiter so it is skipped in development environments.
 *
 * Use this when you want to test rate-limiting behaviour locally without
 * constantly hitting limits while debugging.
 *
 * @param limiter   - The express-rate-limit instance to wrap
 * @param skipInDev - If true (default), skips in NODE_ENV=development
 *
 * @example
 * ```typescript
 * const devLoginLimiter = createConditionalLimiter(loginRateLimiter);
 * router.post('/login', devLoginLimiter, authController.login);
 * ```
 */
export function createConditionalLimiter(
  limiter: ReturnType<typeof rateLimit>,
  skipInDev = true
) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (skipInDev && isDevelopment) {
      return next();
    }
    return limiter(req, res, next);
  };
}
