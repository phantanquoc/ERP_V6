import express from 'express';
import {
  getCalculatorByQuotationRequestId,
  upsertCalculator,
  deleteCalculator,
  createQuotationFromCalculator,
} from '../controllers/quotationCalculatorController';
import { authenticate } from '../middlewares/auth';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * @swagger
 * /api/quotation-calculators/quotation-request/{quotationRequestId}:
 *   get:
 *     tags: [Quotation Calculators]
 *     summary: Lấy tính giá theo yêu cầu báo giá
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: quotationRequestId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID yêu cầu báo giá
 *     responses:
 *       200:
 *         description: Lấy tính giá thành công
 *       404:
 *         description: Không tìm thấy tính giá
 *       401:
 *         description: Không có quyền truy cập
 */
router.get('/quotation-request/:quotationRequestId', getCalculatorByQuotationRequestId);

/**
 * @swagger
 * /api/quotation-calculators:
 *   post:
 *     tags: [Quotation Calculators]
 *     summary: Tạo hoặc cập nhật tính giá
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Tạo/cập nhật tính giá thành công
 *       400:
 *         description: Dữ liệu không hợp lệ
 *       401:
 *         description: Không có quyền truy cập
 */
router.post('/', upsertCalculator);

/**
 * @swagger
 * /api/quotation-calculators/quotation-request/{quotationRequestId}/create-quotation:
 *   post:
 *     tags: [Quotation Calculators]
 *     summary: Tạo báo giá từ tính giá
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: quotationRequestId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID yêu cầu báo giá
 *     responses:
 *       201:
 *         description: Tạo báo giá từ tính giá thành công
 *       404:
 *         description: Không tìm thấy tính giá
 *       401:
 *         description: Không có quyền truy cập
 */
router.post('/quotation-request/:quotationRequestId/create-quotation', createQuotationFromCalculator);

/**
 * @swagger
 * /api/quotation-calculators/quotation-request/{quotationRequestId}:
 *   delete:
 *     tags: [Quotation Calculators]
 *     summary: Xóa tính giá theo yêu cầu báo giá
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: quotationRequestId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID yêu cầu báo giá
 *     responses:
 *       200:
 *         description: Xóa tính giá thành công
 *       404:
 *         description: Không tìm thấy tính giá
 *       401:
 *         description: Không có quyền truy cập
 */
router.delete('/quotation-request/:quotationRequestId', deleteCalculator);

export default router;

