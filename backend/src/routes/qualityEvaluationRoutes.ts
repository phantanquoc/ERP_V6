import { Router } from 'express';
import qualityEvaluationController from '@controllers/qualityEvaluationController';
import { authenticate } from '@middlewares/auth';
import { createSingleUploadMiddleware } from '@middlewares/upload';

const router = Router();

// Upload middleware for quality evaluations
const uploadQualityEvaluation = createSingleUploadMiddleware('quality-evaluations');

// All routes require authentication
router.use(authenticate);

/**
 * @swagger
 * /api/quality-evaluations:
 *   get:
 *     tags: [Quality Evaluations]
 *     summary: Danh sách đánh giá chất lượng
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
 *         description: Lấy danh sách đánh giá chất lượng thành công
 *       401:
 *         description: Không có quyền truy cập
 */
router.get('/', qualityEvaluationController.getAllQualityEvaluations.bind(qualityEvaluationController));

/**
 * @swagger
 * /api/quality-evaluations/export/excel:
 *   get:
 *     tags: [Quality Evaluations]
 *     summary: Xuất Excel danh sách đánh giá chất lượng
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Xuất Excel thành công
 *         content:
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
 *             schema:
 *               type: string
 *               format: binary
 *       401:
 *         description: Không có quyền truy cập
 */
router.get('/export/excel', qualityEvaluationController.exportToExcel.bind(qualityEvaluationController));

/**
 * @swagger
 * /api/quality-evaluations/{id}:
 *   get:
 *     tags: [Quality Evaluations]
 *     summary: Chi tiết đánh giá chất lượng
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của đánh giá chất lượng
 *     responses:
 *       200:
 *         description: Lấy chi tiết đánh giá chất lượng thành công
 *       401:
 *         description: Không có quyền truy cập
 *       404:
 *         description: Không tìm thấy đánh giá chất lượng
 */
router.get('/:id', qualityEvaluationController.getQualityEvaluationById.bind(qualityEvaluationController));

/**
 * @swagger
 * /api/quality-evaluations:
 *   post:
 *     tags: [Quality Evaluations]
 *     summary: Tạo đánh giá chất lượng
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
 *         description: Tạo đánh giá chất lượng thành công
 *       401:
 *         description: Không có quyền truy cập
 */
router.post('/', uploadQualityEvaluation, qualityEvaluationController.createQualityEvaluation.bind(qualityEvaluationController));

/**
 * @swagger
 * /api/quality-evaluations/{id}:
 *   put:
 *     tags: [Quality Evaluations]
 *     summary: Cập nhật đánh giá chất lượng
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của đánh giá chất lượng
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
 *         description: Cập nhật đánh giá chất lượng thành công
 *       401:
 *         description: Không có quyền truy cập
 *       404:
 *         description: Không tìm thấy đánh giá chất lượng
 */
router.put('/:id', uploadQualityEvaluation, qualityEvaluationController.updateQualityEvaluation.bind(qualityEvaluationController));

/**
 * @swagger
 * /api/quality-evaluations/{id}:
 *   delete:
 *     tags: [Quality Evaluations]
 *     summary: Xóa đánh giá chất lượng
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của đánh giá chất lượng
 *     responses:
 *       200:
 *         description: Xóa đánh giá chất lượng thành công
 *       401:
 *         description: Không có quyền truy cập
 *       404:
 *         description: Không tìm thấy đánh giá chất lượng
 */
router.delete('/:id', qualityEvaluationController.deleteQualityEvaluation.bind(qualityEvaluationController));

export default router;

