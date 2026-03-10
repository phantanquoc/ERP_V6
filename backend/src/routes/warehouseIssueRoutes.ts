import express from 'express';
import {
  generateIssueCode,
  createWarehouseIssue,
  getAllWarehouseIssues,
} from '../controllers/warehouseIssueController';
import { authenticate } from '@middlewares/auth';

const router = express.Router();

/**
 * @swagger
 * /api/warehouse-issues/generate-code:
 *   get:
 *     summary: Tạo mã phiếu xuất kho tự động
 *     tags: [Warehouse Issues]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Mã phiếu xuất kho được tạo tự động
 */
router.get('/generate-code', authenticate, generateIssueCode);

/**
 * @swagger
 * /api/warehouse-issues:
 *   post:
 *     summary: Tạo phiếu xuất kho mới
 *     tags: [Warehouse Issues]
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
 *         description: Tạo phiếu xuất kho thành công
 */
router.post('/', authenticate, createWarehouseIssue);

/**
 * @swagger
 * /api/warehouse-issues:
 *   get:
 *     summary: Lấy danh sách phiếu xuất kho
 *     tags: [Warehouse Issues]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Danh sách phiếu xuất kho
 */
router.get('/', authenticate, getAllWarehouseIssues);

export default router;

