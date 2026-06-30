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

      const { cursor, types, isRead, dateFrom, dateTo, search, page, sort } = req.query;

      // Determine mode: filter mode takes priority when any filter param is present
      const hasFilterParams = types !== undefined || isRead !== undefined ||
        dateFrom !== undefined || dateTo !== undefined ||
        search !== undefined || page !== undefined || sort !== undefined;

      if (hasFilterParams) {
        // Filter mode — paginated + filterable response
        const rawTypes = Array.isArray(types)
          ? (types as string[])
          : types
          ? [types as string]
          : undefined;

        let parsedIsRead: boolean | undefined;
        if (isRead === 'true') parsedIsRead = true;
        else if (isRead === 'false') parsedIsRead = false;

        const parsedDateFrom = dateFrom ? new Date(dateFrom as string) : undefined;
        const parsedDateTo = dateTo ? new Date(dateTo as string) : undefined;
        const parsedPage = page ? Math.max(1, parseInt(page as string, 10) || 1) : 1;
        const rawLimit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
        const parsedLimit = Math.min(100, Math.max(1, isNaN(rawLimit) ? 20 : rawLimit));
        const parsedSort = sort === 'oldest' ? 'oldest' : 'newest';

        const result = await notificationService.getFilteredNotificationsForEmployee(employeeId, {
          types: rawTypes,
          isRead: parsedIsRead,
          dateFrom: parsedDateFrom,
          dateTo: parsedDateTo,
          search: search as string | undefined,
          page: parsedPage,
          limit: parsedLimit,
          sort: parsedSort,
        });

        res.json({ success: true, data: result });
        return;
      }

      // Cursor mode — used by AllNotificationsModal
      if (cursor !== undefined || (req.query.limit !== undefined && !hasFilterParams)) {
        if (cursor !== undefined) {
          const rawLimit = Number(req.query.limit) || 20;
          const result = await notificationService.getEmployeeNotificationsCursor(employeeId, cursor as string || undefined, rawLimit);
          res.json({ success: true, data: result.data, nextCursor: result.nextCursor, hasMore: result.hasMore });
          return;
        }
      }

      // Legacy mode — used by NotificationBell (limit + since, or no params)
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

  async getMyNotificationsStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      if (!userId) { res.status(401).json({ success: false, message: 'Unauthorized' }); return; }

      const employeeId = await getEmployeeId(userId);
      if (!employeeId) {
        res.json({ success: true, data: { total: 0, unread: 0, today: 0, byType: {} } });
        return;
      }

      const { types, dateFrom, dateTo } = req.query;

      const rawTypes = Array.isArray(types)
        ? (types as string[])
        : types
        ? [types as string]
        : undefined;

      const parsedDateFrom = dateFrom ? new Date(dateFrom as string) : undefined;
      const parsedDateTo = dateTo ? new Date(dateTo as string) : undefined;

      const stats = await notificationService.getNotificationStatsForEmployee(employeeId, {
        types: rawTypes,
        dateFrom: parsedDateFrom,
        dateTo: parsedDateTo,
      });

      res.json({ success: true, data: stats });
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
