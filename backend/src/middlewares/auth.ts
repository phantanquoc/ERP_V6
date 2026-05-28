import { Response, NextFunction } from 'express';
import { verifyAccessToken } from '@utils/helpers';
import { AuthenticationError } from '@utils/errors';
import type { AuthenticatedRequest } from '@types';

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

