import type { Request, Response, NextFunction } from 'express';
import redis from '@config/redis';

/**
 * Idempotency guard for POST create endpoints.
 *
 * If the client sends `Idempotency-Key` header, the first request with that key
 * is executed and its response cached for 60s; duplicate requests within the window
 * return the cached response without re-executing the handler.
 *
 * Without the header, falls back to a per-user+path+body-hash dedup: identical
 * POST body from the same user within 10s is rejected with 409.
 *
 * Redis-backed; degrades to pass-through if Redis is unavailable.
 */
const IDEMPOTENCY_TTL = 60; // seconds for explicit key
const DEDUP_TTL = 10; // seconds for body-hash dedup

function hashBody(body: unknown): string {
  try {
    return JSON.stringify(body ?? {});
  } catch {
    return String(body);
  }
}

function simpleHash(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return String(h);
}

export function idempotency(req: Request, _res: Response, next: NextFunction): void {
  // Only guard POST create
  if (req.method !== 'POST') { next(); return; }

  const key = req.headers['idempotency-key'] as string | undefined;
  const userId = (req as unknown as { user?: { id?: string } }).user?.id;

  if (key && key.trim()) {
    const redisKey = `idem:${userId ?? 'anon'}:${key.trim()}`;
    redis.get(redisKey).then((cached) => {
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          // Replay cached response
          (_res as unknown as { status: (c: number) => unknown }).status(parsed.status ?? 200);
          (_res as unknown as { json: (b: unknown) => unknown }).json(parsed.body);
          return;
        } catch { /* fall through to handler */ }
      }
      // Mark as in-flight
      redis.set(redisKey, JSON.stringify({ inFlight: true }), 'EX', IDEMPOTENCY_TTL).catch(() => {});
      // Wrap res.json to cache the response
      const origJson = _res.json.bind(_res);
      (_res as unknown as { json: (b: unknown) => unknown }).json = ((body: unknown) => {
        redis.set(redisKey, JSON.stringify({ status: _res.statusCode, body }), 'EX', IDEMPOTENCY_TTL).catch(() => {});
        return origJson(body as never);
      }) as never;
      next();
    }).catch(() => next());
    return;
  }

  // Fallback: body-hash dedup (no header)
  if (!userId) { next(); return; }
  const bodyHash = simpleHash(hashBody(req.body));
  const dedupKey = `dedup:${userId}:${req.path}:${bodyHash}`;
  redis.get(dedupKey).then((exists) => {
    if (exists) {
      _res.status(409).json({ success: false, message: 'Yêu cầu trùng lặp — vui lòng đợi vài giây trước khi thử lại' });
      return;
    }
    redis.set(dedupKey, '1', 'EX', DEDUP_TTL).catch(() => {});
    next();
  }).catch(() => next());
}
