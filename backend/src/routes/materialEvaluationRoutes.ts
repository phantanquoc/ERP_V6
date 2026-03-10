import { Router } from 'express';
import materialEvaluationController from '@controllers/materialEvaluationController';
import { authenticate, authorize } from '@middlewares/auth';
import { UserRole } from '@types';
import { createSingleUploadMiddleware } from '@middlewares/upload';

const router = Router();

// Upload middleware for material evaluations
const uploadMaterialEvaluation = createSingleUploadMiddleware('material-evaluations');

// All material evaluation routes require authentication
router.use(authenticate);

/**
 * @swagger
 * /api/material-evaluations:
 *   get:
 *     tags: [Material Evaluations]
 *     summary: "Danh sách đánh giá vật liệu"
 *     description: "Roles cho phép: ADMIN, DEPARTMENT_HEAD, TEAM_LEAD, EMPLOYEE"
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
 *         description: "Lấy danh sách đánh giá vật liệu thành công"
 *       401:
 *         description: "Không có quyền truy cập"
 */
router.get(
  '/',
  authorize(UserRole.ADMIN, UserRole.DEPARTMENT_HEAD, UserRole.TEAM_LEAD, UserRole.EMPLOYEE),
  materialEvaluationController.getAllMaterialEvaluations
);

/**
 * @swagger
 * /api/material-evaluations/generate-code:
 *   post:
 *     tags: [Material Evaluations]
 *     summary: "Tạo mã đánh giá vật liệu"
 *     description: "Roles cho phép: ADMIN, DEPARTMENT_HEAD, TEAM_LEAD, EMPLOYEE"
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: "Tạo mã đánh giá thành công"
 *       401:
 *         description: "Không có quyền truy cập"
 */
router.post(
  '/generate-code',
  authorize(UserRole.ADMIN, UserRole.DEPARTMENT_HEAD, UserRole.TEAM_LEAD, UserRole.EMPLOYEE),
  materialEvaluationController.generateMaChien
);

/**
 * @swagger
 * /api/material-evaluations/{id}:
 *   get:
 *     tags: [Material Evaluations]
 *     summary: "Chi tiết đánh giá vật liệu"
 *     description: "Roles cho phép: ADMIN, DEPARTMENT_HEAD, TEAM_LEAD, EMPLOYEE"
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: "ID của đánh giá vật liệu"
 *     responses:
 *       200:
 *         description: "Lấy chi tiết đánh giá vật liệu thành công"
 *       401:
 *         description: "Không có quyền truy cập"
 *       404:
 *         description: "Không tìm thấy đánh giá vật liệu"
 */
router.get(
  '/:id',
  authorize(UserRole.ADMIN, UserRole.DEPARTMENT_HEAD, UserRole.TEAM_LEAD, UserRole.EMPLOYEE),
  materialEvaluationController.getMaterialEvaluationById
);

/**
 * @swagger
 * /api/material-evaluations/ma-chien/{maChien}:
 *   get:
 *     tags: [Material Evaluations]
 *     summary: "Tìm đánh giá vật liệu theo mã chiên"
 *     description: "Roles cho phép: ADMIN, DEPARTMENT_HEAD, TEAM_LEAD, EMPLOYEE"
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: maChien
 *         required: true
 *         schema:
 *           type: string
 *         description: "Mã chiên"
 *     responses:
 *       200:
 *         description: "Lấy đánh giá vật liệu theo mã chiên thành công"
 *       401:
 *         description: "Không có quyền truy cập"
 *       404:
 *         description: "Không tìm thấy đánh giá vật liệu"
 */
router.get(
  '/ma-chien/:maChien',
  authorize(UserRole.ADMIN, UserRole.DEPARTMENT_HEAD, UserRole.TEAM_LEAD, UserRole.EMPLOYEE),
  materialEvaluationController.getMaterialEvaluationByMaChien
);

/**
 * @swagger
 * /api/material-evaluations:
 *   post:
 *     tags: [Material Evaluations]
 *     summary: "Tạo đánh giá vật liệu"
 *     description: "Roles cho phép: ADMIN, DEPARTMENT_HEAD, TEAM_LEAD, EMPLOYEE"
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: "Tạo đánh giá vật liệu thành công"
 *       401:
 *         description: "Không có quyền truy cập"
 */
router.post(
  '/',
  authorize(UserRole.ADMIN, UserRole.DEPARTMENT_HEAD, UserRole.TEAM_LEAD, UserRole.EMPLOYEE),
  uploadMaterialEvaluation,
  materialEvaluationController.createMaterialEvaluation
);

/**
 * @swagger
 * /api/material-evaluations/{id}:
 *   patch:
 *     tags: [Material Evaluations]
 *     summary: "Cập nhật đánh giá vật liệu"
 *     description: "Roles cho phép: ADMIN, DEPARTMENT_HEAD, TEAM_LEAD, EMPLOYEE"
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: "ID của đánh giá vật liệu"
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: "Cập nhật đánh giá vật liệu thành công"
 *       401:
 *         description: "Không có quyền truy cập"
 *       404:
 *         description: "Không tìm thấy đánh giá vật liệu"
 */
router.patch(
  '/:id',
  authorize(UserRole.ADMIN, UserRole.DEPARTMENT_HEAD, UserRole.TEAM_LEAD, UserRole.EMPLOYEE),
  uploadMaterialEvaluation,
  materialEvaluationController.updateMaterialEvaluation
);

/**
 * @swagger
 * /api/material-evaluations/{id}:
 *   delete:
 *     tags: [Material Evaluations]
 *     summary: "Xóa đánh giá vật liệu"
 *     description: "Roles cho phép: ADMIN, DEPARTMENT_HEAD"
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: "ID của đánh giá vật liệu"
 *     responses:
 *       200:
 *         description: "Xóa đánh giá vật liệu thành công"
 *       401:
 *         description: "Không có quyền truy cập"
 *       404:
 *         description: "Không tìm thấy đánh giá vật liệu"
 */
router.delete(
  '/:id',
  authorize(UserRole.ADMIN, UserRole.DEPARTMENT_HEAD),
  materialEvaluationController.deleteMaterialEvaluation
);

export default router;

