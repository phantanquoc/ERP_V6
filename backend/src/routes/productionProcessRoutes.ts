import express from 'express';
import productionProcessController from '../controllers/productionProcessController';
import { authenticate } from '../middlewares/auth';
import { createSingleUploadMiddleware } from '../middlewares/upload';

const uploadProductionProcessFile = createSingleUploadMiddleware('production-processes');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * @swagger
 * /api/production-processes:
 *   get:
 *     tags: [Production Processes]
 *     summary: Danh sách quy trình sản xuất
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
 *         description: Lấy danh sách quy trình sản xuất thành công
 *       401:
 *         description: Không có quyền truy cập
 */
router.get('/', productionProcessController.getAllProductionProcesses);

/**
 * @swagger
 * /api/production-processes:
 *   post:
 *     tags: [Production Processes]
 *     summary: Tạo quy trình sản xuất
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
 *         description: Tạo quy trình sản xuất thành công
 *       401:
 *         description: Không có quyền truy cập
 */
router.post('/', productionProcessController.createProductionProcess);

/**
 * @swagger
 * /api/production-processes/upload-file:
 *   post:
 *     tags: [Production Processes]
 *     summary: Upload file cho quy trình sản xuất
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
 *       200:
 *         description: Upload file thành công
 *       401:
 *         description: Không có quyền truy cập
 */
router.post('/upload-file', uploadProductionProcessFile, productionProcessController.uploadFile);

/**
 * @swagger
 * /api/production-processes/export/excel/{id}:
 *   get:
 *     tags: [Production Processes]
 *     summary: Xuất chi tiết quy trình sản xuất ra Excel
 *     description: Xuất chi tiết quy trình sản xuất ra file Excel theo ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của quy trình sản xuất
 *     responses:
 *       200:
 *         description: Xuất file Excel thành công
 *         content:
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
 *             schema:
 *               type: string
 *               format: binary
 *       401:
 *         description: Không có quyền truy cập
 *       404:
 *         description: Không tìm thấy quy trình sản xuất
 */
router.get('/export/excel/:id', productionProcessController.exportToExcel);

/**
 * @swagger
 * /api/production-processes/{id}:
 *   get:
 *     tags: [Production Processes]
 *     summary: Chi tiết quy trình sản xuất
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của quy trình sản xuất
 *     responses:
 *       200:
 *         description: Lấy chi tiết quy trình sản xuất thành công
 *       401:
 *         description: Không có quyền truy cập
 *       404:
 *         description: Không tìm thấy quy trình sản xuất
 */
router.get('/:id', productionProcessController.getProductionProcessById);

/**
 * @swagger
 * /api/production-processes/{id}:
 *   put:
 *     tags: [Production Processes]
 *     summary: Cập nhật quy trình sản xuất
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của quy trình sản xuất
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Cập nhật quy trình sản xuất thành công
 *       401:
 *         description: Không có quyền truy cập
 *       404:
 *         description: Không tìm thấy quy trình sản xuất
 */
router.put('/:id', productionProcessController.updateProductionProcess);

/**
 * @swagger
 * /api/production-processes/{id}/sync:
 *   post:
 *     tags: [Production Processes]
 *     summary: Đồng bộ quy trình sản xuất từ template
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của quy trình sản xuất
 *     responses:
 *       200:
 *         description: Đồng bộ quy trình thành công
 *       401:
 *         description: Không có quyền truy cập
 *       404:
 *         description: Không tìm thấy quy trình sản xuất
 */
router.post('/:id/sync', productionProcessController.syncFromTemplate);

/**
 * @swagger
 * /api/production-processes/{id}:
 *   delete:
 *     tags: [Production Processes]
 *     summary: Xóa quy trình sản xuất
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của quy trình sản xuất
 *     responses:
 *       200:
 *         description: Xóa quy trình sản xuất thành công
 *       401:
 *         description: Không có quyền truy cập
 *       404:
 *         description: Không tìm thấy quy trình sản xuất
 */
router.delete('/:id', productionProcessController.deleteProductionProcess);

export default router;

