import redis from '@config/redis';
import logger from '@config/logger';

const DEFAULT_TTL = 300; // 5 minutes

export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const data = await redis.get(key);
    return data ? (JSON.parse(data) as T) : null;
  } catch {
    return null;
  }
}

export async function cacheSet(key: string, data: unknown, ttl: number = DEFAULT_TTL): Promise<void> {
  try {
    await redis.set(key, JSON.stringify(data), 'EX', ttl);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.warn('Cache set failed', { key, error: message });
  }
}

export async function cacheDel(...keys: string[]): Promise<void> {
  try {
    if (keys.length > 0) await redis.del(...keys);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.warn('Cache delete failed', { keys, error: message });
  }
}

/**
 * Delete every key matching a glob.
 *
 * Uses SCAN, not KEYS. `KEYS` walks the entire keyspace in one shot and BLOCKS the
 * single-threaded server for the whole traversal — on a busy instance that stalls every
 * other client, including the rate limiter. SCAN returns a cursor and yields between
 * batches, so the server stays responsive.
 *
 * Nothing calls this today. It is kept because pattern deletion is the natural thing to
 * reach for when a future cache uses composite keys — and the version that was here
 * before used KEYS, so the first person to reach for it would have shipped a stall.
 */
export async function cacheDelPattern(pattern: string): Promise<void> {
  try {
    let cursor = '0';
    do {
      const [next, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      cursor = next;
      if (keys.length > 0) await redis.del(...keys);
    } while (cursor !== '0');
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.warn('Cache pattern delete failed', { pattern, error: message });
  }
}

export const CACHE_KEYS = {
  DEPARTMENTS: 'cache:departments',
  SYSTEM_SETTINGS: 'cache:system-settings',
} as const;

// POSITIONS was declared here but never read. Removed rather than wired up: unlike
// departments, `getAllPositions` joins employees and their users, so the payload changes
// on every staffing edit. Caching it would mean every employee write path had to
// remember to invalidate — a correctness burden for 54 rows. Lookup groups are cached
// instead (see lookupService), where the data really is near-immutable.
