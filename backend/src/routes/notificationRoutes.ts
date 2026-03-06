import { Router } from 'express';
import notificationController from '@controllers/notificationController';
import { authenticate } from '@middlewares/auth';

const router = Router();

// GET /api/notifications
router.get(
  '/',
  authenticate,
  notificationController.getEmployeeNotifications
);

// GET /api/notifications/unread
router.get(
  '/unread',
  authenticate,
  notificationController.getUnreadNotifications
);

// GET /api/notifications/evaluation/latest
router.get(
  '/evaluation/latest',
  authenticate,
  notificationController.getLatestEvaluationNotification
);

// PATCH /api/notifications/:notificationId/read
router.patch(
  '/:notificationId/read',
  authenticate,
  notificationController.markAsRead
);

// PATCH /api/notifications/read-all
router.patch(
  '/read-all',
  authenticate,
  notificationController.markAllAsRead
);

// DELETE /api/notifications/:notificationId
router.delete(
  '/:notificationId',
  authenticate,
  notificationController.deleteNotification
);

export default router;

