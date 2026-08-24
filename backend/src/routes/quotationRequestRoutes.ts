import { Router } from 'express';
import quotationRequestController from '@controllers/quotationRequestController';
import { authenticate } from '@middlewares/auth';
import { requireRule } from '@middlewares/requireRule';
import { zodValidate } from '@middlewares/zodValidation';
import { createQuotationRequestSchema, updateQuotationRequestSchema } from '@schemas';
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
router.get('/', requireRule('quotation-requests', 'READ'), quotationRequestController.getAllQuotationRequests);

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
router.get('/generate-code', requireRule('quotation-requests', 'READ'), quotationRequestController.generateQuotationRequestCode);

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
router.get('/export/excel', requireRule('quotation-requests', 'EXPORT'), quotationRequestController.exportToExcel);

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
router.get('/code/:code', requireRule('quotation-requests', 'READ'), quotationRequestController.getQuotationRequestByCode);

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
router.get('/:id', requireRule('quotation-requests', 'READ'), quotationRequestController.getQuotationRequestById);

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
  requireRule('quotation-requests', 'CREATE'),
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
  requireRule('quotation-requests', 'UPDATE'),
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
  requireRule('quotation-requests', 'DELETE'),
  quotationRequestController.deleteQuotationRequest
);

// Cancel action — POST /:id/cancel
router.post(
  '/:id/cancel',
  requireRule('quotation-requests', 'CREATE'),
  quotationRequestController.cancelQuotationRequest
);

// Mark in-progress — POST /:id/mark-in-progress
// Advances CHO_XU_LY → DANG_BAO_GIA when user opens the create-quotation popup
router.post(
  '/:id/mark-in-progress',
  requireRule('quotation-requests', 'CREATE'),
  quotationRequestController.markInProgress
);

// Pricing room review — approve CHO_XU_LY → DANG_BAO_GIA
router.post(
  '/:id/approve',
  requireRule('quotation-requests', 'CREATE'),
  async (req: any, res: any, next: any) => {
    const { isPricingApprover } = await import('@utils/isPricingApprover');
    if (await isPricingApprover(req.user)) return next();
    return res.status(403).json({ success: false, message: 'Không có quyền duyệt YCBG' });
  },
  quotationRequestController.approveQuotationRequest
);

// Pricing room review — reject CHO_XU_LY → HUY
router.post(
  '/:id/reject',
  requireRule('quotation-requests', 'CREATE'),
  async (req: any, res: any, next: any) => {
    const { isPricingApprover } = await import('@utils/isPricingApprover');
    if (await isPricingApprover(req.user)) return next();
    return res.status(403).json({ success: false, message: 'Không có quyền từ chối YCBG' });
  },
  quotationRequestController.rejectQuotationRequest
);

export default router;

