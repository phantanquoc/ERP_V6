import { Router } from 'express';
import notificationController from '@controllers/notificationController';
import notificationPreferencesController from '@controllers/notificationPreferencesController';
import { authenticate } from '@middlewares/auth';

const router = Router();

/**
 * @swagger
 * /api/notifications:
 *   get:
 *     tags: [Notifications]
 *     summary: Danh sách thông báo
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lấy danh sách thông báo thành công
 *       401:
 *         description: Không có quyền truy cập
 */
router.get(
  '/',
  authenticate,
  notificationController.getEmployeeNotifications
);

/**
 * @swagger
 * /api/notifications/unread/count:
 *   get:
 *     tags: [Notifications]
 *     summary: Số thông báo chưa đọc
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lấy số thông báo chưa đọc thành công
 *       401:
 *         description: Không có quyền truy cập
 */
router.get(
  '/unread/count',
  authenticate,
  notificationController.getUnreadCount
);

router.get(
  '/unread/count-by-type',
  authenticate,
  notificationController.getUnreadCountByType
);

/**
 * GET /api/notifications/stats
 * Aggregate stats for the My Notifications page (total, unread, today, byType).
 * NOTE: must be registered BEFORE /:notificationId to avoid Express capturing "stats" as a param.
 */
router.get(
  '/stats',
  authenticate,
  notificationController.getMyNotificationsStats
);

/**
 * @swagger
 * /api/notifications/unread:
 *   get:
 *     tags: [Notifications]
 *     summary: Thông báo chưa đọc
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lấy thông báo chưa đọc thành công
 *       401:
 *         description: Không có quyền truy cập
 */
router.get(
  '/unread',
  authenticate,
  notificationController.getUnreadNotifications
);

/**
 * @swagger
 * /api/notifications/evaluation/latest:
 *   get:
 *     tags: [Notifications]
 *     summary: Thông báo đánh giá mới nhất
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lấy thông báo đánh giá mới nhất thành công
 *       401:
 *         description: Không có quyền truy cập
 */
router.get(
  '/evaluation/latest',
  authenticate,
  notificationController.getLatestEvaluationNotification
);

/**
 * @swagger
 * /api/notifications/read-all:
 *   patch:
 *     tags: [Notifications]
 *     summary: Đánh dấu tất cả đã đọc
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Đánh dấu tất cả đã đọc thành công
 *       401:
 *         description: Không có quyền truy cập
 */
// NOTE: must be registered BEFORE /:notificationId/read to avoid Express matching
// the literal string "read-all" as a :notificationId param.
router.patch(
  '/read-all',
  authenticate,
  notificationController.markAllAsRead
);

/**
 * GET  /api/notifications/preferences
 * PATCH /api/notifications/preferences
 * Per-user notification mute preferences.
 * NOTE: must be registered BEFORE /:notificationId routes.
 */
router.get(
  '/preferences',
  authenticate,
  notificationPreferencesController.getPreferences
);

router.patch(
  '/preferences',
  authenticate,
  notificationPreferencesController.updatePreferences
);

/**
 * @swagger
 * /api/notifications/{notificationId}/read:
 *   patch:
 *     tags: [Notifications]
 *     summary: Đánh dấu đã đọc
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: notificationId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID thông báo
 *     responses:
 *       200:
 *         description: Đánh dấu đã đọc thành công
 *       401:
 *         description: Không có quyền truy cập
 *       404:
 *         description: Không tìm thấy thông báo
 */
router.patch(
  '/:notificationId/read',
  authenticate,
  notificationController.markAsRead
);

// ---- Web Push routes ----

/**
 * GET /api/notifications/push/vapid-public-key
 * No authentication required — returns the VAPID public key for the frontend to subscribe.
 */
router.get(
  '/push/vapid-public-key',
  notificationController.getVapidPublicKey
);

/**
 * POST /api/notifications/push/subscribe
 * Save a push subscription for the authenticated user.
 */
router.post(
  '/push/subscribe',
  authenticate,
  notificationController.subscribePush
);

/**
 * DELETE /api/notifications/push/unsubscribe
 * Remove a push subscription for the authenticated user.
 * NOTE: registered before /:notificationId to prevent "push" being captured as a param.
 */
router.delete(
  '/push/unsubscribe',
  authenticate,
  notificationController.unsubscribePush
);

/**
 * @swagger
 * /api/notifications/{notificationId}:
 *   delete:
 *     tags: [Notifications]
 *     summary: Xóa thông báo
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: notificationId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID thông báo
 *     responses:
 *       200:
 *         description: Xóa thông báo thành công
 *       401:
 *         description: Không có quyền truy cập
 *       404:
 *         description: Không tìm thấy thông báo
 */
router.delete(
  '/:notificationId',
  authenticate,
  notificationController.deleteNotification
);

export default router;

