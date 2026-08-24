import type { Request } from 'express';
import rateLimit, { type Store } from 'express-rate-limit';
import RedisStore, { type RedisReply } from 'rate-limit-redis';
import { env } from '@config/env';
import redis from '@config/redis';
import logger from '@config/logger';

const isDev = env.NODE_ENV === 'development';

/**
 * Resolve the client IP for rate-limit bucketing.
 *
 * The previous implementation read `x-forwarded-for` verbatim. That header is
 * attacker-controlled: nginx is configured with `$proxy_add_x_forwarded_for`, which
 * APPENDS the real IP to whatever the client sent, so a request carrying
 * `X-Forwarded-For: 1.1.1.1` arrives as `1.1.1.1, <real-ip>`. Using the whole string as
 * the key meant a caller could mint a fresh bucket per request and bypass every limit
 * simply by varying that header.
 *
 * `X-Real-IP` is set by nginx to `$remote_addr` (see nginx conf) and overwrites anything
 * the client sent, so it cannot be spoofed from outside. We prefer it, then fall back to
 * `req.ip` — which is trustworthy because `trust proxy` is enabled in index.ts — and only
 * then to the LAST entry of x-forwarded-for, the hop nginx itself appended.
 */
function resolveClientIp(req: Request): string {
  const realIp = req.headers['x-real-ip'];
  if (typeof realIp === 'string' && realIp.trim()) return realIp.trim();

  if (req.ip) return req.ip;

  const xff = req.headers['x-forwarded-for'];
  if (typeof xff === 'string' && xff.trim()) {
    // Last hop is the one appended by our own proxy; earlier entries are client-supplied.
    const parts = xff.split(',').map((s) => s.trim()).filter(Boolean);
    const last = parts[parts.length - 1];
    if (last) return last;
  }

  return 'unknown';
}

function createStore(prefix: string): Store | undefined {
  try {
    return new RedisStore({
      sendCommand: (...args: string[]): Promise<RedisReply> =>
        redis.call(args[0], ...args.slice(1)) as Promise<RedisReply>,
      prefix: `rl:${prefix}:`,
    });
  } catch (err) {
    logger.warn(`Redis store init failed for ${prefix}, using in-memory fallback`);
    return undefined;
  }
}

export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: isDev ? 2000 : 1000,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  store: createStore('global'),
  message: { success: false, message: 'Quá nhiều request, vui lòng thử lại sau' },
  keyGenerator: resolveClientIp,
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: isDev ? 100 : 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  store: createStore('auth'),
  message: { success: false, message: 'Quá nhiều lần thử đăng nhập, vui lòng thử lại sau 15 phút' },
  keyGenerator: resolveClientIp,
});

export const kioskLimiter = rateLimit({
  windowMs: 60 * 1000,
  // 1 ca ~40 người chấm công dồn dập lúc vào ca (thường cùng 1 IP kiosk):
  // validate-device + verify + retry ≈ 3 req/người → 120 req/phút phủ thoải mái.
  limit: isDev ? 600 : 120,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  store: createStore('kiosk'),
  message: { success: false, message: 'Quá nhiều request, vui lòng thử lại sau 1 phút' },
  keyGenerator: resolveClientIp,
});

export const sensitiveRouteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: isDev ? 200 : 100,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  store: createStore('sensitive'),
  message: { success: false, message: 'Quá nhiều request, vui lòng thử lại sau' },
  keyGenerator: resolveClientIp,
});
