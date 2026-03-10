import { Router } from 'express';
import orderController from '@controllers/orderController';
import { authenticate, authorize } from '@middlewares/auth';
import { UserRole } from '@types';
import { createSingleUploadMiddleware } from '@middlewares/upload';

const router = Router();

// Upload middleware for orders
const uploadOrder = createSingleUploadMiddleware('orders');

// All routes require authentication
router.use(authenticate);

/**
 * @swagger
 * /api/orders:
 *   get:
 *     tags: [Orders]
 *     summary: Danh sách đơn hàng
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
 *         description: Lấy danh sách đơn hàng thành công
 *       401:
 *         description: Không có quyền truy cập
 */
router.get('/', orderController.getAllOrders);

/**
 * @swagger
 * /api/orders/generate-code:
 *   get:
 *     tags: [Orders]
 *     summary: Tạo mã đơn hàng
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Tạo mã thành công
 *       401:
 *         description: Không có quyền truy cập
 */
router.get('/generate-code', orderController.generateOrderCode);

/**
 * @swagger
 * /api/orders/export/excel:
 *   get:
 *     tags: [Orders]
 *     summary: Xuất danh sách đơn hàng ra Excel
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
router.get('/export/excel', orderController.exportToExcel);

/**
 * @swagger
 * /api/orders/{id}:
 *   get:
 *     tags: [Orders]
 *     summary: Chi tiết đơn hàng
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID đơn hàng
 *     responses:
 *       200:
 *         description: Lấy chi tiết đơn hàng thành công
 *       404:
 *         description: Không tìm thấy đơn hàng
 *       401:
 *         description: Không có quyền truy cập
 */
router.get('/:id', orderController.getOrderById);

/**
 * @swagger
 * /api/orders/from-quotation:
 *   post:
 *     tags: [Orders]
 *     summary: Tạo đơn hàng từ báo giá
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
 *         description: Tạo đơn hàng từ báo giá thành công
 *       400:
 *         description: Dữ liệu không hợp lệ
 *       401:
 *         description: Không có quyền truy cập
 *       403:
 *         description: Không đủ quyền hạn
 */
router.post(
  '/from-quotation',
  authorize(UserRole.ADMIN, UserRole.DEPARTMENT_HEAD),
  uploadOrder,
  orderController.createOrderFromQuotation
);

/**
 * @swagger
 * /api/orders/{id}:
 *   patch:
 *     tags: [Orders]
 *     summary: Cập nhật đơn hàng
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID đơn hàng
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
 *       200:
 *         description: Cập nhật đơn hàng thành công
 *       400:
 *         description: Dữ liệu không hợp lệ
 *       404:
 *         description: Không tìm thấy đơn hàng
 *       401:
 *         description: Không có quyền truy cập
 *       403:
 *         description: Không đủ quyền hạn
 */
router.patch(
  '/:id',
  authorize(UserRole.ADMIN, UserRole.DEPARTMENT_HEAD),
  uploadOrder,
  orderController.updateOrder
);

/**
 * @swagger
 * /api/orders/items/{itemId}:
 *   patch:
 *     tags: [Orders]
 *     summary: Cập nhật item đơn hàng
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID item đơn hàng
 *     responses:
 *       200:
 *         description: Cập nhật item đơn hàng thành công
 *       404:
 *         description: Không tìm thấy item đơn hàng
 *       401:
 *         description: Không có quyền truy cập
 *       403:
 *         description: Không đủ quyền hạn
 */
router.patch(
  '/items/:itemId',
  authorize(UserRole.ADMIN, UserRole.DEPARTMENT_HEAD),
  orderController.updateOrderItem
);

/**
 * @swagger
 * /api/orders/{id}:
 *   delete:
 *     tags: [Orders]
 *     summary: Xóa đơn hàng
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID đơn hàng
 *     responses:
 *       200:
 *         description: Xóa đơn hàng thành công
 *       404:
 *         description: Không tìm thấy đơn hàng
 *       401:
 *         description: Không có quyền truy cập
 *       403:
 *         description: Không đủ quyền hạn
 */
router.delete(
  '/:id',
  authorize(UserRole.ADMIN),
  orderController.deleteOrder
);

export default router;

