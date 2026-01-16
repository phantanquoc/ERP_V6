import { Router } from 'express';
import notificationController from '@controllers/notificationController';
import { authenticate } from '@middlewares/auth';

const router = Router();

// Get all notifications for current employee
router.get(
  '/notifications',
  authenticate,
  notificationController.getEmployeeNotifications
);

// Get unread notifications for current employee
router.get(
  '/notifications/unread',
  authenticate,
  notificationController.getUnreadNotifications
);

// Get latest evaluation notification
router.get(
  '/notifications/evaluation/latest',
  authenticate,
  notificationController.getLatestEvaluationNotification
);

// Mark notification as read
router.patch(
  '/notifications/:notificationId/read',
  authenticate,
  notificationController.markAsRead
);

// Mark all notifications as read
router.patch(
  '/notifications/read-all',
  authenticate,
  notificationController.markAllAsRead
);

// Delete notification
router.delete(
  '/notifications/:notificationId',
  authenticate,
  notificationController.deleteNotification
);

export default router;

