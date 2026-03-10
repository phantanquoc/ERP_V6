import { Router } from 'express';
import productionReportController from '@controllers/productionReportController';
import { authenticate } from '@middlewares/auth';
import { createSingleUploadMiddleware } from '@middlewares/upload';

const router = Router();

// Upload middleware for production reports
const uploadProductionReport = createSingleUploadMiddleware('production-reports');

// All routes require authentication
router.use(authenticate);

/**
 * @swagger
 * /api/production-reports:
 *   get:
 *     summary: Lấy danh sách báo cáo sản xuất
 *     tags: [Production Reports]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Danh sách báo cáo sản xuất
 */
router.get('/', productionReportController.getAllProductionReports);

/**
 * @swagger
 * /api/production-reports/{id}:
 *   get:
 *     summary: Lấy báo cáo sản xuất theo ID
 *     tags: [Production Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của báo cáo sản xuất
 *     responses:
 *       200:
 *         description: Chi tiết báo cáo sản xuất
 *       404:
 *         description: Không tìm thấy báo cáo sản xuất
 */
router.get('/:id', productionReportController.getProductionReportById);

/**
 * @swagger
 * /api/production-reports:
 *   post:
 *     summary: Tạo báo cáo sản xuất mới
 *     tags: [Production Reports]
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
 *                 description: Tệp đính kèm báo cáo sản xuất
 *     responses:
 *       201:
 *         description: Tạo báo cáo sản xuất thành công
 */
router.post('/', uploadProductionReport, productionReportController.createProductionReport);

/**
 * @swagger
 * /api/production-reports/{id}:
 *   put:
 *     summary: Cập nhật báo cáo sản xuất
 *     tags: [Production Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của báo cáo sản xuất
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Tệp đính kèm cập nhật
 *     responses:
 *       200:
 *         description: Cập nhật báo cáo sản xuất thành công
 *       404:
 *         description: Không tìm thấy báo cáo sản xuất
 */
router.put('/:id', uploadProductionReport, productionReportController.updateProductionReport);

/**
 * @swagger
 * /api/production-reports/{id}:
 *   delete:
 *     summary: Xóa báo cáo sản xuất
 *     tags: [Production Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của báo cáo sản xuất
 *     responses:
 *       200:
 *         description: Xóa báo cáo sản xuất thành công
 *       404:
 *         description: Không tìm thấy báo cáo sản xuất
 */
router.delete('/:id', productionReportController.deleteProductionReport);

export default router;

