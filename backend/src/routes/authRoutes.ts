import { Router } from 'express';
import authController from '@controllers/authController';
import { validate } from '@middlewares/validation';
import { ipBlockCheck } from '@middlewares/ipBlock';
import { loginRateLimiter } from '@middlewares/rateLimiter';
import { authenticate, authorize } from '@middlewares/auth';

const router = Router();

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Đăng ký tài khoản
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password, firstName, lastName]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 6
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *     responses:
 *       201:
 *         description: Đăng ký thành công
 *       400:
 *         description: Dữ liệu không hợp lệ
 */
router.post(
  '/register',
  validate([
    { field: 'email', required: true, type: 'email' },
    { field: 'password', required: true, type: 'string', minLength: 6 },
    { field: 'firstName', required: true, type: 'string' },
    { field: 'lastName', required: true, type: 'string' },
  ]),
  (req, res, next) => authController.register(req, res, next)
);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Đăng nhập
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Đăng nhập thành công
 *       401:
 *         description: Sai email hoặc mật khẩu
 */
router.post(
  '/login',
  ipBlockCheck,
  loginRateLimiter,
  validate([
    { field: 'identifier', required: true, type: 'string' },
    { field: 'password', required: true, type: 'string' },
  ]),
  (req, res, next) => authController.login(req, res, next)
);

/**
 * @swagger
 * /api/auth/refresh-token:
 *   post:
 *     tags: [Auth]
 *     summary: Làm mới token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Làm mới token thành công
 *       401:
 *         description: Refresh token không hợp lệ
 */
router.post(
  '/refresh-token',
  validate([{ field: 'refreshToken', required: true, type: 'string' }]),
  (req, res, next) => authController.refreshToken(req, res, next)
);

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Đăng xuất
 *     responses:
 *       200:
 *         description: Đăng xuất thành công
 */
router.post('/logout', (req, res, next) => authController.logout(req, res, next));

/**
 * @swagger
 * /api/auth/admin/blocked-ips:
 *   get:
 *     tags: [Auth]
 *     summary: Lấy danh sách IP bị khóa (Admin)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Danh sách IP bị khóa
 *       401:
 *         description: Không có quyền truy cập
 */
router.get(
  '/admin/blocked-ips',
  authenticate,
  authorize('ADMIN'),
  (_req, res, next) => authController.getBlockedIps(_req, res, next)
);

/**
 * @swagger
 * /api/auth/admin/unblock:
 *   post:
 *     tags: [Auth]
 *     summary: Mở khóa IP bị chặn (Admin)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [ipAddress]
 *             properties:
 *               ipAddress:
 *                 type: string
 *     responses:
 *       200:
 *         description: Mở khóa thành công
 *       401:
 *         description: Không có quyền
 */
router.post(
  '/admin/unblock',
  authenticate,
  authorize('ADMIN'),
  (req, res, next) => authController.unblockIp(req, res, next)
);

export default router;

