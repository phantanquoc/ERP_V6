import { Router } from 'express';
import materialStandardController from '@controllers/materialStandardController';
import { authenticate, authorize } from '@middlewares/auth';
import { UserRole } from '@types';

const router = Router();

// All material standard routes require authentication
router.use(authenticate);

/**
 * @swagger
 * /api/material-standards:
 *   get:
 *     tags: [Material Standards]
 *     summary: "Danh sách tiêu chuẩn vật liệu"
 *     description: "Roles cho phép: ADMIN, DEPARTMENT_HEAD, TEAM_LEAD"
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: "Số trang"
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: "Số lượng mỗi trang"
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: "Từ khóa tìm kiếm"
 *     responses:
 *       200:
 *         description: "Lấy danh sách tiêu chuẩn vật liệu thành công"
 *       401:
 *         description: "Không có quyền truy cập"
 *       403:
 *         description: "Không đủ quyền hạn"
 */
router.get(
  '/',
  authorize(UserRole.ADMIN, UserRole.DEPARTMENT_HEAD, UserRole.TEAM_LEAD),
  materialStandardController.getAllMaterialStandards
);

/**
 * @swagger
 * /api/material-standards/{id}:
 *   get:
 *     tags: [Material Standards]
 *     summary: "Chi tiết tiêu chuẩn vật liệu"
 *     description: "Roles cho phép: ADMIN, DEPARTMENT_HEAD, TEAM_LEAD"
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: "ID của tiêu chuẩn vật liệu"
 *     responses:
 *       200:
 *         description: "Lấy chi tiết tiêu chuẩn vật liệu thành công"
 *       401:
 *         description: "Không có quyền truy cập"
 *       403:
 *         description: "Không đủ quyền hạn"
 *       404:
 *         description: "Không tìm thấy tiêu chuẩn vật liệu"
 */
router.get(
  '/:id',
  authorize(UserRole.ADMIN, UserRole.DEPARTMENT_HEAD, UserRole.TEAM_LEAD),
  materialStandardController.getMaterialStandardById
);

/**
 * @swagger
 * /api/material-standards/generate-code:
 *   post:
 *     tags: [Material Standards]
 *     summary: "Tạo mã tiêu chuẩn vật liệu"
 *     description: "Roles cho phép: ADMIN, DEPARTMENT_HEAD"
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: "Tạo mã tiêu chuẩn thành công"
 *       401:
 *         description: "Không có quyền truy cập"
 *       403:
 *         description: "Không đủ quyền hạn"
 */
router.post(
  '/generate-code',
  authorize(UserRole.ADMIN, UserRole.DEPARTMENT_HEAD),
  materialStandardController.generateMaterialStandardCode
);

/**
 * @swagger
 * /api/material-standards:
 *   post:
 *     tags: [Material Standards]
 *     summary: "Tạo tiêu chuẩn vật liệu"
 *     description: "Roles cho phép: ADMIN, DEPARTMENT_HEAD"
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
 *         description: "Tạo tiêu chuẩn vật liệu thành công"
 *       401:
 *         description: "Không có quyền truy cập"
 *       403:
 *         description: "Không đủ quyền hạn"
 */
router.post(
  '/',
  authorize(UserRole.ADMIN, UserRole.DEPARTMENT_HEAD),
  materialStandardController.createMaterialStandard
);

/**
 * @swagger
 * /api/material-standards/{id}:
 *   patch:
 *     tags: [Material Standards]
 *     summary: "Cập nhật tiêu chuẩn vật liệu"
 *     description: "Roles cho phép: ADMIN, DEPARTMENT_HEAD"
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: "ID của tiêu chuẩn vật liệu"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: "Cập nhật tiêu chuẩn vật liệu thành công"
 *       401:
 *         description: "Không có quyền truy cập"
 *       403:
 *         description: "Không đủ quyền hạn"
 *       404:
 *         description: "Không tìm thấy tiêu chuẩn vật liệu"
 */
router.patch(
  '/:id',
  authorize(UserRole.ADMIN, UserRole.DEPARTMENT_HEAD),
  materialStandardController.updateMaterialStandard
);

/**
 * @swagger
 * /api/material-standards/{id}:
 *   delete:
 *     tags: [Material Standards]
 *     summary: "Xóa tiêu chuẩn vật liệu"
 *     description: "Roles cho phép: ADMIN"
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: "ID của tiêu chuẩn vật liệu"
 *     responses:
 *       200:
 *         description: "Xóa tiêu chuẩn vật liệu thành công"
 *       401:
 *         description: "Không có quyền truy cập"
 *       403:
 *         description: "Không đủ quyền hạn"
 *       404:
 *         description: "Không tìm thấy tiêu chuẩn vật liệu"
 */
router.delete(
  '/:id',
  authorize(UserRole.ADMIN),
  materialStandardController.deleteMaterialStandard
);

export default router;

