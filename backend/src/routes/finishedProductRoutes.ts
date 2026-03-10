import { Router } from 'express';
import finishedProductController from '@controllers/finishedProductController';
import { authenticate } from '@middlewares/auth';
import { createSingleUploadMiddleware } from '@middlewares/upload';

const router = Router();

// Upload middleware for finished products
const uploadFinishedProduct = createSingleUploadMiddleware('finished-products');

// All routes require authentication
router.use(authenticate);

/**
 * @swagger
 * /api/finished-products:
 *   get:
 *     summary: Lấy danh sách thành phẩm
 *     tags: [Finished Products]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Danh sách thành phẩm
 */
router.get('/', finishedProductController.getAllFinishedProducts);

/**
 * @swagger
 * /api/finished-products/export/excel:
 *   get:
 *     summary: Xuất danh sách thành phẩm ra Excel
 *     tags: [Finished Products]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Tệp Excel chứa danh sách thành phẩm
 *         content:
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
 *             schema:
 *               type: string
 *               format: binary
 */
router.get('/export/excel', finishedProductController.exportToExcel);

/**
 * @swagger
 * /api/finished-products/total-weight-by-date:
 *   get:
 *     summary: Lấy tổng trọng lượng thành phẩm theo ngày
 *     tags: [Finished Products]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Tổng trọng lượng thành phẩm theo ngày
 */
router.get('/total-weight-by-date', finishedProductController.getTotalWeightByDate);

/**
 * @swagger
 * /api/finished-products/{id}:
 *   get:
 *     summary: Lấy thành phẩm theo ID
 *     tags: [Finished Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của thành phẩm
 *     responses:
 *       200:
 *         description: Chi tiết thành phẩm
 *       404:
 *         description: Không tìm thấy thành phẩm
 */
router.get('/:id', finishedProductController.getFinishedProductById);

/**
 * @swagger
 * /api/finished-products:
 *   post:
 *     summary: Tạo thành phẩm mới
 *     tags: [Finished Products]
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
 *                 description: Tệp đính kèm thành phẩm
 *     responses:
 *       201:
 *         description: Tạo thành phẩm thành công
 */
router.post('/', uploadFinishedProduct, finishedProductController.createFinishedProduct);

/**
 * @swagger
 * /api/finished-products/{id}:
 *   patch:
 *     summary: Cập nhật thành phẩm
 *     tags: [Finished Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của thành phẩm
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
 *         description: Cập nhật thành phẩm thành công
 *       404:
 *         description: Không tìm thấy thành phẩm
 */
router.patch('/:id', uploadFinishedProduct, finishedProductController.updateFinishedProduct);

/**
 * @swagger
 * /api/finished-products/{id}:
 *   delete:
 *     summary: Xóa thành phẩm
 *     tags: [Finished Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của thành phẩm
 *     responses:
 *       200:
 *         description: Xóa thành phẩm thành công
 *       404:
 *         description: Không tìm thấy thành phẩm
 */
router.delete('/:id', finishedProductController.deleteFinishedProduct);

export default router;

