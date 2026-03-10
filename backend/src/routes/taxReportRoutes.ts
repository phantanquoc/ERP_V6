import express from 'express';
import {
  getAllTaxReports,
  getTaxReportById,
  getTaxReportByOrderId,
  createTaxReportFromOrder,
  updateTaxReport,
  deleteTaxReport,
  exportTaxReportsToExcel,
} from '../controllers/taxReportController';
import { authenticate } from '../middlewares/auth';
import { createSingleUploadMiddleware } from '../middlewares/upload';

const router = express.Router();

// Upload middleware for tax reports
const uploadTaxReport = createSingleUploadMiddleware('tax-reports');

// All routes require authentication
router.use(authenticate);

/**
 * @swagger
 * /api/tax-reports:
 *   get:
 *     tags: [Tax Reports]
 *     summary: Lấy danh sách báo cáo thuế
 *     description: Trả về danh sách tất cả các báo cáo thuế
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
 *         description: Lấy danh sách báo cáo thuế thành công
 *       401:
 *         description: Chưa xác thực
 */
router.get('/', getAllTaxReports);

/**
 * @swagger
 * /api/tax-reports/export/excel:
 *   get:
 *     tags: [Tax Reports]
 *     summary: Xuất báo cáo thuế ra Excel
 *     description: Xuất danh sách báo cáo thuế ra file Excel
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
router.get('/export/excel', exportTaxReportsToExcel);

/**
 * @swagger
 * /api/tax-reports/{id}:
 *   get:
 *     tags: [Tax Reports]
 *     summary: Lấy báo cáo thuế theo ID
 *     description: Trả về thông tin chi tiết của một báo cáo thuế
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của báo cáo thuế
 *     responses:
 *       200:
 *         description: Lấy báo cáo thuế thành công
 *       401:
 *         description: Chưa xác thực
 *       404:
 *         description: Không tìm thấy báo cáo thuế
 */
router.get('/:id', getTaxReportById);

/**
 * @swagger
 * /api/tax-reports/order/{orderId}:
 *   get:
 *     tags: [Tax Reports]
 *     summary: Lấy báo cáo thuế theo mã đơn hàng
 *     description: Trả về báo cáo thuế liên kết với đơn hàng
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của đơn hàng
 *     responses:
 *       200:
 *         description: Lấy báo cáo thuế thành công
 *       401:
 *         description: Chưa xác thực
 *       404:
 *         description: Không tìm thấy báo cáo thuế
 */
router.get('/order/:orderId', getTaxReportByOrderId);

/**
 * @swagger
 * /api/tax-reports/order/{orderId}:
 *   post:
 *     tags: [Tax Reports]
 *     summary: Tạo báo cáo thuế từ đơn hàng
 *     description: Tạo báo cáo thuế mới từ đơn hàng với file đính kèm
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của đơn hàng
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Tạo báo cáo thuế thành công
 *       400:
 *         description: Dữ liệu không hợp lệ
 *       401:
 *         description: Chưa xác thực
 */
router.post('/order/:orderId', uploadTaxReport, createTaxReportFromOrder);

/**
 * @swagger
 * /api/tax-reports/{id}:
 *   put:
 *     tags: [Tax Reports]
 *     summary: Cập nhật báo cáo thuế
 *     description: Cập nhật thông tin báo cáo thuế theo ID với file đính kèm
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của báo cáo thuế
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Cập nhật báo cáo thuế thành công
 *       401:
 *         description: Chưa xác thực
 *       404:
 *         description: Không tìm thấy báo cáo thuế
 */
router.put('/:id', uploadTaxReport, updateTaxReport);

/**
 * @swagger
 * /api/tax-reports/{id}:
 *   delete:
 *     tags: [Tax Reports]
 *     summary: Xóa báo cáo thuế
 *     description: Xóa một báo cáo thuế theo ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của báo cáo thuế
 *     responses:
 *       200:
 *         description: Xóa báo cáo thuế thành công
 *       401:
 *         description: Chưa xác thực
 *       404:
 *         description: Không tìm thấy báo cáo thuế
 */
router.delete('/:id', deleteTaxReport);

export default router;

