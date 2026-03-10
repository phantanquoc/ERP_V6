import { Router } from 'express';
import exportCostController from '../controllers/exportCostController';
import { authenticate } from '../middlewares/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @swagger
 * /api/export-costs:
 *   get:
 *     tags: [Export Costs]
 *     summary: Lấy danh sách chi phí xuất khẩu
 *     description: Trả về danh sách tất cả các chi phí xuất khẩu
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
 *         description: Lấy danh sách chi phí xuất khẩu thành công
 *       401:
 *         description: Chưa xác thực
 */
router.get('/', exportCostController.getAllExportCosts);

/**
 * @swagger
 * /api/export-costs/export/excel:
 *   get:
 *     tags: [Export Costs]
 *     summary: Xuất chi phí xuất khẩu ra Excel
 *     description: Xuất danh sách chi phí xuất khẩu ra file Excel
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
router.get('/export/excel', exportCostController.exportToExcel);

/**
 * @swagger
 * /api/export-costs/{id}:
 *   get:
 *     tags: [Export Costs]
 *     summary: Lấy chi phí xuất khẩu theo ID
 *     description: Trả về thông tin chi tiết của một chi phí xuất khẩu
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của chi phí xuất khẩu
 *     responses:
 *       200:
 *         description: Lấy chi phí xuất khẩu thành công
 *       401:
 *         description: Chưa xác thực
 *       404:
 *         description: Không tìm thấy chi phí xuất khẩu
 */
router.get('/:id', exportCostController.getExportCostById);

/**
 * @swagger
 * /api/export-costs:
 *   post:
 *     tags: [Export Costs]
 *     summary: Tạo chi phí xuất khẩu mới
 *     description: Tạo một chi phí xuất khẩu mới
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
 *         description: Tạo chi phí xuất khẩu thành công
 *       400:
 *         description: Dữ liệu không hợp lệ
 *       401:
 *         description: Chưa xác thực
 */
router.post('/', exportCostController.createExportCost);

/**
 * @swagger
 * /api/export-costs/{id}:
 *   put:
 *     tags: [Export Costs]
 *     summary: Cập nhật chi phí xuất khẩu
 *     description: Cập nhật thông tin chi phí xuất khẩu theo ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của chi phí xuất khẩu
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Cập nhật chi phí xuất khẩu thành công
 *       401:
 *         description: Chưa xác thực
 *       404:
 *         description: Không tìm thấy chi phí xuất khẩu
 */
router.put('/:id', exportCostController.updateExportCost);

/**
 * @swagger
 * /api/export-costs/{id}:
 *   delete:
 *     tags: [Export Costs]
 *     summary: Xóa chi phí xuất khẩu
 *     description: Xóa một chi phí xuất khẩu theo ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của chi phí xuất khẩu
 *     responses:
 *       200:
 *         description: Xóa chi phí xuất khẩu thành công
 *       401:
 *         description: Chưa xác thực
 *       404:
 *         description: Không tìm thấy chi phí xuất khẩu
 */
router.delete('/:id', exportCostController.deleteExportCost);

export default router;

