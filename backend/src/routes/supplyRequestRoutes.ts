import { Router } from 'express';
import supplyRequestController from '@controllers/supplyRequestController';
import { authenticate } from '@middlewares/auth';
import { requireRule } from '@middlewares/requireRule';
const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @swagger
 * /api/supply-requests:
 *   get:
 *     summary: Lấy danh sách yêu cầu cung ứng
 *     description: "Lấy tất cả yêu cầu cung ứng có phân trang (tất cả người dùng đã xác thực đều có thể xem)"
 *     tags: [Supply Requests]
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
 *         description: Lấy danh sách yêu cầu cung ứng thành công
 *       401:
 *         description: Không có quyền truy cập
 */
router.get('/', supplyRequestController.getAllSupplyRequests);

/**
 * @swagger
 * /api/supply-requests/export/excel:
 *   get:
 *     summary: Xuất yêu cầu cung ứng ra Excel
 *     description: Xuất danh sách yêu cầu cung ứng ra file Excel
 *     tags: [Supply Requests]
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
router.get('/export/excel', supplyRequestController.exportToExcel);

/**
 * @swagger
 * /api/supply-requests/{id}:
 *   get:
 *     summary: Lấy yêu cầu cung ứng theo ID
 *     description: "Lấy chi tiết một yêu cầu cung ứng theo ID (tất cả người dùng đã xác thực đều có thể xem)"
 *     tags: [Supply Requests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của yêu cầu cung ứng
 *     responses:
 *       200:
 *         description: Lấy yêu cầu cung ứng thành công
 *       401:
 *         description: Không có quyền truy cập
 *       404:
 *         description: Không tìm thấy yêu cầu cung ứng
 */
router.get('/:id', supplyRequestController.getSupplyRequestById);

/**
 * @swagger
 * /api/supply-requests:
 *   post:
 *     summary: Tạo yêu cầu cung ứng mới
 *     description: "Tạo một yêu cầu cung ứng mới (tất cả người dùng đã xác thực đều có thể tạo)"
 *     tags: [Supply Requests]
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
 *         description: Tạo yêu cầu cung ứng thành công
 *       401:
 *         description: Không có quyền truy cập
 *       400:
 *         description: Dữ liệu không hợp lệ
 */
router.post(
  '/',
  supplyRequestController.createSupplyRequest
);

/**
 * @swagger
 * /api/supply-requests/{id}:
 *   put:
 *     summary: Cập nhật yêu cầu cung ứng
 *     description: "Cập nhật yêu cầu cung ứng theo ID (chỉ ADMIN, DEPARTMENT_HEAD, TEAM_LEAD hoặc người tạo)"
 *     tags: [Supply Requests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của yêu cầu cung ứng
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Cập nhật yêu cầu cung ứng thành công
 *       401:
 *         description: Không có quyền truy cập
 *       403:
 *         description: Không đủ quyền hạn
 *       404:
 *         description: Không tìm thấy yêu cầu cung ứng
 */
router.put(
  '/:id',
  requireRule('supply-requests', 'UPDATE'),
  supplyRequestController.updateSupplyRequest
);

/**
 * @swagger
 * /api/supply-requests/{id}:
 *   delete:
 *     summary: Xóa yêu cầu cung ứng
 *     description: "Xóa một yêu cầu cung ứng theo ID (chỉ ADMIN)"
 *     tags: [Supply Requests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của yêu cầu cung ứng
 *     responses:
 *       200:
 *         description: Xóa yêu cầu cung ứng thành công
 *       401:
 *         description: Không có quyền truy cập
 *       403:
 *         description: Không đủ quyền hạn
 *       404:
 *         description: Không tìm thấy yêu cầu cung ứng
 */
router.delete(
  '/:id',
  requireRule('supply-requests', 'DELETE'),
  supplyRequestController.deleteSupplyRequest
);

/**
 * @swagger
 * /api/supply-requests/{id}/cancel:
 *   post:
 *     summary: Hủy yêu cầu cung cấp
 *     description: "Hủy một yêu cầu cung cấp theo ID (chỉ ADMIN, DEPARTMENT_HEAD, TEAM_LEAD)"
 *     tags: [Supply Requests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của yêu cầu cung cấp
 *     responses:
 *       200:
 *         description: Hủy yêu cầu cung cấp thành công
 *       401:
 *         description: Không có quyền truy cập
 *       403:
 *         description: Không đủ quyền hạn
 *       404:
 *         description: Không tìm thấy yêu cầu cung cấp
 */
router.post(
  '/:id/cancel',
  requireRule('supply-requests', 'CREATE'),
  supplyRequestController.cancelSupplyRequest
);

router.patch(
  '/:id/mark-purchased',
  supplyRequestController.markMuaNhanhAsPurchased
);

/**
 * Partial fulfillment of a supply request item.
 * Body: { fulfilledQty, reason?, decidedByEmployeeId, routeShortageToPurchase? }
 */
router.patch(
  '/items/:itemId/partial-fulfill',
  requireRule('supply-requests', 'UPDATE'),
  supplyRequestController.partialFulfillItem
);

/**
 * Batch fulfillment — decide multiple supply request lines at once.
 * Body: { lines: [{ itemId, fulfilledQty, ... }] }
 * Same role restrictions as single-line fulfillment.
 */
router.post(
  '/batch-fulfill',
  requireRule('supply-requests', 'CREATE'),
  supplyRequestController.batchFulfill
);

/**
 * Decision history for a supply request (all decisions across its items).
 */
router.get(
  '/:id/decisions',
  supplyRequestController.getDecisionHistory
);

export default router;

