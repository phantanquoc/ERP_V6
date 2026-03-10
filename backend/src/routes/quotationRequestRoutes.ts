import { Router } from 'express';
import quotationRequestController from '@controllers/quotationRequestController';
import { authenticate, authorize } from '@middlewares/auth';
import { zodValidate } from '@middlewares/zodValidation';
import { createQuotationRequestSchema, updateQuotationRequestSchema } from '@schemas';
import { UserRole } from '@types';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @swagger
 * /api/quotation-requests:
 *   get:
 *     tags: [Quotation Requests]
 *     summary: Danh sách yêu cầu báo giá
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
 *         description: Lấy danh sách yêu cầu báo giá thành công
 *       401:
 *         description: Không có quyền truy cập
 */
router.get('/', quotationRequestController.getAllQuotationRequests);

/**
 * @swagger
 * /api/quotation-requests/generate-code:
 *   get:
 *     tags: [Quotation Requests]
 *     summary: Tạo mã yêu cầu báo giá
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Tạo mã thành công
 *       401:
 *         description: Không có quyền truy cập
 */
router.get('/generate-code', quotationRequestController.generateQuotationRequestCode);

/**
 * @swagger
 * /api/quotation-requests/export/excel:
 *   get:
 *     tags: [Quotation Requests]
 *     summary: Xuất danh sách yêu cầu báo giá ra Excel
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
router.get('/export/excel', quotationRequestController.exportToExcel);

/**
 * @swagger
 * /api/quotation-requests/code/{code}:
 *   get:
 *     tags: [Quotation Requests]
 *     summary: Tìm yêu cầu báo giá theo mã
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: code
 *         required: true
 *         schema:
 *           type: string
 *         description: Mã yêu cầu báo giá
 *     responses:
 *       200:
 *         description: Tìm thấy yêu cầu báo giá
 *       404:
 *         description: Không tìm thấy yêu cầu báo giá
 *       401:
 *         description: Không có quyền truy cập
 */
router.get('/code/:code', quotationRequestController.getQuotationRequestByCode);

/**
 * @swagger
 * /api/quotation-requests/{id}:
 *   get:
 *     tags: [Quotation Requests]
 *     summary: Chi tiết yêu cầu báo giá
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID yêu cầu báo giá
 *     responses:
 *       200:
 *         description: Lấy chi tiết yêu cầu báo giá thành công
 *       404:
 *         description: Không tìm thấy yêu cầu báo giá
 *       401:
 *         description: Không có quyền truy cập
 */
router.get('/:id', quotationRequestController.getQuotationRequestById);

/**
 * @swagger
 * /api/quotation-requests:
 *   post:
 *     tags: [Quotation Requests]
 *     summary: Tạo yêu cầu báo giá mới
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
 *         description: Tạo yêu cầu báo giá thành công
 *       400:
 *         description: Dữ liệu không hợp lệ
 *       401:
 *         description: Không có quyền truy cập
 *       403:
 *         description: Không đủ quyền hạn
 */
router.post(
  '/',
  authorize(UserRole.ADMIN, UserRole.DEPARTMENT_HEAD, UserRole.EMPLOYEE),
  zodValidate(createQuotationRequestSchema),
  quotationRequestController.createQuotationRequest
);

/**
 * @swagger
 * /api/quotation-requests/{id}:
 *   patch:
 *     tags: [Quotation Requests]
 *     summary: Cập nhật yêu cầu báo giá
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID yêu cầu báo giá
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Cập nhật yêu cầu báo giá thành công
 *       400:
 *         description: Dữ liệu không hợp lệ
 *       404:
 *         description: Không tìm thấy yêu cầu báo giá
 *       401:
 *         description: Không có quyền truy cập
 *       403:
 *         description: Không đủ quyền hạn
 */
router.patch(
  '/:id',
  authorize(UserRole.ADMIN, UserRole.DEPARTMENT_HEAD, UserRole.EMPLOYEE),
  zodValidate(updateQuotationRequestSchema),
  quotationRequestController.updateQuotationRequest
);

/**
 * @swagger
 * /api/quotation-requests/{id}:
 *   delete:
 *     tags: [Quotation Requests]
 *     summary: Xóa yêu cầu báo giá
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID yêu cầu báo giá
 *     responses:
 *       200:
 *         description: Xóa yêu cầu báo giá thành công
 *       404:
 *         description: Không tìm thấy yêu cầu báo giá
 *       401:
 *         description: Không có quyền truy cập
 *       403:
 *         description: Không đủ quyền hạn
 */
router.delete(
  '/:id',
  authorize(UserRole.ADMIN),
  quotationRequestController.deleteQuotationRequest
);

export default router;

