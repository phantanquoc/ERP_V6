import Redis from 'ioredis';
import { env } from '@config/env';
import logger from '@config/logger';

const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    if (times > 5) return null;
    return Math.min(times * 500, 5000);
  },
  reconnectOnError(err) {
    return err.message.includes('READONLY');
  },
});

redis.on('connect', () => logger.info('Redis connected'));
redis.on('error', (err) => logger.warn('Redis connection error — cache degraded', { error: err.message }));

export default redis;
