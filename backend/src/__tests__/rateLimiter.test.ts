// Must mock env BEFORE any import that transitively imports @config/env
jest.mock('@config/env', () => ({
  isProduction: false,
  isDevelopment: true,
  env: {
    DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
    JWT_SECRET: 'test-secret',
    PORT: 5001,
    CORS_ORIGIN: 'http://localhost:5173',
    NODE_ENV: 'test',
  },
}));

jest.mock('@config/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

import { globalRateLimiter, loginRateLimiter, apiRateLimiter, getClientIp } from '@middlewares/rateLimiter';
import type { Request, Response } from 'express';

const mockResponse = () => {
  const res: Record<string, jest.Mock | unknown> = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    setHeader: jest.fn().mockReturnThis(),
    getHeader: jest.fn(),
    get: jest.fn(),
    end: jest.fn().mockReturnThis(),
    on: jest.fn(),
    removeHeader: jest.fn(),
    append: jest.fn().mockReturnThis(),
    writeHead: jest.fn(),
  };
  return res as unknown as Response;
};

const mockNext = jest.fn();

const mockRequest = (overrides: Partial<Request> = {}): Request => {
  const req = {
    headers: {},
    socket: { remoteAddress: '127.0.0.1' } as any,
    ip: '127.0.0.1',
    originalUrl: '/api/test',
    ...overrides,
  } as Request;
  return req;
};

describe('Rate Limiter Middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getClientIp', () => {
    it('should extract IP from x-forwarded-for header (single)', () => {
      const req = mockRequest({
        headers: { 'x-forwarded-for': '203.0.113.50' } as any,
      });
      expect(getClientIp(req)).toBe('203.0.113.50');
    });

    it('should extract first IP from x-forwarded-for (multiple)', () => {
      const req = mockRequest({
        headers: { 'x-forwarded-for': '203.0.113.50, 198.51.100.10, 192.0.2.1' } as any,
      });
      expect(getClientIp(req)).toBe('203.0.113.50');
    });

    it('should fallback to socket.remoteAddress', () => {
      const req = mockRequest({
        headers: {},
        socket: { remoteAddress: '10.0.0.5' } as any,
      });
      expect(getClientIp(req)).toBe('10.0.0.5');
    });

    it('should fallback to req.ip when socket is missing remoteAddress', () => {
      const req = mockRequest({
        headers: {},
        socket: {} as any,
        ip: '172.16.0.100',
      });
      expect(getClientIp(req)).toBe('172.16.0.100');
    });

    it('should handle array x-forwarded-for', () => {
      const req = mockRequest({
        headers: { 'x-forwarded-for': ['203.0.113.50', '198.51.100.10'] } as any,
      });
      expect(getClientIp(req)).toBe('203.0.113.50');
    });

    it('should trim whitespace from IP', () => {
      const req = mockRequest({
        headers: { 'x-forwarded-for': '  203.0.113.50  , 198.51.100.10  ' } as any,
      });
      expect(getClientIp(req)).toBe('203.0.113.50');
    });
  });

  describe('loginRateLimiter', () => {
    it('should call next() on first request (not rate limited yet)', async () => {
      const req = mockRequest({
        headers: { 'x-forwarded-for': '10.1.1.1' } as any,
      });
      const res = mockResponse();

      await loginRateLimiter(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should call next() for second request (still within limit)', async () => {
      const req = mockRequest({
        headers: { 'x-forwarded-for': '10.1.1.2' } as any,
      });
      const res = mockResponse();

      await loginRateLimiter(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('globalRateLimiter', () => {
    it('should skip rate limiting for /health endpoint', async () => {
      const req = mockRequest({ originalUrl: '/health' });
      const res = mockResponse();

      const limiter = globalRateLimiter as any;

      if (typeof limiter.skip === 'function') {
        expect(limiter.skip(req)).toBe(true);
      } else {
        await limiter(req, res, mockNext);
        expect(mockNext).toHaveBeenCalled();
      }
    });

    it('should call next() for normal first request', async () => {
      const req = mockRequest({ originalUrl: '/api/users' });
      const res = mockResponse();

      await globalRateLimiter(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('apiRateLimiter', () => {
    it('should call next() for first API request', async () => {
      const req = mockRequest({ originalUrl: '/api/employees' });
      const res = mockResponse();

      await apiRateLimiter(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });
});
