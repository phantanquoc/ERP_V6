import { Router } from 'express';
import materialEvaluationController from '@controllers/materialEvaluationController';
import { authenticate, deviceOrJwtAuth } from '@middlewares/auth';
import { requireRule } from '@middlewares/requireRule';
import { createSingleUploadMiddleware } from '@middlewares/upload';
import { zodValidate } from '@middlewares/zodValidation';
import { createMaterialEvaluationSchema } from '@schemas';

const router = Router();

// Upload middleware for material evaluations
const uploadMaterialEvaluation = createSingleUploadMiddleware('material-evaluations');

// Kiosk-accessible endpoints — accept device key OR JWT

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
  deviceOrJwtAuth('DATA_ENTRY'),
  materialEvaluationController.getAllMaterialEvaluations
);

/**
 * @swagger
 * /api/material-evaluations/schedule:
 *   get:
 *     tags: [Material Evaluations]
 *     summary: "Lịch trình mã chiên trong ngày sản xuất"
 *     description: "Trả về 16 mã chiên MC-01 đến MC-16 cho ngày sản xuất. Có thể lọc theo ca."
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: productionDay
 *         schema:
 *           type: string
 *           format: date
 *         description: "Ngày sản xuất (YYYY-MM-DD). Mặc định: ngày sản xuất hiện tại."
 *       - in: query
 *         name: shift
 *         schema:
 *           type: integer
 *           enum: [1, 2, 3]
 *         description: "Lọc theo ca (1, 2, hoặc 3)"
 *     responses:
 *       200:
 *         description: "Lấy lịch trình thành công"
 *       401:
 *         description: "Không có quyền truy cập"
 */
router.get(
  '/schedule',
  deviceOrJwtAuth('DATA_ENTRY'),
  materialEvaluationController.getDailySchedule
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
  authenticate,
  requireRule('material-evaluations', 'READ'),
  materialEvaluationController.getMaterialEvaluationByMaChien
);

/**
 * @swagger
 * /api/material-evaluations/{id}/delete-info:
 *   get:
 *     tags: [Material Evaluations]
 *     summary: "Thông tin liên quan trước khi xóa"
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
 *         description: "Lấy thông tin liên quan thành công"
 *       401:
 *         description: "Không có quyền truy cập"
 *       404:
 *         description: "Không tìm thấy đánh giá vật liệu"
 */
router.get(
  '/:id/delete-info',
  authenticate,
  requireRule('material-evaluations', 'READ'),
  materialEvaluationController.getDeleteInfo
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
  deviceOrJwtAuth('DATA_ENTRY'),
  materialEvaluationController.getMaterialEvaluationById
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
  deviceOrJwtAuth('DATA_ENTRY'),
  uploadMaterialEvaluation,
  zodValidate(createMaterialEvaluationSchema),
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
  authenticate,
  requireRule('material-evaluations', 'UPDATE'),
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
  authenticate,
  requireRule('material-evaluations', 'DELETE'),
  materialEvaluationController.deleteMaterialEvaluation
);

export default router;

