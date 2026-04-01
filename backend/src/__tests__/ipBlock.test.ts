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

import {
  recordFailedAttempt,
  recordSuccessfulLogin,
  getBlockedIps,
  unblockIp,
} from '@middlewares/ipBlock';
import prisma from '@config/database';

// Mock prisma
jest.mock('@config/database', () => ({
  __esModule: true,
  default: {
    loginAttempt: {
      create: jest.fn(),
      count: jest.fn(),
      deleteMany: jest.fn(),
    },
    blockedIp: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
  },
}));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('IP Block Middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('recordFailedAttempt', () => {
    it('should create a failed login attempt record', async () => {
      (mockPrisma.loginAttempt.create as jest.Mock).mockResolvedValue({ id: 'attempt-1' });
      (mockPrisma.loginAttempt.count as jest.Mock).mockResolvedValue(1);

      const result = await recordFailedAttempt('192.168.1.1', 'test@example.com');

      expect(mockPrisma.loginAttempt.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          ipAddress: '192.168.1.1',
          email: 'test@example.com',
          success: false,
          expiresAt: expect.any(Date),
        }),
      });
      expect(result.attempts).toBe(1);
      expect(result.blocked).toBe(false);
    });

    it('should count failed attempts within 5 minutes', async () => {
      (mockPrisma.loginAttempt.create as jest.Mock).mockResolvedValue({ id: 'attempt-2' });
      (mockPrisma.loginAttempt.count as jest.Mock).mockResolvedValue(2);

      const result = await recordFailedAttempt('192.168.1.2');

      expect(mockPrisma.loginAttempt.count).toHaveBeenCalledWith({
        where: {
          ipAddress: '192.168.1.2',
          success: false,
          attemptedAt: {
            gte: expect.any(Date),
          },
        },
      });
      expect(result.attempts).toBe(2);
      expect(result.blocked).toBe(false);
    });

    it('should block IP after 3 failed attempts', async () => {
      (mockPrisma.loginAttempt.create as jest.Mock).mockResolvedValue({ id: 'attempt-3' });
      (mockPrisma.loginAttempt.count as jest.Mock).mockResolvedValue(3);
      (mockPrisma.blockedIp.findUnique as jest.Mock).mockResolvedValue(null); // No existing block
      (mockPrisma.blockedIp.upsert as jest.Mock).mockResolvedValue({ id: 'block-1' });

      const result = await recordFailedAttempt('192.168.1.3', 'admin@erp.com');

      // Should call upsert to create new block
      expect(mockPrisma.blockedIp.upsert).toHaveBeenCalled();
      expect(result.blocked).toBe(true);
      expect(result.attempts).toBe(3);
    });

    it('should not call upsert when IP is already actively blocked', async () => {
      // When IP is already blocked (isActive = true), the code returns early
      // without calling upsert — this is correct behavior
      (mockPrisma.loginAttempt.create as jest.Mock).mockResolvedValue({ id: 'attempt-4' });
      (mockPrisma.loginAttempt.count as jest.Mock).mockResolvedValue(4);
      (mockPrisma.blockedIp.findUnique as jest.Mock).mockResolvedValue({
        ipAddress: '192.168.1.4',
        isActive: true,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      });

      const result = await recordFailedAttempt('192.168.1.4');

      // upsert should NOT be called since IP is already blocked
      expect(mockPrisma.blockedIp.upsert).not.toHaveBeenCalled();
      // But we should still report that it's blocked
      expect(result.blocked).toBe(true);
    });

    it('should handle database errors gracefully', async () => {
      (mockPrisma.loginAttempt.create as jest.Mock).mockRejectedValue(new Error('DB error'));

      const result = await recordFailedAttempt('192.168.1.5');

      expect(result.blocked).toBe(false);
      expect(result.attempts).toBe(0);
    });
  });

  describe('recordSuccessfulLogin', () => {
    it('should delete failed attempts for the IP on successful login', async () => {
      (mockPrisma.loginAttempt.deleteMany as jest.Mock).mockResolvedValue({ count: 3 });

      await recordSuccessfulLogin('192.168.1.10');

      expect(mockPrisma.loginAttempt.deleteMany).toHaveBeenCalledWith({
        where: {
          ipAddress: '192.168.1.10',
          success: false,
        },
      });
    });

    it('should handle errors gracefully', async () => {
      (mockPrisma.loginAttempt.deleteMany as jest.Mock).mockRejectedValue(new Error('DB error'));

      // Should not throw
      await expect(recordSuccessfulLogin('192.168.1.11')).resolves.not.toThrow();
    });
  });

  describe('getBlockedIps', () => {
    it('should return list of active blocked IPs', async () => {
      const mockBlocked = [
        { ipAddress: '1.2.3.4', reason: 'TOO_MANY_FAILED_ATTEMPTS', blockedAt: new Date(), expiresAt: new Date() },
        { ipAddress: '5.6.7.8', reason: 'TOO_MANY_FAILED_ATTEMPTS', blockedAt: new Date(), expiresAt: new Date() },
      ];
      (mockPrisma.blockedIp.findMany as jest.Mock).mockResolvedValue(mockBlocked);

      const result = await getBlockedIps();

      expect(mockPrisma.blockedIp.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        orderBy: { blockedAt: 'desc' },
        select: {
          ipAddress: true,
          reason: true,
          blockedAt: true,
          expiresAt: true,
        },
      });
      expect(result).toHaveLength(2);
      expect(result[0].ipAddress).toBe('1.2.3.4');
    });

    it('should return empty array when no IPs are blocked', async () => {
      (mockPrisma.blockedIp.findMany as jest.Mock).mockResolvedValue([]);

      const result = await getBlockedIps();

      expect(result).toHaveLength(0);
    });
  });

  describe('unblockIp', () => {
    it('should unblock an IP and record who unblocked it', async () => {
      (mockPrisma.blockedIp.update as jest.Mock).mockResolvedValue({ id: 'block-1' });

      const result = await unblockIp('1.2.3.4', 'admin-123');

      expect(mockPrisma.blockedIp.update).toHaveBeenCalledWith({
        where: { ipAddress: '1.2.3.4' },
        data: {
          isActive: false,
          unblockedAt: expect.any(Date),
          unblockedBy: 'admin-123',
        },
      });
      expect(result).toBe(true);
    });

    it('should return false if unblock fails', async () => {
      (mockPrisma.blockedIp.update as jest.Mock).mockRejectedValue(new Error('DB error'));

      const result = await unblockIp('1.2.3.5', 'admin-123');

      expect(result).toBe(false);
    });
  });
});
