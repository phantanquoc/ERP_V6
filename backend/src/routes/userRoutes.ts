import { Router } from 'express';
import userController from '@controllers/userController';
import { authenticate, authorize } from '@middlewares/auth';
import { validate } from '@middlewares/validation';
import { UserRole } from '@types';

const router = Router();

/**
 * @swagger
 * /api/users/profile:
 *   get:
 *     tags: [Users]
 *     summary: Lấy thông tin cá nhân
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Thông tin cá nhân của người dùng
 *       401:
 *         description: Chưa xác thực
 */
router.get('/profile', authenticate, (req, res, next) => userController.getProfile(req, res, next));

/**
 * @swagger
 * /api/users/change-password:
 *   post:
 *     tags: [Users]
 *     summary: Đổi mật khẩu
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               currentPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Đổi mật khẩu thành công
 *       400:
 *         description: Mật khẩu hiện tại không đúng
 */
router.post('/change-password', authenticate, (req, res, next) => userController.changePassword(req, res, next));

/**
 * @swagger
 * /api/users/profile:
 *   patch:
 *     tags: [Users]
 *     summary: Cập nhật thông tin cá nhân
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *     responses:
 *       200:
 *         description: Cập nhật thông tin thành công
 */
router.patch('/profile', authenticate, (req, res, next) => userController.updateProfile(req, res, next));

/**
 * @swagger
 * /api/users:
 *   post:
 *     tags: [Users]
 *     summary: Tạo tài khoản
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password, firstName, lastName, role]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               role:
 *                 type: string
 *     responses:
 *       201:
 *         description: Tạo tài khoản thành công
 *       400:
 *         description: Dữ liệu không hợp lệ
 *       403:
 *         description: Không có quyền truy cập
 */
router.post(
  '/',
  authenticate,
  authorize(UserRole.ADMIN),
  validate([
    { field: 'email', type: 'string' },
    { field: 'password', type: 'string' },
    { field: 'firstName', type: 'string' },
    { field: 'lastName', type: 'string' },
    { field: 'role', type: 'string' },
  ]),
  (req, res, next) => userController.createUser(req, res, next)
);

/**
 * @swagger
 * /api/users:
 *   get:
 *     tags: [Users]
 *     summary: Danh sách tài khoản
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Danh sách tài khoản
 *       403:
 *         description: Không có quyền truy cập
 */
router.get(
  '/',
  authenticate,
  authorize(UserRole.ADMIN),
  (req, res, next) => userController.getAllUsers(req, res, next)
);

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     tags: [Users]
 *     summary: Chi tiết tài khoản
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID tài khoản
 *     responses:
 *       200:
 *         description: Chi tiết tài khoản
 *       404:
 *         description: Không tìm thấy tài khoản
 *       403:
 *         description: Không có quyền truy cập
 */
router.get(
  '/:id',
  authenticate,
  authorize(UserRole.ADMIN),
  (req, res, next) => userController.getUserById(req, res, next)
);

/**
 * @swagger
 * /api/users/{id}:
 *   patch:
 *     tags: [Users]
 *     summary: Cập nhật tài khoản
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID tài khoản
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               role:
 *                 type: string
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Cập nhật tài khoản thành công
 *       404:
 *         description: Không tìm thấy tài khoản
 *       403:
 *         description: Không có quyền truy cập
 */
router.patch(
  '/:id',
  authenticate,
  authorize(UserRole.ADMIN),
  validate([
    { field: 'firstName', type: 'string' },
    { field: 'lastName', type: 'string' },
    { field: 'role', type: 'string' },
    { field: 'isActive', type: 'boolean' },
  ]),
  (req, res, next) => userController.updateUser(req, res, next)
);

/**
 * @swagger
 * /api/users/{id}:
 *   delete:
 *     tags: [Users]
 *     summary: Xóa tài khoản
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID tài khoản
 *     responses:
 *       200:
 *         description: Xóa tài khoản thành công
 *       404:
 *         description: Không tìm thấy tài khoản
 *       403:
 *         description: Không có quyền truy cập
 */
router.delete(
  '/:id',
  authenticate,
  authorize(UserRole.ADMIN),
  (req, res, next) => userController.deleteUser(req, res, next)
);

/**
 * @swagger
 * /api/users/recalculate-supervisors:
 *   post:
 *     tags: [Users]
 *     summary: Tính lại cấp trên
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Tính lại cấp trên thành công
 *       403:
 *         description: Không có quyền truy cập
 */
router.post(
  '/recalculate-supervisors',
  authenticate,
  authorize(UserRole.ADMIN),
  (req, res, next) => userController.recalculateSupervisors(req, res, next)
);

export default router;

