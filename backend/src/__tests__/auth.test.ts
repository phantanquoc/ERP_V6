import jwt from 'jsonwebtoken';
import {
  hashPassword,
  comparePassword,
  generateAccessToken,
  verifyAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from '@utils/helpers';
import { authenticate, authorize } from '@middlewares/auth';
import { env } from '@config/env';
import type { JwtPayload } from '@types';

// Mock helpers
const mockRequest = (overrides = {}) => ({
  headers: {},
  ...overrides,
} as any);

const mockResponse = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const mockNext = jest.fn();

const testPayload: JwtPayload = {
  id: 'user-123',
  email: 'test@example.com',
  role: 'admin',
  departmentId: 'dept-1',
  subDepartmentId: null,
};

// ─── Password Hashing ────────────────────────────────────────────────

describe('Password Hashing', () => {
  it('should hash a password', async () => {
    const password = 'SecurePass123';
    const hash = await hashPassword(password);
    expect(hash).toBeDefined();
    expect(hash).not.toBe(password);
  });

  it('should return true for correct password', async () => {
    const password = 'SecurePass123';
    const hash = await hashPassword(password);
    const result = await comparePassword(password, hash);
    expect(result).toBe(true);
  });

  it('should return false for incorrect password', async () => {
    const password = 'SecurePass123';
    const hash = await hashPassword(password);
    const result = await comparePassword('WrongPassword', hash);
    expect(result).toBe(false);
  });
});

// ─── JWT Tokens ──────────────────────────────────────────────────────

describe('JWT Tokens', () => {
  it('should generate and verify access token', () => {
    const token = generateAccessToken(testPayload);
    expect(token).toBeDefined();
    const decoded = verifyAccessToken(token);
    expect(decoded.id).toBe(testPayload.id);
    expect(decoded.email).toBe(testPayload.email);
    expect(decoded.role).toBe(testPayload.role);
  });

  it('should generate and verify refresh token', () => {
    const token = generateRefreshToken(testPayload);
    expect(token).toBeDefined();
    const decoded = verifyRefreshToken(token);
    expect(decoded.id).toBe(testPayload.id);
    expect(decoded.email).toBe(testPayload.email);
    expect(decoded.role).toBe(testPayload.role);
  });

  it('should throw for invalid token', () => {
    expect(() => verifyAccessToken('invalid.token.here')).toThrow();
  });

  it('should throw for expired token', () => {
    const token = jwt.sign(testPayload, env.JWT_SECRET, { expiresIn: '0s' });
    expect(() => verifyAccessToken(token)).toThrow();
  });

  it('token should contain correct payload fields', () => {
    const token = generateAccessToken(testPayload);
    const decoded = verifyAccessToken(token);
    expect(decoded).toMatchObject({
      id: testPayload.id,
      email: testPayload.email,
      role: testPayload.role,
      departmentId: testPayload.departmentId,
      subDepartmentId: testPayload.subDepartmentId,
    });
  });
});

// ─── authenticate Middleware ─────────────────────────────────────────

describe('authenticate middleware', () => {
  beforeEach(() => {
    mockNext.mockClear();
  });

  it('should call next() with valid token', () => {
    const token = generateAccessToken(testPayload);
    const req = mockRequest({ headers: { authorization: `Bearer ${token}` } });
    const res = mockResponse();

    authenticate(req, res, mockNext);

    expect(mockNext).toHaveBeenCalled();
  });

  it('should set req.user with decoded payload', () => {
    const token = generateAccessToken(testPayload);
    const req = mockRequest({ headers: { authorization: `Bearer ${token}` } });
    const res = mockResponse();

    authenticate(req, res, mockNext);

    expect(req.user).toBeDefined();
    expect(req.user.id).toBe(testPayload.id);
    expect(req.user.email).toBe(testPayload.email);
    expect(req.user.role).toBe(testPayload.role);
  });

  it('should return 401 when no authorization header', () => {
    const req = mockRequest();
    const res = mockResponse();

    authenticate(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Không có token xác thực',
    });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should return 401 when token is invalid', () => {
    const req = mockRequest({ headers: { authorization: 'Bearer invalidtoken' } });
    const res = mockResponse();

    authenticate(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Token không hợp lệ',
    });
  });

  it('should return 401 when token format is wrong (no Bearer prefix)', () => {
    const token = generateAccessToken(testPayload);
    const req = mockRequest({ headers: { authorization: token } });
    const res = mockResponse();

    authenticate(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(mockNext).not.toHaveBeenCalled();
  });
});

// ─── authorize Middleware ────────────────────────────────────────────

describe('authorize middleware', () => {
  beforeEach(() => {
    mockNext.mockClear();
  });

  it('should call next() when user has allowed role', () => {
    const req = mockRequest({ user: testPayload });
    const res = mockResponse();

    authorize('admin', 'manager')(req, res, mockNext);

    expect(mockNext).toHaveBeenCalled();
  });

  it('should return 403 when user role is not allowed', () => {
    const req = mockRequest({ user: testPayload });
    const res = mockResponse();

    authorize('employee')(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Truy cập bị từ chối',
    });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should return 401 when req.user is not set', () => {
    const req = mockRequest();
    const res = mockResponse();

    authorize('admin')(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Chưa xác thực',
    });
    expect(mockNext).not.toHaveBeenCalled();
  });
});
