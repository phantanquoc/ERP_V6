import { Request, Response, NextFunction } from 'express';
import notificationService from '@services/notificationService';
import pushNotificationService from '@services/pushNotificationService';

export class NotificationController {
  async getEmployeeNotifications(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
        return;
      }

      // Get employee by userId
      const prisma = require('@config/database').default;
      const employee = await prisma.employee.findUnique({
        where: { userId },
      });

      // If no employee record, return empty notifications
      if (!employee) {
        res.json({
          success: true,
          data: [],
        });
        return;
      }

      const { limit = 10 } = req.query;
      const notifications = await notificationService.getEmployeeNotifications(
        employee.id,
        Number(limit)
      );

      res.json({
        success: true,
        data: notifications,
      });
    } catch (error) {
      next(error);
    }
  }

  async getUnreadCount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const prisma = require('@config/database').default;
      const employee = await prisma.employee.findUnique({ where: { userId } });

      if (!employee) {
        res.json({ success: true, count: 0 });
        return;
      }

      const count = await notificationService.getUnreadCount(employee.id);
      res.json({ success: true, data: { count } });
    } catch (error) {
      next(error);
    }
  }

  async getUnreadNotifications(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
        return;
      }

      // Get employee by userId
      const prisma = require('@config/database').default;
      const employee = await prisma.employee.findUnique({
        where: { userId },
      });

      // If no employee record, return empty notifications
      if (!employee) {
        res.json({
          success: true,
          data: [],
          count: 0,
        });
        return;
      }

      const notifications = await notificationService.getUnreadNotifications(employee.id);

      res.json({
        success: true,
        data: notifications,
        count: notifications.length,
      });
    } catch (error) {
      next(error);
    }
  }

  async markAsRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const notificationId = req.params.notificationId as string;

      const notification = await notificationService.markAsRead(notificationId);

      res.json({
        success: true,
        data: notification,
      });
    } catch (error) {
      next(error);
    }
  }

  async markAllAsRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
        return;
      }

      // Get employee by userId
      const prisma = require('@config/database').default;
      const employee = await prisma.employee.findUnique({
        where: { userId },
      });

      // If no employee record, return success with count 0
      if (!employee) {
        res.json({
          success: true,
          data: { count: 0 },
        });
        return;
      }

      const result = await notificationService.markAllAsRead(employee.id);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteNotification(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const notificationId = req.params.notificationId as string;

      await notificationService.deleteNotification(notificationId);

      res.json({
        success: true,
        message: 'Notification deleted',
      });
    } catch (error) {
      next(error);
    }
  }

  async getUnreadCountByType(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const prisma = require('@config/database').default;
      const employee = await prisma.employee.findUnique({ where: { userId } });

      if (!employee) {
        res.json({ success: true, data: {} });
        return;
      }

      const counts = await notificationService.getUnreadCountByType(employee.id);
      res.json({ success: true, data: counts });
    } catch (error) {
      next(error);
    }
  }

  async getLatestEvaluationNotification(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
        return;
      }

      // Get employee by userId
      const prisma = require('@config/database').default;
      const employee = await prisma.employee.findUnique({
        where: { userId },
      });

      // If no employee record, return null
      if (!employee) {
        res.json({
          success: true,
          data: null,
        });
        return;
      }

      const notification = await notificationService.getLatestEvaluationNotification(employee.id);

      res.json({
        success: true,
        data: notification,
      });
    } catch (error) {
      next(error);
    }
  }

  // ---- Web Push endpoints ----

  /**
   * GET /api/notifications/push/vapid-public-key
   * Returns the VAPID public key so the frontend can subscribe.
   * No authentication required.
   */
  async getVapidPublicKey(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      res.json({
        success: true,
        data: { publicKey: process.env.VAPID_PUBLIC_KEY ?? '' },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/notifications/push/subscribe
   * Saves a push subscription for the authenticated user.
   * Body: { endpoint, keys: { p256dh, auth } }
   */
  async subscribePush(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const { endpoint, keys } = req.body ?? {};

      if (!endpoint || !keys?.p256dh || !keys?.auth) {
        res.status(400).json({
          success: false,
          message: 'Invalid subscription: endpoint, keys.p256dh, and keys.auth are required',
        });
        return;
      }

      await pushNotificationService.saveSubscription(userId, endpoint, keys.p256dh, keys.auth);

      res.json({ success: true, message: 'Subscribed to push notifications' });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/notifications/push/unsubscribe
   * Removes a push subscription for the authenticated user.
   * Body: { endpoint }
   */
  async unsubscribePush(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const { endpoint } = req.body ?? {};

      if (!endpoint) {
        res.status(400).json({
          success: false,
          message: 'Invalid request: endpoint is required',
        });
        return;
      }

      await pushNotificationService.removeSubscription(userId, endpoint);

      res.json({ success: true, message: 'Unsubscribed from push notifications' });
    } catch (error) {
      next(error);
    }
  }
}

export default new NotificationController();
