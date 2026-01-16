import prisma from '@config/database';
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
import loginHistoryService from './loginHistoryService';

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
      },
      employee: undefined,
    };
  }

  async login(
    email: string,
    password: string,
    metadata?: {
      ipAddress?: string;
      userAgent?: string;
    }
  ): Promise<AuthResponse> {
    let userId: string | null = null;

    try {
      // Find user
      const user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        throw new AuthenticationError('Email hoặc mật khẩu không đúng');
      }

      userId = user.id;

      // Check password
      const isPasswordValid = await comparePassword(password, user.password);
      if (!isPasswordValid) {
        throw new AuthenticationError('Email hoặc mật khẩu không đúng');
      }

      // Check if user is active
      if (!user.isActive) {
        throw new AuthenticationError('Tài khoản người dùng đã bị vô hiệu hóa');
      }
    } catch (error) {
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
          console.error('Failed to log failed login history:', err);
        });
      }
      throw error;
    }

    // Continue with successful login flow
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new AuthenticationError('User not found');
    }

    // Get department and subdepartment names
    let departmentName = null;
    let subDepartmentName = null;

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
    };

    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

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
        console.error('Failed to log login history:', err);
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

  async refreshAccessToken(refreshToken: string): Promise<{ accessToken: string }> {
    // Verify refresh token
    const decoded = verifyRefreshToken(refreshToken);

    // Check if refresh token exists in database
    const tokenRecord = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
    });

    if (!tokenRecord || tokenRecord.expiresAt < new Date()) {
      throw new AuthenticationError('Token làm mới không hợp lệ hoặc đã hết hạn');
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
    });

    if (!user || !user.isActive) {
      throw new AuthenticationError('Không tìm thấy người dùng hoặc tài khoản đã bị vô hiệu hóa');
    }

    // Generate new access token
    const payload: JwtPayload = {
      id: user.id,
      email: user.email,
      role: user.role,
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

