import dotenv from 'dotenv';

dotenv.config();

const nodeEnv = process.env.NODE_ENV || 'development';

// Known dev-only fallback values — used to detect insecure deployments
const DEV_JWT_SECRET = 'dev_jwt_secret';
const DEV_JWT_REFRESH_SECRET = 'dev_jwt_refresh_secret';

function getRequiredEnv(key: string, devFallback?: string): string {
  const value = process.env[key];
  if (value) return value;
  if (devFallback !== undefined && nodeEnv !== 'production') {
    console.warn(`[CONFIG] ${key} not set — using insecure dev fallback. Set this env var before deploying.`);
    return devFallback;
  }
  throw new Error(`Missing required environment variable: ${key}`);
}

export const env = {
  NODE_ENV: nodeEnv,
  PORT: parseInt(process.env.PORT || '5000', 10),
  API_URL: process.env.API_URL || 'http://localhost:5000',
  DATABASE_URL: getRequiredEnv('DATABASE_URL'),
  JWT_SECRET: getRequiredEnv('JWT_SECRET', DEV_JWT_SECRET),
  JWT_EXPIRE: process.env.JWT_EXPIRE || '7d',
  JWT_REFRESH_SECRET: getRequiredEnv('JWT_REFRESH_SECRET', DEV_JWT_REFRESH_SECRET),
  JWT_REFRESH_EXPIRE: process.env.JWT_REFRESH_EXPIRE || '30d',
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:5173',
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  MAX_FILE_SIZE: parseInt(process.env.MAX_FILE_SIZE || '104857600', 10), // 100MB
  UPLOAD_DIR: process.env.UPLOAD_DIR || './uploads',
  AI_SERVICE_URL: process.env.AI_SERVICE_URL || 'http://localhost:8001',
  FACE_DATA_SECRET: getRequiredEnv('FACE_DATA_SECRET', 'dev_face_data_secret_change_me'),
  APP_TIMEZONE: process.env.APP_TIMEZONE || 'Asia/Ho_Chi_Minh',
};

// Defense-in-depth: refuse to start if production-grade secrets were never set,
// regardless of NODE_ENV value (guards against misconfigured deployments).
if (env.JWT_SECRET === DEV_JWT_SECRET || env.JWT_REFRESH_SECRET === DEV_JWT_REFRESH_SECRET) {
  const isLikelyProd =
    process.env.DATABASE_URL?.includes('@postgres:') || // Docker internal hostname
    process.env.CORS_ORIGIN?.includes('anbinhfoods');   // Production domain
  if (isLikelyProd) {
    throw new Error(
      '[SECURITY] Refusing to start: JWT_SECRET / JWT_REFRESH_SECRET are using insecure dev fallbacks in a production-like environment. Set these env vars.'
    );
  }
}

export const isDevelopment = env.NODE_ENV === 'development';
export const isProduction = env.NODE_ENV === 'production';
