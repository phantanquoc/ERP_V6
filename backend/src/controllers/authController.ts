import { Response, NextFunction } from 'express';
import authService from '@services/authService';
import { recordFailedAttempt, recordSuccessfulLogin, getBlockedIps, unblockIp } from '@middlewares/ipBlock';
import { getClientIp } from '@middlewares/rateLimiter';
import type { AuthenticatedRequest, ApiResponse, AuthResponse } from '@types';

export class AuthController {
  async register(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password, firstName, lastName } = req.body;

      const result = await authService.register(email, password, firstName, lastName);

      res.status(201).json({
        success: true,
        message: 'Đăng ký người dùng thành công',
        data: result,
      } as ApiResponse<AuthResponse>);
    } catch (error) {
      next(error);
    }
  }

  async login(req: AuthenticatedRequest, res: Response, _next: NextFunction): Promise<void> {
    try {
      const { email, password } = req.body;

      // Extract request metadata
      const ipAddress = getClientIp(req);
      const userAgent = req.headers['user-agent'] || '';

      const result = await authService.login(email, password, {
        ipAddress,
        userAgent,
      });

      // On successful login — clear failed attempts for this IP
      await recordSuccessfulLogin(ipAddress);

      res.status(200).json({
        success: true,
        message: 'Đăng nhập thành công',
        data: result,
      } as ApiResponse<AuthResponse>);
    } catch (error: unknown) {
      // On failed login — record attempt and potentially block IP
      const ipAddress = getClientIp(req);
      const { email } = req.body || {};
      await recordFailedAttempt(ipAddress, email);

      const err = error as { statusCode?: number; message?: string };
      res.status(err.statusCode || 401).json({
        success: false,
        message: err.message || 'Đăng nhập thất bại',
      });
    }
  }

  async refreshToken(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        res.status(400).json({
          success: false,
          message: 'Token làm mới là bắt buộc',
        });
        return;
      }

      const result = await authService.refreshAccessToken(refreshToken);

      res.status(200).json({
        success: true,
        message: 'Làm mới token thành công',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async logout(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { refreshToken } = req.body;

      if (refreshToken) {
        await authService.logout(refreshToken);
      }

      res.status(200).json({
        success: true,
        message: 'Đăng xuất thành công',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get list of blocked IPs (Admin only)
   */
  async getBlockedIps(_req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const blocked = await getBlockedIps();
      res.status(200).json({
        success: true,
        data: blocked,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Unblock a specific IP address (Admin only)
   */
  async unblockIp(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { ipAddress } = req.body;
      const adminId = req.user?.id;

      if (!ipAddress) {
        res.status(400).json({
          success: false,
          message: 'IP address là bắt buộc',
        });
        return;
      }

      const success = await unblockIp(ipAddress, adminId ?? 'UNKNOWN');

      if (success) {
        res.status(200).json({
          success: true,
          message: `Đã mở khóa IP: ${ipAddress}`,
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Không thể mở khóa IP',
        });
      }
    } catch (error) {
      next(error);
    }
  }
}

export default new AuthController();

