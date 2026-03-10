import { Router } from 'express';
import generalCostController from '../controllers/generalCostController';
import { authenticate } from '../middlewares/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @swagger
 * /api/general-costs:
 *   get:
 *     tags: [General Costs]
 *     summary: Lấy danh sách chi phí chung
 *     description: Trả về danh sách tất cả các chi phí chung
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
 *     responses:
 *       200:
 *         description: Lấy danh sách chi phí chung thành công
 *       401:
 *         description: Chưa xác thực
 */
router.get('/', generalCostController.getAllGeneralCosts);

/**
 * @swagger
 * /api/general-costs/export/excel:
 *   get:
 *     tags: [General Costs]
 *     summary: Xuất chi phí chung ra Excel
 *     description: Xuất danh sách chi phí chung ra file Excel
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Xuất file Excel thành công
 *         content:
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
 *             schema:
 *               type: string
 *               format: binary
 *       401:
 *         description: Chưa xác thực
 */
router.get('/export/excel', generalCostController.exportToExcel);

/**
 * @swagger
 * /api/general-costs/{id}:
 *   get:
 *     tags: [General Costs]
 *     summary: Lấy chi phí chung theo ID
 *     description: Trả về thông tin chi tiết của một chi phí chung
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của chi phí chung
 *     responses:
 *       200:
 *         description: Lấy chi phí chung thành công
 *       401:
 *         description: Chưa xác thực
 *       404:
 *         description: Không tìm thấy chi phí chung
 */
router.get('/:id', generalCostController.getGeneralCostById);

/**
 * @swagger
 * /api/general-costs:
 *   post:
 *     tags: [General Costs]
 *     summary: Tạo chi phí chung mới
 *     description: Tạo một chi phí chung mới
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
 *         description: Tạo chi phí chung thành công
 *       400:
 *         description: Dữ liệu không hợp lệ
 *       401:
 *         description: Chưa xác thực
 */
router.post('/', generalCostController.createGeneralCost);

/**
 * @swagger
 * /api/general-costs/{id}:
 *   put:
 *     tags: [General Costs]
 *     summary: Cập nhật chi phí chung
 *     description: Cập nhật thông tin chi phí chung theo ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của chi phí chung
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Cập nhật chi phí chung thành công
 *       401:
 *         description: Chưa xác thực
 *       404:
 *         description: Không tìm thấy chi phí chung
 */
router.put('/:id', generalCostController.updateGeneralCost);

/**
 * @swagger
 * /api/general-costs/{id}:
 *   delete:
 *     tags: [General Costs]
 *     summary: Xóa chi phí chung
 *     description: Xóa một chi phí chung theo ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của chi phí chung
 *     responses:
 *       200:
 *         description: Xóa chi phí chung thành công
 *       401:
 *         description: Chưa xác thực
 *       404:
 *         description: Không tìm thấy chi phí chung
 */
router.delete('/:id', generalCostController.deleteGeneralCost);

export default router;

