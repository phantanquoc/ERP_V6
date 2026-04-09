// Mock env + logger TRƯỚC mọi import
jest.mock('@config/env', () => ({
  isProduction: false,
  isDevelopment: true,
  env: {
    DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
    JWT_SECRET: 'test-secret-minimum-64-chars-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    JWT_EXPIRE: '7d',
    JWT_REFRESH_SECRET: 'test-refresh-secret-minimum-64-chars-aaaaaaaaaaaaaaaaaaaaaaaaa',
    JWT_REFRESH_EXPIRE: '30d',
    PORT: 5001,
    CORS_ORIGIN: 'http://localhost:5173',
    NODE_ENV: 'test',
  },
}));

jest.mock('@config/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

// Mock loginHistoryService để không cần DB thật
jest.mock('@services/loginHistoryService', () => ({
  __esModule: true,
  default: { createLoginHistory: jest.fn().mockResolvedValue(undefined) },
}));

// Mock websocket forceDisconnectUser
jest.mock('@services/websocket', () => ({
  __esModule: true,
  forceDisconnectUser: jest.fn(),
}));

// Mock helpers — hash + token generation
jest.mock('@utils/helpers', () => ({
  hashPassword: jest.fn(),
  comparePassword: jest.fn(),
  generateAccessToken: jest.fn(),
  generateRefreshToken: jest.fn(),
  verifyRefreshToken: jest.fn(),
  getPaginationParams: jest.fn(),
  calculateTotalPages: jest.fn(),
}));

jest.mock('@config/database', () => ({
  __esModule: true,
  default: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    refreshToken: {
      create: jest.fn(),
      findFirst: jest.fn(),
      deleteMany: jest.fn(),
      count: jest.fn(),
    },
    department: {
      findUnique: jest.fn(),
    },
    subDepartment: {
      findUnique: jest.fn(),
    },
    employee: {
      findUnique: jest.fn(),
    },
  },
}));

import prisma from '@config/database';
import { AuthService } from '@services/authService';
import { hashPassword, comparePassword, generateAccessToken, generateRefreshToken } from '@utils/helpers';
import { ConflictError, ValidationError, AuthenticationError } from '@utils/errors';
import { UserRole } from '@types';
import { forceDisconnectUser } from '@services/websocket';

const service = new AuthService();
const mockedPrisma = prisma as jest.Mocked<typeof prisma>;
const mockedHash = hashPassword as jest.Mock;
const mockedCompare = comparePassword as jest.Mock;
const mockedAccessToken = generateAccessToken as jest.Mock;
const mockedRefreshToken = generateRefreshToken as jest.Mock;

/* ─────────────────────────────────────────────────────────────────────────────
   Helpers — mock data
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
   register
   ───────────────────────────────────────────────────────────────────────────── */

