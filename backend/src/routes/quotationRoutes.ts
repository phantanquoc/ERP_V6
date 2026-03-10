import { Router } from 'express';
import quotationController from '@controllers/quotationController';
import { authenticate, authorize } from '@middlewares/auth';
import { zodValidate } from '@middlewares/zodValidation';
import { createQuotationSchema, updateQuotationSchema } from '@schemas';
import { UserRole } from '@types';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @swagger
 * /api/quotations:
 *   get:
 *     tags: [Quotations]
 *     summary: Danh sách báo giá
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
 *         description: Lấy danh sách báo giá thành công
 *       401:
 *         description: Không có quyền truy cập
 */
router.get('/', quotationController.getAllQuotations);

/**
 * @swagger
 * /api/quotations/generate-code:
 *   get:
 *     tags: [Quotations]
 *     summary: Tạo mã báo giá
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Tạo mã thành công
 *       401:
 *         description: Không có quyền truy cập
 */
router.get('/generate-code', quotationController.generateQuotationCode);

/**
 * @swagger
 * /api/quotations/export/excel:
 *   get:
 *     tags: [Quotations]
 *     summary: Xuất danh sách báo giá ra Excel
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Xuất Excel thành công
 *         content:
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
 *             schema:
 *               type: string
 *               format: binary
 *       401:
 *         description: Không có quyền truy cập
 */
router.get('/export/excel', quotationController.exportToExcel);

/**
 * @swagger
 * /api/quotations/{id}:
 *   get:
 *     tags: [Quotations]
 *     summary: Chi tiết báo giá
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID báo giá
 *     responses:
 *       200:
 *         description: Lấy chi tiết báo giá thành công
 *       404:
 *         description: Không tìm thấy báo giá
 *       401:
 *         description: Không có quyền truy cập
 */
router.get('/:id', quotationController.getQuotationById);

/**
 * @swagger
 * /api/quotations:
 *   post:
 *     tags: [Quotations]
 *     summary: Tạo báo giá mới
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
 *         description: Tạo báo giá thành công
 *       400:
 *         description: Dữ liệu không hợp lệ
 *       401:
 *         description: Không có quyền truy cập
 *       403:
 *         description: Không đủ quyền hạn
 */
router.post(
  '/',
  authorize(UserRole.ADMIN, UserRole.DEPARTMENT_HEAD),
  zodValidate(createQuotationSchema),
  quotationController.createQuotation
);

/**
 * @swagger
 * /api/quotations/{id}:
 *   patch:
 *     tags: [Quotations]
 *     summary: Cập nhật báo giá
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID báo giá
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Cập nhật báo giá thành công
 *       400:
 *         description: Dữ liệu không hợp lệ
 *       404:
 *         description: Không tìm thấy báo giá
 *       401:
 *         description: Không có quyền truy cập
 *       403:
 *         description: Không đủ quyền hạn
 */
router.patch(
  '/:id',
  authorize(UserRole.ADMIN, UserRole.DEPARTMENT_HEAD),
  zodValidate(updateQuotationSchema),
  quotationController.updateQuotation
);

/**
 * @swagger
 * /api/quotations/{id}:
 *   delete:
 *     tags: [Quotations]
 *     summary: Xóa báo giá
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID báo giá
 *     responses:
 *       200:
 *         description: Xóa báo giá thành công
 *       404:
 *         description: Không tìm thấy báo giá
 *       401:
 *         description: Không có quyền truy cập
 *       403:
 *         description: Không đủ quyền hạn
 */
router.delete(
  '/:id',
  authorize(UserRole.ADMIN),
  quotationController.deleteQuotation
);

export default router;

