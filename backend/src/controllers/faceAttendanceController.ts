import { Response, NextFunction } from 'express';
import crypto from 'crypto';
import type { AuthenticatedRequest } from '@types';
import faceAttendanceService from '@services/faceAttendanceService';
import { ValidationError } from '@utils/errors';

// ─── In-memory kiosk session store (no expiry) ───────────────────────────────
const kioskSessions = new Set<string>();

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

  async listProfileImages(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { employeeId } = req.params;
      const data = await faceAttendanceService.listProfileImages(employeeId);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getProfileStats(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { employeeId } = req.params;
      const data = await faceAttendanceService.getProfileStats(employeeId);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getAdaptiveMetrics(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const days = Math.min(90, Math.max(1, parseInt(req.query.days as string) || 7));
      const data = await faceAttendanceService.getAdaptiveMetrics(days);
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
      const cursor = req.query.cursor as string | undefined;

      if (cursor !== undefined) {
        const limit = parseInt(req.query.limit as string) || 50;
        const result = await faceAttendanceService.getLogsCursor(cursor || undefined, limit);
        res.json({ success: true, data: result.data, nextCursor: result.nextCursor, hasMore: result.hasMore });
        return;
      }

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

      const { image, frames, mode } = req.body as { image?: string; frames?: string[]; mode?: 'strict' | 'relaxed' };
      const normalizedFrames = Array.isArray(frames) ? frames.filter(Boolean) : [];
      const primaryImage = image || normalizedFrames[Math.floor(normalizedFrames.length / 2)];
      if (!primaryImage) throw new ValidationError('Cần truyền image hoặc frames (base64)');

      const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.socket.remoteAddress || '';
      const result = await faceAttendanceService.verifyAndRecord(primaryImage, normalizedFrames, valid.id, ipAddress, mode);
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
      const { image, frames, mode } = req.body as { image?: string; frames?: string[]; mode?: 'strict' | 'relaxed' };
      const normalizedFrames = Array.isArray(frames) ? frames.filter(Boolean) : [];
      const primaryImage = image || normalizedFrames[Math.floor(normalizedFrames.length / 2)];
      if (!primaryImage) throw new ValidationError('Cần truyền image hoặc frames (base64)');
      const result = await faceAttendanceService.verifyAndRecord(primaryImage, normalizedFrames, 'dev-kiosk', 'localhost', mode);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  // ─── Kiosk Session Key (admin tạo, kiosk validate) ─────────────────────────

  async createKioskSession(_req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const key = crypto.randomBytes(96).toString('base64url').slice(0, 128);
      kioskSessions.add(key);
      res.json({ success: true, data: { key } });
    } catch (error) {
      next(error);
    }
  }

  async validateKioskSession(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const key = req.query.key as string;
      if (!key) {
        res.json({ success: true, data: { valid: false } });
        return;
      }
      const valid = kioskSessions.has(key);
      res.json({ success: true, data: { valid } });
    } catch (error) {
      next(error);
    }
  }

  async validateDeviceKey(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const apiKey = req.headers['x-device-key'] as string;
      if (!apiKey) {
        res.json({ success: true, data: { valid: false } });
        return;
      }
      const device = await faceAttendanceService.validateDevice(apiKey);
      if (!device) {
        res.json({ success: true, data: { valid: false } });
        return;
      }
      res.json({ success: true, data: { valid: true, device: { name: device.name, location: device.location } } });
    } catch (error) {
      next(error);
    }
  }
}

export default new FaceAttendanceController();
