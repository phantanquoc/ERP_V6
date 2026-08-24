import { Router } from 'express';
import purchaseRequestController from '@controllers/purchaseRequestController';
import { authenticate } from '@middlewares/auth';
import { requireRule } from '@middlewares/requireRule';
import { createSingleUploadMiddleware } from '@middlewares/upload';
const router = Router();

// Upload middleware for purchase requests (single file)
const uploadPurchaseRequest = createSingleUploadMiddleware('purchase-requests');

// All routes require authentication
router.use(authenticate);

/**
 * @swagger
 * /api/purchase-requests:
 *   get:
 *     summary: Lấy danh sách yêu cầu mua hàng
 *     description: Lấy tất cả yêu cầu mua hàng có phân trang
 *     tags: [Purchase Requests]
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
 *         description: Lấy danh sách yêu cầu mua hàng thành công
 *       401:
 *         description: Không có quyền truy cập
 */
router.get('/', requireRule('purchase-requests', 'READ'), purchaseRequestController.getAllPurchaseRequests);

/**
 * @swagger
 * /api/purchase-requests/generate-code:
 *   get:
 *     summary: Tạo mã yêu cầu mua hàng
 *     description: Tự động tạo mã yêu cầu mua hàng tiếp theo
 *     tags: [Purchase Requests]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Tạo mã thành công
 *       401:
 *         description: Không có quyền truy cập
 */
router.get('/generate-code', requireRule('purchase-requests', 'READ'), purchaseRequestController.generatePurchaseRequestCode);

/**
 * @swagger
 * /api/purchase-requests/export/excel:
 *   get:
 *     summary: Xuất yêu cầu mua hàng ra Excel
 *     description: Xuất danh sách yêu cầu mua hàng ra file Excel
 *     tags: [Purchase Requests]
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
 *         description: Không có quyền truy cập
 */
router.get('/export/excel', requireRule('purchase-requests', 'EXPORT'), purchaseRequestController.exportToExcel);

/**
 * @swagger
 * /api/purchase-requests/{id}:
 *   get:
 *     summary: Lấy yêu cầu mua hàng theo ID
 *     description: Lấy chi tiết một yêu cầu mua hàng theo ID
 *     tags: [Purchase Requests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của yêu cầu mua hàng
 *     responses:
 *       200:
 *         description: Lấy yêu cầu mua hàng thành công
 *       401:
 *         description: Không có quyền truy cập
 *       404:
 *         description: Không tìm thấy yêu cầu mua hàng
 */
router.get('/:id', requireRule('purchase-requests', 'READ'), purchaseRequestController.getPurchaseRequestById);

/**
 * @swagger
 * /api/purchase-requests:
 *   post:
 *     summary: Tạo yêu cầu mua hàng mới
 *     description: Tạo yêu cầu mua hàng mới với file đính kèm
 *     tags: [Purchase Requests]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: File đính kèm
 *     responses:
 *       201:
 *         description: Tạo yêu cầu mua hàng thành công
 *       401:
 *         description: Không có quyền truy cập
 *       400:
 *         description: Dữ liệu không hợp lệ
 */
router.post('/', requireRule('purchase-requests', 'CREATE'), uploadPurchaseRequest, purchaseRequestController.createPurchaseRequest);

/**
 * @swagger
 * /api/purchase-requests/{id}:
 *   put:
 *     summary: Cập nhật yêu cầu mua hàng
 *     description: Cập nhật yêu cầu mua hàng với file đính kèm
 *     tags: [Purchase Requests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của yêu cầu mua hàng
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: File đính kèm
 *     responses:
 *       200:
 *         description: Cập nhật yêu cầu mua hàng thành công
 *       401:
 *         description: Không có quyền truy cập
 *       404:
 *         description: Không tìm thấy yêu cầu mua hàng
 */
router.put('/:id', requireRule('purchase-requests', 'UPDATE'),
  async (req: any, res: any, next: any) => {
    // EMPLOYEE is only allowed if pricing approver; heads always pass above via authorize
    if (req.user?.role === 'EMPLOYEE') {
      const { isPricingApprover } = await import('@utils/isPricingApprover');
      if (await isPricingApprover(req.user)) return next();
      return res.status(403).json({ success: false, message: 'Không có quyền cập nhật yêu cầu mua hàng' });
    }
    return next();
  },
  uploadPurchaseRequest, purchaseRequestController.updatePurchaseRequest);

/**
 * @swagger
 * /api/purchase-requests/{id}:
 *   delete:
 *     summary: Xóa yêu cầu mua hàng
 *     description: Xóa một yêu cầu mua hàng theo ID
 *     tags: [Purchase Requests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của yêu cầu mua hàng
 *     responses:
 *       200:
 *         description: Xóa yêu cầu mua hàng thành công
 *       401:
 *         description: Không có quyền truy cập
 *       404:
 *         description: Không tìm thấy yêu cầu mua hàng
 */
router.delete('/:id', requireRule('purchase-requests', 'DELETE'), purchaseRequestController.deletePurchaseRequest);

/**
 * Purchasing submits a PR (in 'Chờ báo giá' status) to admin for approval.
 */
router.post(
  '/:id/submit-approval',
  requireRule('purchase-requests', 'CREATE'),
  purchaseRequestController.submitForApproval
);

export default router;

