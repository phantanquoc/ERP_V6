import { Router } from 'express';
import notificationController from '@controllers/notificationController';
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
router.patch(
  '/read-all',
  authenticate,
  notificationController.markAllAsRead
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