describe('AuthService', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('register', () => {
    it('should create user and return tokens when email is new', async () => {
      (mockedPrisma.user.findUnique as jest.Mock).mockResolvedValue(null); // email chưa tồn tại
      mockedHash.mockResolvedValue('hashed-password');
      (mockedPrisma.user.create as jest.Mock).mockResolvedValue(makeUser());
      (mockedPrisma.refreshToken.create as jest.Mock).mockResolvedValue({});
      mockedAccessToken.mockReturnValue('access-token-123');
      mockedRefreshToken.mockReturnValue('refresh-token-456');

      const result = await service.register('test@anbinhfoods.net', 'password123', 'An', 'Binh');

      expect(result.accessToken).toBe('access-token-123');
      expect(result.refreshToken).toBe('refresh-token-456');
      expect(result.user.email).toBe('test@anbinhfoods.net');
      expect(mockedHash).toHaveBeenCalledWith('password123');
    });

    it('should throw ConflictError when email already exists', async () => {
      (mockedPrisma.user.findUnique as jest.Mock).mockResolvedValue(makeUser());

      await expect(
        service.register('test@anbinhfoods.net', 'password123', 'An', 'Binh')
      ).rejects.toThrow(ConflictError);

      expect(mockedPrisma.user.create).not.toHaveBeenCalled();
    });

    it('should throw ValidationError when password is shorter than 6 characters', async () => {
      (mockedPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.register('new@anbinhfoods.net', '12345', 'An', 'Binh')
      ).rejects.toThrow(ValidationError);

      expect(mockedPrisma.user.create).not.toHaveBeenCalled();
    });

    it('should hash password with bcryptjs before saving', async () => {
      (mockedPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      mockedHash.mockResolvedValue('bcrypt-hash-output');
      (mockedPrisma.user.create as jest.Mock).mockResolvedValue(makeUser({ password: 'bcrypt-hash-output' }));
      (mockedPrisma.refreshToken.create as jest.Mock).mockResolvedValue({});
      mockedAccessToken.mockReturnValue('at');
      mockedRefreshToken.mockReturnValue('rt');

      await service.register('new@anbinhfoods.net', 'securePass', 'An', 'Binh');

      expect(mockedPrisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ password: 'bcrypt-hash-output' }),
        })
      );
    });
  });

  /* ─────────────────────────────────────────────────────────────────────────
     login
     ───────────────────────────────────────────────────────────────────────── */

  describe('login', () => {
    it('should return tokens and user on successful login', async () => {
      const mockUser = makeUser();
      // findUnique được gọi hai lần trong login: validate + fetch lại
      (mockedPrisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      mockedCompare.mockResolvedValue(true);
      (mockedPrisma.department.findUnique as jest.Mock).mockResolvedValue(null);
      (mockedPrisma.subDepartment.findUnique as jest.Mock).mockResolvedValue(null);
      (mockedPrisma.employee.findUnique as jest.Mock).mockResolvedValue(null);
      (mockedPrisma.refreshToken.count as jest.Mock).mockResolvedValue(0);
      (mockedPrisma.refreshToken.create as jest.Mock).mockResolvedValue({});
      mockedAccessToken.mockReturnValue('access-token');
      mockedRefreshToken.mockReturnValue('refresh-token');

      const result = await service.login('test@anbinhfoods.net', 'password123');

      expect(result.accessToken).toBe('access-token');
      expect(result.user.email).toBe('test@anbinhfoods.net');
    });

    it('should throw AuthenticationError when email does not exist', async () => {
      (mockedPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.login('nobody@anbinhfoods.net', 'password123')
      ).rejects.toThrow(AuthenticationError);
    });

    it('should throw AuthenticationError when password is wrong', async () => {
      (mockedPrisma.user.findUnique as jest.Mock).mockResolvedValue(makeUser());
      mockedCompare.mockResolvedValue(false); // sai mật khẩu

      await expect(
        service.login('test@anbinhfoods.net', 'wrong-password')
      ).rejects.toThrow(AuthenticationError);
    });

    it('should throw AuthenticationError when user account is inactive', async () => {
      (mockedPrisma.user.findUnique as jest.Mock).mockResolvedValue(makeUser({ isActive: false }));
      mockedCompare.mockResolvedValue(true);

      await expect(
        service.login('test@anbinhfoods.net', 'password123')
      ).rejects.toThrow(AuthenticationError);
    });

    it('should include employee data in response when employee record exists', async () => {
      const mockUser = makeUser();
      const mockEmployee = {
        id: 'emp-1',
        employeeCode: 'NV001',
        userId: 'user-1',
        position: { id: 'pos-1', name: 'Nhân viên' },
        positionLevel: { id: 'level-1', level: 1, baseSalary: 5000000, kpiSalary: 1000000 },
      };

      (mockedPrisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      mockedCompare.mockResolvedValue(true);
      (mockedPrisma.department.findUnique as jest.Mock).mockResolvedValue(null);
      (mockedPrisma.subDepartment.findUnique as jest.Mock).mockResolvedValue(null);
      (mockedPrisma.employee.findUnique as jest.Mock).mockResolvedValue(mockEmployee);
      (mockedPrisma.refreshToken.count as jest.Mock).mockResolvedValue(0);
      (mockedPrisma.refreshToken.create as jest.Mock).mockResolvedValue({});
      mockedAccessToken.mockReturnValue('at');
      mockedRefreshToken.mockReturnValue('rt');

      const result = await service.login('test@anbinhfoods.net', 'password123');

      expect(result.employee).toBeDefined();
      expect(result.employee?.employeeCode).toBe('NV001');
    });

    // ─── Single-IP Session Enforcement Tests ───────────────────────────────

    it('should delete old refresh tokens when user has existing sessions', async () => {
      const mockUser = makeUser();
      (mockedPrisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      mockedCompare.mockResolvedValue(true);
      (mockedPrisma.department.findUnique as jest.Mock).mockResolvedValue(null);
      (mockedPrisma.subDepartment.findUnique as jest.Mock).mockResolvedValue(null);
      (mockedPrisma.employee.findUnique as jest.Mock).mockResolvedValue({ id: 'emp-1' });
      (mockedPrisma.refreshToken.count as jest.Mock).mockResolvedValue(2); // 2 old sessions
      (mockedPrisma.refreshToken.deleteMany as jest.Mock).mockResolvedValue({ count: 2 });
      (mockedPrisma.refreshToken.create as jest.Mock).mockResolvedValue({});
      mockedAccessToken.mockReturnValue('new-access');
      mockedRefreshToken.mockReturnValue('new-refresh');

      await service.login('test@anbinhfoods.net', 'password123');

      expect(mockedPrisma.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
      });
      expect(forceDisconnectUser).toHaveBeenCalledWith('emp-1', 'Tài khoản đã đăng nhập từ thiết bị khác');
    });

    it('should store IP address in new refresh token', async () => {
      const mockUser = makeUser();
      (mockedPrisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      mockedCompare.mockResolvedValue(true);
      (mockedPrisma.department.findUnique as jest.Mock).mockResolvedValue(null);
      (mockedPrisma.subDepartment.findUnique as jest.Mock).mockResolvedValue(null);
      (mockedPrisma.employee.findUnique as jest.Mock).mockResolvedValue(null);
      (mockedPrisma.refreshToken.count as jest.Mock).mockResolvedValue(0);
      (mockedPrisma.refreshToken.create as jest.Mock).mockResolvedValue({});
      mockedAccessToken.mockReturnValue('at');
      mockedRefreshToken.mockReturnValue('rt');

      await service.login('test@anbinhfoods.net', 'password123', {
        ipAddress: '192.168.1.100',
        userAgent: 'TestAgent',
      });

      expect(mockedPrisma.refreshToken.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            ipAddress: '192.168.1.100',
          }),
        })
      );
    });

    it('should not call deleteMany when no old sessions exist', async () => {
      const mockUser = makeUser();
      (mockedPrisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      mockedCompare.mockResolvedValue(true);
      (mockedPrisma.department.findUnique as jest.Mock).mockResolvedValue(null);
      (mockedPrisma.subDepartment.findUnique as jest.Mock).mockResolvedValue(null);
      (mockedPrisma.employee.findUnique as jest.Mock).mockResolvedValue(null);
      (mockedPrisma.refreshToken.count as jest.Mock).mockResolvedValue(0); // no old sessions
      (mockedPrisma.refreshToken.create as jest.Mock).mockResolvedValue({});
      mockedAccessToken.mockReturnValue('at');
      mockedRefreshToken.mockReturnValue('rt');

      await service.login('test@anbinhfoods.net', 'password123');

      expect(mockedPrisma.refreshToken.deleteMany).not.toHaveBeenCalled();
      expect(forceDisconnectUser).not.toHaveBeenCalled();
    });

    it('should use u:<userId> as WS key when user has no employee record', async () => {
      const mockUser = makeUser();
      (mockedPrisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      mockedCompare.mockResolvedValue(true);
      (mockedPrisma.department.findUnique as jest.Mock).mockResolvedValue(null);
      (mockedPrisma.subDepartment.findUnique as jest.Mock).mockResolvedValue(null);
      // employee.findUnique called twice: once in single-IP block, once for response
      (mockedPrisma.employee.findUnique as jest.Mock).mockResolvedValue(null);
      (mockedPrisma.refreshToken.count as jest.Mock).mockResolvedValue(1); // 1 old session
      (mockedPrisma.refreshToken.deleteMany as jest.Mock).mockResolvedValue({ count: 1 });
      (mockedPrisma.refreshToken.create as jest.Mock).mockResolvedValue({});
      mockedAccessToken.mockReturnValue('at');
      mockedRefreshToken.mockReturnValue('rt');

      await service.login('test@anbinhfoods.net', 'password123');

      expect(forceDisconnectUser).toHaveBeenCalledWith('u:user-1', 'Tài khoản đã đăng nhập từ thiết bị khác');
    });
  });
});
