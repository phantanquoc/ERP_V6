import { Response, NextFunction } from 'express';
import authService from '@services/authService';
import { IpLockedError, SessionReplacedError } from '@services/authService';
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

  async login(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { identifier, email, password } = req.body;

      // Support both 'identifier' (new) and 'email' (legacy) field names
      const loginIdentifier = identifier || email;

      // Extract request metadata
      const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.socket.remoteAddress || '';
      const userAgent = req.headers['user-agent'] || '';

      const result = await authService.login(loginIdentifier, password, {
        ipAddress,
        userAgent,
      });

      res.status(200).json({
        success: true,
        message: 'Đăng nhập thành công',
        data: result,
      } as ApiResponse<AuthResponse>);
    } catch (error) {
      if (error instanceof IpLockedError) {
        const remainingMs = error.lockedUntil.getTime() - Date.now();
        const remainingMinutes = Math.ceil(remainingMs / 60000);
        res.status(429).json({
          success: false,
          message: `IP của bạn đã bị khóa do đăng nhập sai quá nhiều lần. Vui lòng thử lại sau ${remainingMinutes} phút.`,
          lockedUntil: error.lockedUntil.toISOString(),
        });
        return;
      }
      next(error);
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
      if (error instanceof SessionReplacedError) {
        res.status(401).json({
          success: false,
          message: 'Tài khoản của bạn đã đăng nhập trên thiết bị khác.',
          code: 'SESSION_REPLACED',
        });
        return;
      }
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

  async getMe(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await authService.getMe(req.user!.id);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async forgotPassword(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { identifier } = req.body;

      await authService.forgotPassword(identifier);

      res.status(200).json({
        success: true,
        message: 'Nếu tài khoản tồn tại, yêu cầu đặt lại mật khẩu đã được gửi đến quản trị viên.',
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new AuthController();

