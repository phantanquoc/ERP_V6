import { Router } from 'express';
import leaveRequestController from '@controllers/leaveRequestController';
import { authenticate } from '@middlewares/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @swagger
 * /api/leave-requests/export/excel:
 *   get:
 *     tags: [Leave Requests]
 *     summary: Xuất Excel nghỉ phép
 *     description: Xuất danh sách yêu cầu nghỉ phép ra file Excel
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Xuất Excel thành công
 *       401:
 *         description: Không có quyền truy cập
 */
router.get('/export/excel', leaveRequestController.exportToExcel);

/**
 * @swagger
 * /api/leave-requests:
 *   post:
 *     tags: [Leave Requests]
 *     summary: Tạo yêu cầu nghỉ phép
 *     description: Tạo một yêu cầu nghỉ phép mới
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Tạo yêu cầu nghỉ phép thành công
 *       400:
 *         description: Dữ liệu không hợp lệ
 *       401:
 *         description: Không có quyền truy cập
 */
router.post('/', leaveRequestController.createLeaveRequest);

/**
 * @swagger
 * /api/leave-requests:
 *   get:
 *     tags: [Leave Requests]
 *     summary: Danh sách nghỉ phép
 *     description: Lấy tất cả yêu cầu nghỉ phép
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
 *         description: Lấy danh sách nghỉ phép thành công
 *       401:
 *         description: Không có quyền truy cập
 */
router.get('/', leaveRequestController.getAllLeaveRequests);

/**
 * @swagger
 * /api/leave-requests/{id}:
 *   get:
 *     tags: [Leave Requests]
 *     summary: Chi tiết nghỉ phép
 *     description: Lấy thông tin chi tiết yêu cầu nghỉ phép theo ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của yêu cầu nghỉ phép
 *     responses:
 *       200:
 *         description: Lấy chi tiết nghỉ phép thành công
 *       401:
 *         description: Không có quyền truy cập
 *       404:
 *         description: Không tìm thấy yêu cầu nghỉ phép
 */
router.get('/:id', leaveRequestController.getLeaveRequestById);

/**
 * @swagger
 * /api/leave-requests/{id}/approve:
 *   patch:
 *     tags: [Leave Requests]
 *     summary: Duyệt nghỉ phép
 *     description: Duyệt yêu cầu nghỉ phép theo ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của yêu cầu nghỉ phép
 *     responses:
 *       200:
 *         description: Duyệt nghỉ phép thành công
 *       401:
 *         description: Không có quyền truy cập
 *       404:
 *         description: Không tìm thấy yêu cầu nghỉ phép
 */
router.patch('/:id/approve', leaveRequestController.approveLeaveRequest);

/**
 * @swagger
 * /api/leave-requests/{id}/reject:
 *   patch:
 *     tags: [Leave Requests]
 *     summary: Từ chối nghỉ phép
 *     description: Từ chối yêu cầu nghỉ phép theo ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của yêu cầu nghỉ phép
 *     responses:
 *       200:
 *         description: Từ chối nghỉ phép thành công
 *       401:
 *         description: Không có quyền truy cập
 *       404:
 *         description: Không tìm thấy yêu cầu nghỉ phép
 */
router.patch('/:id/reject', leaveRequestController.rejectLeaveRequest);

export default router;

