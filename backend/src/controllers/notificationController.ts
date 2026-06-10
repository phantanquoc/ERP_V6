import { Request, Response, NextFunction } from 'express';
import prisma from '@config/database';
import notificationService from '@services/notificationService';
import pushNotificationService from '@services/pushNotificationService';

async function getEmployeeId(userId: string): Promise<string | null> {
  const employee = await prisma.employee.findUnique({ where: { userId }, select: { id: true } });
  return employee?.id ?? null;
}

export class NotificationController {
  async getEmployeeNotifications(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      if (!userId) { res.status(401).json({ success: false, message: 'Unauthorized' }); return; }

      const employeeId = await getEmployeeId(userId);
      if (!employeeId) { res.json({ success: true, data: [] }); return; }

      const rawLimit = Number(req.query.limit) || 10;
      const limit = Math.min(Math.max(1, rawLimit), 200);
      const sinceParam = req.query.since as string | undefined;
      const since = sinceParam ? new Date(sinceParam) : undefined;

      const notifications = await notificationService.getEmployeeNotifications(employeeId, limit, since);
      res.json({ success: true, data: notifications });
    } catch (error) {
      next(error);
    }
  }

  async getUnreadCount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      if (!userId) { res.status(401).json({ success: false, message: 'Unauthorized' }); return; }

      const employeeId = await getEmployeeId(userId);
      if (!employeeId) { res.json({ success: true, data: { count: 0 } }); return; }

      const count = await notificationService.getUnreadCount(employeeId);
      res.json({ success: true, data: { count } });
    } catch (error) {
      next(error);
    }
  }

  async getUnreadNotifications(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      if (!userId) { res.status(401).json({ success: false, message: 'Unauthorized' }); return; }

      const employeeId = await getEmployeeId(userId);
      if (!employeeId) { res.json({ success: true, data: [] }); return; }

      const notifications = await notificationService.getUnreadNotifications(employeeId);
      res.json({ success: true, data: notifications });
    } catch (error) {
      next(error);
    }
  }

  async markAsRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      if (!userId) { res.status(401).json({ success: false, message: 'Unauthorized' }); return; }

      const employeeId = await getEmployeeId(userId);
      if (!employeeId) { res.status(404).json({ success: false, message: 'Không tìm thấy thông báo' }); return; }

      const notification = await notificationService.markAsRead(req.params.notificationId, employeeId);
      res.json({ success: true, data: notification });
    } catch (error) {
      next(error);
    }
  }

  async markAllAsRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      if (!userId) { res.status(401).json({ success: false, message: 'Unauthorized' }); return; }

      const employeeId = await getEmployeeId(userId);
      if (!employeeId) { res.json({ success: true, data: { count: 0 } }); return; }

      const result = await notificationService.markAllAsRead(employeeId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async deleteNotification(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      if (!userId) { res.status(401).json({ success: false, message: 'Unauthorized' }); return; }

      const employeeId = await getEmployeeId(userId);
      if (!employeeId) { res.status(404).json({ success: false, message: 'Không tìm thấy thông báo' }); return; }

      await notificationService.deleteNotification(req.params.notificationId, employeeId);
      res.json({ success: true, message: 'Xóa thông báo thành công' });
    } catch (error) {
      next(error);
    }
  }

  async getUnreadCountByType(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      if (!userId) { res.status(401).json({ success: false, message: 'Unauthorized' }); return; }

      const employeeId = await getEmployeeId(userId);
      if (!employeeId) { res.json({ success: true, data: {} }); return; }

      const counts = await notificationService.getUnreadCountByType(employeeId);
      res.json({ success: true, data: counts });
    } catch (error) {
      next(error);
    }
  }

  async getLatestEvaluationNotification(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      if (!userId) { res.status(401).json({ success: false, message: 'Unauthorized' }); return; }

      const employeeId = await getEmployeeId(userId);
      if (!employeeId) { res.json({ success: true, data: null }); return; }

      const notification = await notificationService.getLatestEvaluationNotification(employeeId);
      res.json({ success: true, data: notification });
    } catch (error) {
      next(error);
    }
  }

  async getVapidPublicKey(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const key = process.env.VAPID_PUBLIC_KEY;
      if (!key) { res.status(503).json({ success: false, message: 'Push notification chưa được cấu hình' }); return; }
      res.json({ success: true, data: { publicKey: key } });
    } catch (error) {
      next(error);
    }
  }

  async subscribePush(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      if (!userId) { res.status(401).json({ success: false, message: 'Unauthorized' }); return; }

      const { endpoint, keys } = req.body ?? {};
      if (!endpoint || !keys?.p256dh || !keys?.auth) {
        res.status(400).json({ success: false, message: 'Invalid subscription: endpoint, keys.p256dh, and keys.auth are required' });
        return;
      }

      await pushNotificationService.saveSubscription(userId, endpoint, keys.p256dh, keys.auth);
      res.json({ success: true, message: 'Subscribed to push notifications' });
    } catch (error) {
      next(error);
    }
  }

  async unsubscribePush(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      if (!userId) { res.status(401).json({ success: false, message: 'Unauthorized' }); return; }

      const { endpoint } = req.body ?? {};
      if (!endpoint) { res.status(400).json({ success: false, message: 'Invalid request: endpoint is required' }); return; }

      await pushNotificationService.removeSubscription(userId, endpoint);
      res.json({ success: true, message: 'Unsubscribed from push notifications' });
    } catch (error) {
      next(error);
    }
  }
}

export default new NotificationController();
