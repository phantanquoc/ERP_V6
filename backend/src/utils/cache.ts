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

export async function cacheDelPattern(pattern: string): Promise<void> {
  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) await redis.del(...keys);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.warn('Cache pattern delete failed', { pattern, error: message });
  }
}

export const CACHE_KEYS = {
  DEPARTMENTS: 'cache:departments',
  SYSTEM_SETTINGS: 'cache:system-settings',
  POSITIONS: 'cache:positions',
} as const;
