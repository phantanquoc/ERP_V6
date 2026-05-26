import prisma from '@config/database';
import logger from '@config/logger';
import {
  hashPassword,
  comparePassword,
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from '@utils/helpers';
import {
  AuthenticationError,
  ConflictError,
  ValidationError,
} from '@utils/errors';
import type { JwtPayload, AuthResponse } from '@types';
import { NotificationEvent } from '@types';
import loginHistoryService from './loginHistoryService';
import notificationService from './notificationService';

// ─── Helper: build secondaryDepartments array from DB ────────────────────────
async function buildSecondaryDepartments(userId: string): Promise<Array<{
  departmentId: string;
  subDepartmentId: string | null;
  role: string;
  departmentName: string | null;
  departmentCode: string | null;
  subDepartmentName: string | null;
  subDepartmentCode: string | null;
}>> {
  const rows = await prisma.userSecondaryDepartment.findMany({
    where: { userId },
    orderBy: { createdAt: 'asc' },
  });

  return Promise.all(rows.map(async (row) => {
    const [dept, subDept] = await Promise.all([
      prisma.department.findUnique({ where: { id: row.departmentId }, select: { name: true, code: true } }),
      row.subDepartmentId
        ? prisma.subDepartment.findUnique({ where: { id: row.subDepartmentId }, select: { name: true, code: true } })
        : null,
    ]);
    return {
      departmentId: row.departmentId,
      subDepartmentId: row.subDepartmentId ?? null,
      role: row.role as string,
      departmentName: dept?.name ?? null,
      departmentCode: dept?.code ?? null,
      subDepartmentName: subDept?.name ?? null,
      subDepartmentCode: subDept?.code ?? null,
    };
  }));
}

// IP rate limiter: track failed login attempts per IP
interface IpRateLimitEntry {
  count: number;
  lockedUntil: Date | null;
}

const ipRateLimiter = new Map<string, IpRateLimitEntry>();

const IP_MAX_ATTEMPTS = 5;
const IP_LOCK_DURATION_MS = 10 * 60 * 1000; // 10 minutes

// Custom error class for IP lock so controller can return lockedUntil
export class IpLockedError extends Error {
  public lockedUntil: Date;
  constructor(lockedUntil: Date) {
    super('IP_LOCKED');
    this.name = 'IpLockedError';
    this.lockedUntil = lockedUntil;
    Object.setPrototypeOf(this, IpLockedError.prototype);
  }
}

// Custom error class for session replaced by another device
export class SessionReplacedError extends AuthenticationError {
  constructor() {
    super('SESSION_REPLACED');
    this.name = 'SessionReplacedError';
    Object.setPrototypeOf(this, SessionReplacedError.prototype);
  }
}

export class AuthService {
  async register(email: string, password: string, firstName: string, lastName: string): Promise<AuthResponse> {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictError('Email already registered');
    }

    // Validate password
    if (password.length < 6) {
      throw new ValidationError('Password must be at least 6 characters');
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
      },
    });

    // Generate tokens
    const payload: JwtPayload = {
      id: user.id,
      email: user.email,
      role: user.role,
      departmentId: user.departmentId,
      subDepartmentId: user.subDepartmentId,
      secondaryDepartments: [],
    };

    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    // Save refresh token
    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      },
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        departmentId: user.departmentId,
        departmentName: null,
        subDepartmentId: user.subDepartmentId,
        subDepartmentName: null,
        secondaryDepartments: [],
        secondaryDepartmentId: null,
        secondaryDepartmentName: null,
        secondarySubDepartmentId: null,
        secondarySubDepartmentName: null,
        secondaryRole: null,
      },
      employee: undefined,
    };
  }

  async login(
    identifier: string,
    password: string,
    metadata?: {
      ipAddress?: string;
      userAgent?: string;
    }
  ): Promise<AuthResponse> {
    let userId: string | null = null;
    const ip = metadata?.ipAddress || 'unknown';

    // Check IP rate limit before attempting login
    const ipEntry = ipRateLimiter.get(ip);
    if (ipEntry?.lockedUntil) {
      if (ipEntry.lockedUntil > new Date()) {
        throw new IpLockedError(ipEntry.lockedUntil);
      } else {
        // Lock expired, reset entry
        ipRateLimiter.delete(ip);
      }
    }

    try {
      // Detect if identifier is email (contains @) or employee code
      let user;
      if (identifier.includes('@')) {
        // Login by email
        user = await prisma.user.findUnique({
          where: { email: identifier },
        });
      } else {
        // Login by employee code (case-insensitive)
        const employee = await prisma.employee.findFirst({
          where: { employeeCode: identifier.toUpperCase() },
          select: { userId: true },
        });

        if (employee) {
          user = await prisma.user.findUnique({
            where: { id: employee.userId },
          });
        }
      }

      if (!user) {
        throw new AuthenticationError('Thông tin đăng nhập không đúng');
      }

      userId = user.id;

      // Check password
      const isPasswordValid = await comparePassword(password, user.password);
      if (!isPasswordValid) {
        throw new AuthenticationError('Thông tin đăng nhập không đúng');
      }

      // Check if user is active
      if (!user.isActive) {
        throw new AuthenticationError('Tài khoản người dùng đã bị vô hiệu hóa');
      }
    } catch (error) {
      // Increment IP failed counter (only for auth errors, not system errors)
      if (error instanceof AuthenticationError) {
        const current = ipRateLimiter.get(ip) || { count: 0, lockedUntil: null };
        current.count += 1;
        if (current.count >= IP_MAX_ATTEMPTS) {
          current.lockedUntil = new Date(Date.now() + IP_LOCK_DURATION_MS);
          logger.warn(`IP ${ip} locked after ${IP_MAX_ATTEMPTS} failed login attempts`);
          ipRateLimiter.set(ip, current);
          // Throw IpLockedError immediately on the 5th attempt
          throw new IpLockedError(current.lockedUntil);
        }
        ipRateLimiter.set(ip, current);
      }

      // Log failed login attempt
      if (userId && metadata) {
        const { device, browser } = this.parseUserAgent(metadata.userAgent || '');
        await loginHistoryService.createLoginHistory({
          userId,
          ipAddress: metadata.ipAddress,
          userAgent: metadata.userAgent,
          device,
          browser,
          status: 'failed',
        }).catch(err => {
          logger.error('Failed to log failed login history:', err);
        });
      }
      throw error;
    }

    // Reset IP failed counter on successful auth
    ipRateLimiter.delete(ip);

    // Continue with successful login flow
    const user = await prisma.user.findUnique({
      where: { id: userId! },
    });

    if (!user) {
      throw new AuthenticationError('User not found');
    }

    // Get department and subdepartment names
    let departmentName = null;
    let subDepartmentName = null;
    let secondaryDepartmentName = null;
    let secondarySubDepartmentName = null;

    if (user.departmentId) {
      const dept = await prisma.department.findUnique({
        where: { id: user.departmentId },
        select: { name: true, code: true },
      });
      departmentName = dept?.name;
    }

    if (user.subDepartmentId) {
      const subDept = await prisma.subDepartment.findUnique({
        where: { id: user.subDepartmentId },
        select: { name: true, code: true },
      });
      subDepartmentName = subDept?.name;
    }

    if (user.secondaryDepartmentId) {
      const dept2 = await prisma.department.findUnique({
        where: { id: user.secondaryDepartmentId },
        select: { name: true, code: true },
      });
      secondaryDepartmentName = dept2?.name;
    }

    if (user.secondarySubDepartmentId) {
      const subDept2 = await prisma.subDepartment.findUnique({
        where: { id: user.secondarySubDepartmentId },
        select: { name: true, code: true },
      });
      secondarySubDepartmentName = subDept2?.name;
    }

    // Build secondary departments array from relation table
    const secondaryDepartments = await buildSecondaryDepartments(user.id);

    // Get employee data if exists
    const employee = await prisma.employee.findUnique({
      where: { userId: user.id },
      include: {
        position: {
          select: { id: true, name: true },
        },
        positionLevel: {
          select: { id: true, level: true, baseSalary: true, kpiSalary: true },
        },
      },
    });

    // Generate tokens
    const payload: JwtPayload = {
      id: user.id,
      email: user.email,
      role: user.role,
      departmentId: user.departmentId,
      subDepartmentId: user.subDepartmentId,
      secondaryDepartments: secondaryDepartments.map(s => ({
        departmentId: s.departmentId,
        subDepartmentId: s.subDepartmentId,
        role: s.role,
      })),
    };

    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    // Single device login: delete all existing refresh tokens for this user
    await prisma.refreshToken.deleteMany({
      where: { userId: user.id },
    });

    // Save refresh token
    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    // Log successful login history
    if (metadata) {
      const { device, browser } = this.parseUserAgent(metadata.userAgent || '');
      await loginHistoryService.createLoginHistory({
        userId: user.id,
        ipAddress: metadata.ipAddress,
        userAgent: metadata.userAgent,
        device,
        browser,
        status: 'success',
      }).catch(err => {
        logger.error('Failed to log login history:', err);
      });
    }

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        departmentId: user.departmentId,
        departmentName,
        subDepartmentId: user.subDepartmentId,
        subDepartmentName,
        secondaryDepartments,
        // @deprecated backward compat — populated from secondaryDepartments[0]
        secondaryDepartmentId: secondaryDepartments[0]?.departmentId ?? user.secondaryDepartmentId,
        secondaryDepartmentName: secondaryDepartments[0]?.departmentName ?? secondaryDepartmentName,
        secondarySubDepartmentId: secondaryDepartments[0]?.subDepartmentId ?? user.secondarySubDepartmentId,
        secondarySubDepartmentName: secondaryDepartments[0]?.subDepartmentName ?? secondarySubDepartmentName,
        secondaryRole: secondaryDepartments[0]?.role ?? user.secondaryRole,
      },
      employee: employee ? {
        id: employee.id,
        employeeCode: employee.employeeCode,
        gender: employee.gender,
        dateOfBirth: employee.dateOfBirth,
        phoneNumber: employee.phoneNumber,
        address: employee.address,
        positionId: employee.positionId,
        position: employee.position,
        positionLevelId: employee.positionLevelId,
        positionLevel: employee.positionLevel,
        subDepartmentId: employee.subDepartmentId,
        status: employee.status,
        hireDate: employee.hireDate,
        contractType: employee.contractType,
        educationLevel: employee.educationLevel,
        specialization: employee.specialization,
        specialSkills: employee.specialSkills,
        baseSalary: employee.baseSalary,
        kpiLevel: employee.kpiLevel,
        responsibilityCode: employee.responsibilityCode,
        weight: employee.weight,
        height: employee.height,
        shirtSize: employee.shirtSize,
        pantSize: employee.pantSize,
        shoeSize: employee.shoeSize,
        bankAccount: employee.bankAccount,
        lockerNumber: employee.lockerNumber,
        notes: employee.notes,
      } : undefined,
    };
  }

  async forgotPassword(identifier: string): Promise<void> {
    // Find user by email or employee code
    let user;
    let employee;

    if (identifier.includes('@')) {
      user = await prisma.user.findUnique({
        where: { email: identifier },
        include: { employees: true },
      });
      if (user) {
        employee = user.employees;
      }
    } else {
      employee = await prisma.employee.findFirst({
        where: { employeeCode: identifier.toUpperCase() },
        include: { user: true },
      });
      if (employee) {
        user = employee.user;
      }
    }

    // Always return success to not leak user existence
    if (!user || !employee) {
      return;
    }

    // Generate random 6-digit password
    const newPassword = Math.floor(100000 + Math.random() * 900000).toString();

    // Hash and update password
    const hashedPassword = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    // Notify admins about password reset
    await notificationService.notify(NotificationEvent.PASSWORD_RESET_REQUESTED, {
      actorUserId: user.id,
      metadata: {
        employeeName: `${user.lastName} ${user.firstName} (${employee.employeeCode})`,
        targetUserId: user.id,
      },
    }).catch(() => {});

    logger.info(`Password reset for user ${user.email} (${employee.employeeCode})`);
  }

  async refreshAccessToken(refreshToken: string): Promise<{ accessToken: string }> {
    // Verify refresh token
    const decoded = verifyRefreshToken(refreshToken);

    // Check if refresh token exists in database
    const tokenRecord = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
    });

    if (!tokenRecord) {
      // Token not found in DB means it was deleted by a new login on another device
      throw new SessionReplacedError();
    }

    if (tokenRecord.expiresAt < new Date()) {
      throw new AuthenticationError('Token làm mới không hợp lệ hoặc đã hết hạn');
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
    });

    if (!user || !user.isActive) {
      throw new AuthenticationError('Không tìm thấy người dùng hoặc tài khoản đã bị vô hiệu hóa');
    }

    // Generate new access token with fresh secondary departments
    const secondaryDepts = await buildSecondaryDepartments(user.id);
    const payload: JwtPayload = {
      id: user.id,
      email: user.email,
      role: user.role,
      departmentId: user.departmentId,
      subDepartmentId: user.subDepartmentId,
      secondaryDepartments: secondaryDepts.map(s => ({
        departmentId: s.departmentId,
        subDepartmentId: s.subDepartmentId,
        role: s.role,
      })),
    };

    const accessToken = generateAccessToken(payload);

    return { accessToken };
  }

  async logout(refreshToken: string): Promise<void> {
    await prisma.refreshToken.delete({
      where: { token: refreshToken },
    }).catch(() => {
      // Token might not exist, that's okay
    });
  }

  /**
   * Parse user agent string to extract device and browser info
   */
  private parseUserAgent(userAgent: string): { device: string; browser: string } {
    let device = 'Unknown';
    let browser = 'Unknown';

    // Detect device
    if (/Windows/i.test(userAgent)) {
      device = userAgent.match(/Windows NT [\d.]+/)?.[0] || 'Windows';
    } else if (/Mac OS X/i.test(userAgent)) {
      device = 'Mac OS X';
    } else if (/iPhone/i.test(userAgent)) {
      device = 'iPhone';
    } else if (/iPad/i.test(userAgent)) {
      device = 'iPad';
    } else if (/Android/i.test(userAgent)) {
      device = 'Android';
    } else if (/Linux/i.test(userAgent)) {
      device = 'Linux';
    }

    // Detect browser
    if (/Chrome/i.test(userAgent) && !/Edge|Edg/i.test(userAgent)) {
      const version = userAgent.match(/Chrome\/([\d.]+)/)?.[1] || '';
      browser = `Chrome ${version}`;
    } else if (/Safari/i.test(userAgent) && !/Chrome/i.test(userAgent)) {
      const version = userAgent.match(/Version\/([\d.]+)/)?.[1] || '';
      browser = `Safari ${version}`;
    } else if (/Firefox/i.test(userAgent)) {
      const version = userAgent.match(/Firefox\/([\d.]+)/)?.[1] || '';
      browser = `Firefox ${version}`;
    } else if (/Edge|Edg/i.test(userAgent)) {
      const version = userAgent.match(/Edg?\/([\d.]+)/)?.[1] || '';
      browser = `Edge ${version}`;
    } else if (/MSIE|Trident/i.test(userAgent)) {
      browser = 'Internet Explorer';
    }

    return { device, browser };
  }
}

export default new AuthService();

