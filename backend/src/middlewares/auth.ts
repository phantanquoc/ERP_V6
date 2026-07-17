import { Response, NextFunction } from 'express';
import { verifyAccessToken } from '@utils/helpers';
import { AuthenticationError } from '@utils/errors';
import type { AuthenticatedRequest } from '@types';
import prisma from '@config/database';

export const authenticate = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      throw new AuthenticationError('Không có token xác thực');
    }

    const decoded = verifyAccessToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    if (error instanceof AuthenticationError) {
      res.status(401).json({ success: false, message: error.message });
    } else {
      res.status(401).json({ success: false, message: 'Token không hợp lệ' });
    }
  }
};

/**
 * Dual-auth middleware: accepts either a valid device key (x-device-key header)
 * of the required type, or falls back to JWT authentication.
 *
 * If device key is present and valid: sets req.isKioskDevice = true,
 * req.kioskOperatorId from x-operator-id header, and calls next().
 *
 * If no device key or device key invalid: delegates to `authenticate` (JWT).
 */
export const deviceOrJwtAuth = (requiredType: string) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    const deviceKey = req.headers['x-device-key'] as string | undefined;

    if (deviceKey) {
      try {
        const device = await prisma.attendanceDevice.findUnique({ where: { apiKey: deviceKey } });
        if (device && device.isActive && device.type === requiredType) {
          req.isKioskDevice = true;
          req.kioskOperatorId = req.headers['x-operator-id'] as string | undefined;
          next();
          return;
        }
      } catch (err) {
        // Log the error for diagnostics, then fall through to JWT auth
        console.error('[deviceOrJwtAuth] device validation error:', err);
      }
    }

    // Fallback to JWT authenticate
    authenticate(req, res, next);
  };
};

export const authorize = (...allowedRoles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Chưa xác thực' });
      return;
    }

    // Flatten allowedRoles in case it's passed as array or individual args
    const roles = allowedRoles.flat();

    // Check primary role
    if (roles.includes(req.user.role)) {
      next();
      return;
    }

    // Check secondary department roles — a user may have a higher role in a secondary dept
    const hasSecondaryRole =
      req.user.secondaryDepartments?.some(s => roles.includes(s.role)) ?? false;

    if (hasSecondaryRole) {
      next();
      return;
    }

    res.status(403).json({ success: false, message: 'Truy cập bị từ chối' });
  };
};

