import { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '@types';
import faceAttendanceService from '@services/faceAttendanceService';
import { ValidationError } from '@utils/errors';

export class FaceAttendanceController {

  // ─── Admin Endpoints (require ADMIN role) ────────────────────────────────

  async listProfiles(_req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await faceAttendanceService.listProfiles();
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async enrollFace(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { employeeId } = req.params;
      const { images } = req.body as { images: string[] };

      if (!images || !Array.isArray(images) || images.length === 0) {
        throw new ValidationError('Cần truyền mảng images (base64)');
      }

      const result = await faceAttendanceService.enrollFace(employeeId, images);
      res.json({ success: true, data: result, message: 'Đăng ký khuôn mặt thành công' });
    } catch (error) {
      next(error);
    }
  }

  async enrollVariation(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { employeeId } = req.params;
      const { images } = req.body as { images: string[] };

      if (!images || !Array.isArray(images) || images.length === 0) {
        throw new ValidationError('Cần truyền mảng images (base64)');
      }

      const result = await faceAttendanceService.enrollVariation(employeeId, images);
      res.json({ success: true, data: result, message: `Đã thêm ${result.addedCount} biến thể, tổng ${result.totalCount} ảnh` });
    } catch (error) {
      next(error);
    }
  }

  async getProfileImages(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { employeeId } = req.params;
      const data = await faceAttendanceService.getProfileImages(employeeId);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  /** Toggle active/inactive face profile */
  async toggleProfile(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { profileId } = req.params;
      const result = await faceAttendanceService.toggleProfile(profileId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async deleteProfile(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { employeeId } = req.params;
      await faceAttendanceService.deleteProfile(employeeId);
      res.json({ success: true, message: 'Đã xóa face profile' });
    } catch (error) {
      next(error);
    }
  }

  async getLogs(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const data = await faceAttendanceService.getLogs(page, limit);
      res.json({ success: true, ...data });
    } catch (error) {
      next(error);
    }
  }

  // ─── Device Management ───────────────────────────────────────────────────

  async listDevices(_req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await faceAttendanceService.listDevices();
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async createDevice(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { name, location } = req.body as { name: string; location?: string };
      if (!name) throw new ValidationError('Tên thiết bị là bắt buộc');
      const device = await faceAttendanceService.createDevice(name, location);
      res.status(201).json({ success: true, data: device });
    } catch (error) {
      next(error);
    }
  }

  async toggleDevice(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { deviceId } = req.params;
      const device = await faceAttendanceService.toggleDevice(deviceId);
      res.json({ success: true, data: device });
    } catch (error) {
      next(error);
    }
  }

  // ─── Kiosk Endpoint (device-key auth, no JWT) ────────────────────────────

  async kioskVerify(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const apiKey = req.headers['x-device-key'] as string;
      if (!apiKey) {
        res.status(401).json({ success: false, message: 'Thiếu x-device-key header' });
        return;
      }

      const valid = await faceAttendanceService.validateDevice(apiKey);
      if (!valid) {
        res.status(403).json({ success: false, message: 'Device key không hợp lệ hoặc đã bị vô hiệu hóa' });
        return;
      }

      const { image, frames } = req.body as { image?: string; frames?: string[] };
      const normalizedFrames = Array.isArray(frames) ? frames.filter(Boolean) : [];
      const primaryImage = image || normalizedFrames[Math.floor(normalizedFrames.length / 2)];
      if (!primaryImage) throw new ValidationError('Cần truyền image hoặc frames (base64)');

      const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.socket.remoteAddress || '';
      const result = await faceAttendanceService.verifyAndRecord(primaryImage, normalizedFrames, valid.id, ipAddress);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Kiosk public verify — không cần device key, dùng cho localhost dev
   * Chỉ hoạt động khi NODE_ENV !== production
   */
  async kioskVerifyDev(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (process.env.NODE_ENV === 'production') {
        res.status(404).json({ success: false, message: 'Not found' });
        return;
      }
      const { image, frames } = req.body as { image?: string; frames?: string[] };
      const normalizedFrames = Array.isArray(frames) ? frames.filter(Boolean) : [];
      const primaryImage = image || normalizedFrames[Math.floor(normalizedFrames.length / 2)];
      if (!primaryImage) throw new ValidationError('Cần truyền image hoặc frames (base64)');
      const result = await faceAttendanceService.verifyAndRecord(primaryImage, normalizedFrames, 'dev-kiosk', 'localhost');
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
}

export default new FaceAttendanceController();
