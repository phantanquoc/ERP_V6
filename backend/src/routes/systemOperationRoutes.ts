import { Router } from 'express';
import systemOperationController from '@controllers/systemOperationController';
import { authenticate, authorize } from '@middlewares/auth';
import { zodValidate } from '@middlewares/zodValidation';
import { createSystemOperationSchema, createBulkSystemOperationSchema, updateSystemOperationSchema } from '@schemas';
import { UserRole } from '@types';

const router = Router();

// All system operation routes require authentication
router.use(authenticate);

/**
 * @swagger
 * /api/system-operations:
 *   get:
 *     tags: [System Operations]
 *     summary: Danh sách thông số hệ thống
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Số trang
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Số lượng mỗi trang
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Từ khóa tìm kiếm
 *     responses:
 *       200:
 *         description: Lấy danh sách thông số thành công
 *       401:
 *         description: Không có quyền truy cập
 */
router.get(
  '/',
  authorize(UserRole.ADMIN, UserRole.DEPARTMENT_HEAD, UserRole.TEAM_LEAD, UserRole.EMPLOYEE),
  systemOperationController.getAllSystemOperations
);

/**
 * @swagger
 * /api/system-operations/{id}:
 *   get:
 *     tags: [System Operations]
 *     summary: Chi tiết thông số hệ thống
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của thông số
 *     responses:
 *       200:
 *         description: Lấy chi tiết thông số thành công
 *       401:
 *         description: Không có quyền truy cập
 *       404:
 *         description: Không tìm thấy thông số
 */
router.get(
  '/:id',
  authorize(UserRole.ADMIN, UserRole.DEPARTMENT_HEAD, UserRole.TEAM_LEAD, UserRole.EMPLOYEE),
  systemOperationController.getSystemOperationById
);

/**
 * @swagger
 * /api/system-operations/ma-chien/{maChien}:
 *   get:
 *     tags: [System Operations]
 *     summary: Tìm thông số theo mã chiên
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: maChien
 *         required: true
 *         schema:
 *           type: string
 *         description: Mã chiên cần tìm
 *     responses:
 *       200:
 *         description: Lấy thông số theo mã chiên thành công
 *       401:
 *         description: Không có quyền truy cập
 *       404:
 *         description: Không tìm thấy thông số
 */
router.get(
  '/ma-chien/:maChien',
  authorize(UserRole.ADMIN, UserRole.DEPARTMENT_HEAD, UserRole.TEAM_LEAD, UserRole.EMPLOYEE),
  systemOperationController.getSystemOperationsByMaChien
);

/**
 * @swagger
 * /api/system-operations/bulk:
 *   post:
 *     tags: [System Operations]
 *     summary: Tạo thông số hàng loạt cho tất cả máy
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Tạo thông số hàng loạt thành công
 *       401:
 *         description: Không có quyền truy cập
 *       403:
 *         description: Không đủ quyền hạn
 */
router.post(
  '/bulk',
  authorize(UserRole.ADMIN, UserRole.DEPARTMENT_HEAD, UserRole.TEAM_LEAD, UserRole.EMPLOYEE),
  zodValidate(createBulkSystemOperationSchema),
  systemOperationController.createBulkSystemOperations
);

/**
 * @swagger
 * /api/system-operations:
 *   post:
 *     tags: [System Operations]
 *     summary: Tạo thông số hệ thống
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Tạo thông số thành công
 *       401:
 *         description: Không có quyền truy cập
 *       403:
 *         description: Không đủ quyền hạn
 */
router.post(
  '/',
  authorize(UserRole.ADMIN, UserRole.DEPARTMENT_HEAD, UserRole.TEAM_LEAD, UserRole.EMPLOYEE),
  zodValidate(createSystemOperationSchema),
  systemOperationController.createSystemOperation
);

/**
 * @swagger
 * /api/system-operations/{id}:
 *   patch:
 *     tags: [System Operations]
 *     summary: Cập nhật thông số hệ thống
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của thông số
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Cập nhật thông số thành công
 *       401:
 *         description: Không có quyền truy cập
 *       403:
 *         description: Không đủ quyền hạn
 *       404:
 *         description: Không tìm thấy thông số
 */
router.patch(
  '/:id',
  authorize(UserRole.ADMIN, UserRole.DEPARTMENT_HEAD, UserRole.TEAM_LEAD, UserRole.EMPLOYEE),
  zodValidate(updateSystemOperationSchema),
  systemOperationController.updateSystemOperation
);

/**
 * @swagger
 * /api/system-operations/{id}:
 *   delete:
 *     tags: [System Operations]
 *     summary: Xóa thông số hệ thống
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của thông số
 *     responses:
 *       200:
 *         description: Xóa thông số thành công
 *       401:
 *         description: Không có quyền truy cập
 *       403:
 *         description: Không đủ quyền hạn
 *       404:
 *         description: Không tìm thấy thông số
 */
router.delete(
  '/:id',
  authorize(UserRole.ADMIN, UserRole.DEPARTMENT_HEAD),
  systemOperationController.deleteSystemOperation
);

export default router;

