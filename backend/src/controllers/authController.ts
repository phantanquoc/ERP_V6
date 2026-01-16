import { Response } from 'express';
import authService from '@services/authService';
import type { AuthenticatedRequest, ApiResponse, AuthResponse } from '@types';

export class AuthController {
  async register(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { email, password, firstName, lastName } = req.body;

      const result = await authService.register(email, password, firstName, lastName);

      res.status(201).json({
        success: true,
        message: 'Đăng ký người dùng thành công',
        data: result,
      } as ApiResponse<AuthResponse>);
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({
          success: false,
          message: error.message,
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Lỗi máy chủ nội bộ',
        });
      }
    }
  }

  async login(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;

      // Extract request metadata
      const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.socket.remoteAddress || '';
      const userAgent = req.headers['user-agent'] || '';

      const result = await authService.login(email, password, {
        ipAddress,
        userAgent,
      });

      res.status(200).json({
        success: true,
        message: 'Đăng nhập thành công',
        data: result,
      } as ApiResponse<AuthResponse>);
    } catch (error) {
      if (error instanceof Error) {
        res.status(401).json({
          success: false,
          message: error.message,
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Lỗi máy chủ nội bộ',
        });
      }
    }
  }

  async refreshToken(req: AuthenticatedRequest, res: Response): Promise<void> {
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
      if (error instanceof Error) {
        res.status(401).json({
          success: false,
          message: error.message,
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Lỗi máy chủ nội bộ',
        });
      }
    }
  }

  async logout(req: AuthenticatedRequest, res: Response): Promise<void> {
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
      res.status(500).json({
        success: false,
        message: 'Đăng xuất thất bại',
      });
    }
  }
}

export default new AuthController();

