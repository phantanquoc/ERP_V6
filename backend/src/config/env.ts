import dotenv from 'dotenv';

dotenv.config();

const nodeEnv = process.env.NODE_ENV || 'development';

function getRequiredEnv(key: string, devFallback?: string): string {
  const value = process.env[key];
  if (value) return value;
  if (devFallback !== undefined && nodeEnv !== 'production') return devFallback;
  throw new Error(`Missing required environment variable: ${key}`);
}

export const env = {
  NODE_ENV: nodeEnv,
  PORT: parseInt(process.env.PORT || '5000', 10),
  API_URL: process.env.API_URL || 'http://localhost:5000',
  DATABASE_URL: getRequiredEnv('DATABASE_URL'),
  JWT_SECRET: getRequiredEnv('JWT_SECRET', 'dev_jwt_secret'),
  JWT_EXPIRE: process.env.JWT_EXPIRE || '7d',
  JWT_REFRESH_SECRET: getRequiredEnv('JWT_REFRESH_SECRET', 'dev_jwt_refresh_secret'),
  JWT_REFRESH_EXPIRE: process.env.JWT_REFRESH_EXPIRE || '30d',
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:5173',
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  MAX_FILE_SIZE: parseInt(process.env.MAX_FILE_SIZE || '104857600', 10), // 100MB
  UPLOAD_DIR: process.env.UPLOAD_DIR || './uploads',
};

export const isDevelopment = env.NODE_ENV === 'development';
export const isProduction = env.NODE_ENV === 'production';

