import { Request, Response } from 'express';
import notificationService from '@services/notificationService';

export class NotificationController {
  async getEmployeeNotifications(req: Request, res: Response): Promise<void> {
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
      console.error('Error fetching notifications:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Error fetching notifications',
      });
    }
  }

  async getUnreadNotifications(req: Request, res: Response): Promise<void> {
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
      console.error('Error fetching unread notifications:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Error fetching unread notifications',
      });
    }
  }

  async markAsRead(req: Request, res: Response): Promise<void> {
    try {
      const notificationId = req.params.notificationId as string;

      const notification = await notificationService.markAsRead(notificationId);

      res.json({
        success: true,
        data: notification,
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Error marking notification as read',
      });
    }
  }

  async markAllAsRead(req: Request, res: Response): Promise<void> {
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
      console.error('Error marking all notifications as read:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Error marking all notifications as read',
      });
    }
  }

  async deleteNotification(req: Request, res: Response): Promise<void> {
    try {
      const notificationId = req.params.notificationId as string;

      await notificationService.deleteNotification(notificationId);

      res.json({
        success: true,
        message: 'Notification deleted',
      });
    } catch (error) {
      console.error('Error deleting notification:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Error deleting notification',
      });
    }
  }

  async getLatestEvaluationNotification(req: Request, res: Response): Promise<void> {
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
      console.error('Error fetching latest evaluation notification:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Error fetching latest evaluation notification',
      });
    }
  }
}

export default new NotificationController();

