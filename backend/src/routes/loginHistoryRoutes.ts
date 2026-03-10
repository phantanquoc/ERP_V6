import { Router } from 'express';
import loginHistoryController from '@controllers/loginHistoryController';
import { authenticate } from '@middlewares/auth';

const router = Router();

/**
 * @swagger
 * /api/login-history/my-history:
 *   get:
 *     tags: [Login History]
 *     summary: Lịch sử đăng nhập của tôi
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lịch sử đăng nhập của người dùng
 *       401:
 *         description: Chưa xác thực
 */
router.get('/my-history', authenticate, (req, res, next) =>
  loginHistoryController.getMyLoginHistory(req, res, next)
);

/**
 * @swagger
 * /api/login-history:
 *   get:
 *     tags: [Login History]
 *     summary: Tất cả lịch sử đăng nhập
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Tất cả lịch sử đăng nhập
 *       401:
 *         description: Chưa xác thực
 *       403:
 *         description: Không có quyền truy cập
 */
router.get('/', authenticate, (req, res, next) =>
  loginHistoryController.getAllLoginHistory(req, res, next)
);

export default router;

