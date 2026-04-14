/**
 * HTTP-level API Tests dùng Supertest
 *
 * Các test này kiểm tra endpoint thực sự từ HTTP request đến HTTP response,
 * bao gồm middleware stack (auth, rate limit, validation, etc.).
 * DB được mock hoàn toàn — không cần PostgreSQL thật.
 */

// Mock env TRƯỚC mọi import
jest.mock('@config/env', () => ({
  isProduction: false,
  isDevelopment: true,
  env: {
    DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
    JWT_SECRET: 'test-secret-minimum-64-chars-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    PORT: 5001,
    CORS_ORIGIN: 'http://localhost:5173',
    NODE_ENV: 'test',
  },
}));

jest.mock('@config/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

// Mock toàn bộ prisma client
jest.mock('@config/database', () => ({
  __esModule: true,
  default: {
    user: { findUnique: jest.fn(), create: jest.fn() },
    refreshToken: { findFirst: jest.fn(), create: jest.fn(), deleteMany: jest.fn() },
    blockedIp: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
    loginAttempt: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
    loginHistory: { create: jest.fn() },
    department: { findMany: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() },
    notification: { findMany: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn(), updateMany: jest.fn(), count: jest.fn() },
    attendance: { findMany: jest.fn(), findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
    employee: { findUnique: jest.fn() },
    subDepartment: { findUnique: jest.fn() },
  },
}));

jest.mock('@services/websocket', () => ({
  initWebSocket: jest.fn(),
  closeWebSocket: jest.fn(),
  pushNotification: jest.fn(),
  broadcast: jest.fn(),
  getConnectionStats: jest.fn().mockReturnValue({ totalClients: 0, employeeConnections: {} }),
  getConnectedCount: jest.fn().mockReturnValue(0),
  clientsByEmployee: new Map(),
}));

jest.mock('@utils/helpers', () => ({
  hashPassword: jest.fn().mockResolvedValue('hashed-password'),
  comparePassword: jest.fn(),
  generateAccessToken: jest.fn().mockReturnValue('mock-access-token'),
  generateRefreshToken: jest.fn().mockReturnValue('mock-refresh-token'),
  verifyRefreshToken: jest.fn(),
  getPaginationParams: jest.fn().mockReturnValue({ page: 1, limit: 10, skip: 0 }),
  calculateTotalPages: jest.fn().mockReturnValue(1),
  generateEmployeeCode: jest.fn().mockReturnValue('NV001'),
}));

import request from 'supertest';
import app from '../index';
import prisma from '@config/database';
import { UserRole } from '@types';

const mockedPrisma = prisma as jest.Mocked<typeof prisma>;
const mockedCompare = require('@utils/helpers').comparePassword as jest.Mock;

/* ─────────────────────────────────────────────────────────────────────────────
   Helpers
   ───────────────────────────────────────────────────────────────────────────── */

const makeUser = (overrides = {}) => ({
  id: 'user-1',
  email: 'test@anbinhfoods.net',
  password: 'hashed-password',
  firstName: 'An',
  lastName: 'Binh',
  role: UserRole.EMPLOYEE,
  isActive: true,
  departmentId: null,
  subDepartmentId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

/* ─────────────────────────────────────────────────────────────────────────────
   Health check
   ───────────────────────────────────────────────────────────────────────────── */

describe('GET /health', () => {
  it('should return 200 with status OK', async () => {
    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('OK');
    expect(res.body.timestamp).toBeDefined();
  });
});

/* ─────────────────────────────────────────────────────────────────────────────
   Auth endpoints
   ───────────────────────────────────────────────────────────────────────────── */

describe('POST /api/auth/login', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // IP block check — không block
    (mockedPrisma.blockedIp.findFirst as jest.Mock).mockResolvedValue(null);
    // Rate limit attempt
    (mockedPrisma.loginAttempt.findFirst as jest.Mock).mockResolvedValue(null);
  });

  it('should return 400 when body is missing email or password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({}) // thiếu email + password
      .set('Content-Type', 'application/json');

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('should return 401 when credentials are invalid', async () => {
    (mockedPrisma.user.findUnique as jest.Mock).mockResolvedValue(makeUser());
    mockedCompare.mockResolvedValue(false); // sai mật khẩu
    (mockedPrisma.loginAttempt.create as jest.Mock).mockResolvedValue({});
    (mockedPrisma.loginHistory.create as jest.Mock).mockResolvedValue({});

    const res = await request(app)
      .post('/api/auth/login')
      .send({ identifier: 'test@anbinhfoods.net', password: 'wrong-pass' })
      .set('Content-Type', 'application/json');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('should return 200 with tokens on successful login', async () => {
    const mockUser = makeUser();
    (mockedPrisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
    mockedCompare.mockResolvedValue(true);
    (mockedPrisma.department.findUnique as jest.Mock).mockResolvedValue(null);
    (mockedPrisma.subDepartment.findUnique as jest.Mock).mockResolvedValue(null);
    (mockedPrisma.employee.findUnique as jest.Mock).mockResolvedValue(null);
    (mockedPrisma.refreshToken.create as jest.Mock).mockResolvedValue({});
    (mockedPrisma.loginHistory.create as jest.Mock).mockResolvedValue({});
    (mockedPrisma.loginAttempt.create as jest.Mock).mockResolvedValue({});

    const res = await request(app)
      .post('/api/auth/login')
      .send({ identifier: 'test@anbinhfoods.net', password: 'password123' })
      .set('Content-Type', 'application/json');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();
  });
});

/* ─────────────────────────────────────────────────────────────────────────────
   Debug routes (dev only)
   ───────────────────────────────────────────────────────────────────────────── */

describe('GET /api/debug/ws-status', () => {
  it('should be accessible in non-production environment', async () => {
    // isProduction = false (set in mock above)
    const res = await request(app).get('/api/debug/ws-status');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
  });
});

/* ─────────────────────────────────────────────────────────────────────────────
   404 handler
   ───────────────────────────────────────────────────────────────────────────── */

describe('Unknown routes', () => {
  it('should return 404 for unregistered endpoints', async () => {
    const res = await request(app).get('/api/nonexistent-route-xyz');

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});

/* ─────────────────────────────────────────────────────────────────────────────
   Department endpoints (protected routes)
   ───────────────────────────────────────────────────────────────────────────── */

describe('GET /api/departments', () => {
  it('should return 401 when Authorization header is missing', async () => {
    const res = await request(app).get('/api/departments');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('should return 401 when token is invalid', async () => {
    const res = await request(app)
      .get('/api/departments')
      .set('Authorization', 'Bearer invalid-token-here');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});
