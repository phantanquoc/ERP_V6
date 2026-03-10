import { Router } from 'express';
import supplyRequestController from '@controllers/supplyRequestController';
import { authenticate, authorize } from '@middlewares/auth';
import { UserRole } from '@types';

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
  authorize(UserRole.ADMIN, UserRole.DEPARTMENT_HEAD, UserRole.TEAM_LEAD),
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
  authorize(UserRole.ADMIN),
  supplyRequestController.deleteSupplyRequest
);

export default router;

