import rateLimit from 'express-rate-limit';
import RedisStore, { type RedisReply } from 'rate-limit-redis';
import { env } from '@config/env';
import redis from '@config/redis';

const isDev = env.NODE_ENV === 'development';

function createRedisStore(prefix: string) {
  return new RedisStore({
    sendCommand: (...args: string[]): Promise<RedisReply> =>
      redis.call(args[0], ...args.slice(1)) as Promise<RedisReply>,
    prefix: `rl:${prefix}:`,
  });
}

export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: isDev ? 2000 : 1000,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  store: createRedisStore('global'),
  message: { success: false, message: 'Quá nhiều request, vui lòng thử lại sau' },
  keyGenerator: (req) => {
    return req.headers['x-forwarded-for'] as string || req.ip || 'unknown';
  },
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: isDev ? 100 : 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  store: createRedisStore('auth'),
  message: { success: false, message: 'Quá nhiều lần thử đăng nhập, vui lòng thử lại sau 15 phút' },
  keyGenerator: (req) => {
    return req.headers['x-forwarded-for'] as string || req.ip || 'unknown';
  },
});

export const sensitiveRouteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: isDev ? 200 : 100,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  store: createRedisStore('sensitive'),
  message: { success: false, message: 'Quá nhiều request, vui lòng thử lại sau' },
  keyGenerator: (req) => {
    return req.headers['x-forwarded-for'] as string || req.ip || 'unknown';
  },
});
