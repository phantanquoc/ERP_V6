import dotenv from 'dotenv';

dotenv.config();

const nodeEnv = process.env.NODE_ENV || 'development';

// Known weak/default values — must never be used in any environment
const WEAK_SECRETS = [
  'dev_jwt_secret',
  'dev_jwt_refresh_secret',
  'your_super_secret_jwt_key_change_me',
  'your_super_secret_refresh_key_change_me',
  'dev_face_data_secret_change_me',
  'erp_password_change_me',
];
const DEV_JWT_SECRET = 'dev_jwt_secret';
const DEV_JWT_REFRESH_SECRET = 'dev_jwt_refresh_secret';

function getRequiredEnv(key: string, devFallback?: string): string {
  const value = process.env[key];
  if (value) return value;
  if (devFallback !== undefined && nodeEnv !== 'production') {
    console.warn(
      `[CONFIG] ${key} not set — using insecure dev fallback. Set this env var before deploying.`
    );
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
  JWT_EXPIRE: process.env.JWT_EXPIRE || '30m',
  JWT_REFRESH_SECRET: getRequiredEnv('JWT_REFRESH_SECRET', DEV_JWT_REFRESH_SECRET),
  JWT_REFRESH_EXPIRE: process.env.JWT_REFRESH_EXPIRE || '30d',
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:5173',
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  MAX_FILE_SIZE: parseInt(process.env.MAX_FILE_SIZE || '104857600', 10), // 100MB
  UPLOAD_DIR: process.env.UPLOAD_DIR || './uploads',
  AI_SERVICE_URL: process.env.AI_SERVICE_URL || 'http://localhost:8001',
  FACE_DATA_SECRET: getRequiredEnv('FACE_DATA_SECRET', 'dev_face_data_secret_change_me'),
  APP_TIMEZONE: process.env.APP_TIMEZONE || 'Asia/Ho_Chi_Minh',
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
};

// CORS_ORIGIN must never be wildcard — it would allow any site to use credentials
if (env.CORS_ORIGIN.includes('*')) {
  throw new Error('[SECURITY] CORS_ORIGIN must not contain wildcard (*). Set explicit origins.');
}

// Defense-in-depth: refuse to start with weak placeholders in production.
// In development, dev fallbacks (dev_jwt_secret, etc.) are allowed — getRequiredEnv already warned.
// Only the production placeholder your_super_secret... is blocked everywhere.
if (nodeEnv === 'production' || process.env.FORCE_SECURE === '1') {
  const weakHit = [env.JWT_SECRET, env.JWT_REFRESH_SECRET, env.FACE_DATA_SECRET].find((v) =>
    WEAK_SECRETS.includes(v)
  );
  if (weakHit) {
    throw new Error(
      `[SECURITY] Refusing to start: secret "${weakHit}" is a known weak placeholder. Set real values for JWT_SECRET / JWT_REFRESH_SECRET / FACE_DATA_SECRET.`
    );
  }
} else {
  const prodWeakHit = [env.JWT_SECRET, env.JWT_REFRESH_SECRET].find(
    (v) => v === 'your_super_secret_jwt_key_change_me' || v === 'your_super_secret_refresh_key_change_me'
  );
  if (prodWeakHit) {
    throw new Error(
      `[SECURITY] Refusing to start: secret "${prodWeakHit}" is a production placeholder that must never be used, even in dev.`
    );
  }
}

export const isDevelopment = env.NODE_ENV === 'development';
export const isProduction = env.NODE_ENV === 'production';
