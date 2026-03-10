import express from 'express';
import {
  getAllDebts,
  getDebtById,
  createDebt,
  updateDebt,
  deleteDebt,
  getDebtSummary,
  exportDebtsToExcel,
} from '../controllers/debtController';
import { createSingleUploadMiddleware } from '../middlewares/upload';

const router = express.Router();

// Upload middleware for debts
const uploadDebt = createSingleUploadMiddleware('debts');

/**
 * @swagger
 * /api/debts:
 *   get:
 *     tags: [Debts]
 *     summary: Lấy danh sách công nợ
 *     description: Trả về danh sách tất cả các công nợ
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
 *         description: Lấy danh sách công nợ thành công
 */
router.get('/', getAllDebts);

/**
 * @swagger
 * /api/debts/summary:
 *   get:
 *     tags: [Debts]
 *     summary: Lấy tổng hợp công nợ
 *     description: Trả về thông tin tổng hợp công nợ
 *     responses:
 *       200:
 *         description: Lấy tổng hợp công nợ thành công
 */
router.get('/summary', getDebtSummary);

/**
 * @swagger
 * /api/debts/export/excel:
 *   get:
 *     tags: [Debts]
 *     summary: Xuất công nợ ra Excel
 *     description: Xuất danh sách công nợ ra file Excel
 *     responses:
 *       200:
 *         description: Xuất file Excel thành công
 *         content:
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
 *             schema:
 *               type: string
 *               format: binary
 */
router.get('/export/excel', exportDebtsToExcel);

/**
 * @swagger
 * /api/debts/{id}:
 *   get:
 *     tags: [Debts]
 *     summary: Lấy công nợ theo ID
 *     description: Trả về thông tin chi tiết của một công nợ
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của công nợ
 *     responses:
 *       200:
 *         description: Lấy công nợ thành công
 *       404:
 *         description: Không tìm thấy công nợ
 */
router.get('/:id', getDebtById);

/**
 * @swagger
 * /api/debts:
 *   post:
 *     tags: [Debts]
 *     summary: Tạo công nợ mới
 *     description: Tạo một công nợ mới với file đính kèm
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Tạo công nợ thành công
 *       400:
 *         description: Dữ liệu không hợp lệ
 */
router.post('/', uploadDebt, createDebt);

/**
 * @swagger
 * /api/debts/{id}:
 *   put:
 *     tags: [Debts]
 *     summary: Cập nhật công nợ
 *     description: Cập nhật thông tin công nợ theo ID với file đính kèm
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của công nợ
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Cập nhật công nợ thành công
 *       404:
 *         description: Không tìm thấy công nợ
 */
router.put('/:id', uploadDebt, updateDebt);

/**
 * @swagger
 * /api/debts/{id}:
 *   delete:
 *     tags: [Debts]
 *     summary: Xóa công nợ
 *     description: Xóa một công nợ theo ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của công nợ
 *     responses:
 *       200:
 *         description: Xóa công nợ thành công
 *       404:
 *         description: Không tìm thấy công nợ
 */
router.delete('/:id', deleteDebt);

export default router;

