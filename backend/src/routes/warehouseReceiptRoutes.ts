import express from 'express';
import {
  generateReceiptCode,
  createWarehouseReceipt,
  getAllWarehouseReceipts,
} from '../controllers/warehouseReceiptController';
import { authenticate } from '@middlewares/auth';

const router = express.Router();

/**
 * @swagger
 * /api/warehouse-receipts/generate-code:
 *   get:
 *     summary: Tạo mã phiếu nhập kho tự động
 *     tags: [Warehouse Receipts]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Mã phiếu nhập kho được tạo tự động
 */
router.get('/generate-code', authenticate, generateReceiptCode);

/**
 * @swagger
 * /api/warehouse-receipts:
 *   post:
 *     summary: Tạo phiếu nhập kho mới
 *     tags: [Warehouse Receipts]
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
 *         description: Tạo phiếu nhập kho thành công
 */
router.post('/', authenticate, createWarehouseReceipt);

/**
 * @swagger
 * /api/warehouse-receipts:
 *   get:
 *     summary: Lấy danh sách phiếu nhập kho
 *     tags: [Warehouse Receipts]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Danh sách phiếu nhập kho
 */
router.get('/', authenticate, getAllWarehouseReceipts);

export default router;

