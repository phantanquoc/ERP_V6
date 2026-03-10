import { Router } from 'express';
import dailyWorkReportController from '@controllers/dailyWorkReportController';
import { authenticate, authorize } from '@middlewares/auth';
import { UserRole } from '@types';
import { createUploadMiddleware } from '@middlewares/upload';

const router = Router();

// Upload middleware for daily work reports (multiple files, max 10)
const uploadDailyWorkReports = createUploadMiddleware('daily-work-reports', 10);

// All routes require authentication
router.use(authenticate);

/**
 * @swagger
 * /api/daily-work-reports/my-reports:
 *   get:
 *     tags: [Daily Work Reports]
 *     summary: Báo cáo của tôi
 *     description: Lấy danh sách báo cáo công việc của người dùng hiện tại
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
 *         description: Lấy danh sách báo cáo thành công
 *       401:
 *         description: Không có quyền truy cập
 */
router.get('/my-reports', dailyWorkReportController.getMyReports);

/**
 * @swagger
 * /api/daily-work-reports/my-statistics:
 *   get:
 *     tags: [Daily Work Reports]
 *     summary: Thống kê của tôi
 *     description: Lấy thống kê báo cáo công việc của người dùng hiện tại
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lấy thống kê thành công
 *       401:
 *         description: Không có quyền truy cập
 */
router.get('/my-statistics', dailyWorkReportController.getReportStatistics);

/**
 * @swagger
 * /api/daily-work-reports:
 *   post:
 *     tags: [Daily Work Reports]
 *     summary: Tạo báo cáo
 *     description: Tạo báo cáo công việc mới với khả năng đính kèm nhiều file
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               files:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: "Danh sách file đính kèm (tối đa 10 file)"
 *     responses:
 *       201:
 *         description: Tạo báo cáo thành công
 *       400:
 *         description: Dữ liệu không hợp lệ
 *       401:
 *         description: Không có quyền truy cập
 */
router.post('/', uploadDailyWorkReports, dailyWorkReportController.createReport);

/**
 * @swagger
 * /api/daily-work-reports/{id}:
 *   patch:
 *     tags: [Daily Work Reports]
 *     summary: Cập nhật báo cáo
 *     description: Cập nhật báo cáo công việc với khả năng đính kèm nhiều file
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của báo cáo
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               files:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: "Danh sách file đính kèm (tối đa 10 file)"
 *     responses:
 *       200:
 *         description: Cập nhật báo cáo thành công
 *       400:
 *         description: Dữ liệu không hợp lệ
 *       401:
 *         description: Không có quyền truy cập
 *       404:
 *         description: Không tìm thấy báo cáo
 */
router.patch('/:id', uploadDailyWorkReports, dailyWorkReportController.updateReport);

/**
 * @swagger
 * /api/daily-work-reports/{id}:
 *   delete:
 *     tags: [Daily Work Reports]
 *     summary: Xóa báo cáo
 *     description: Xóa một báo cáo công việc theo ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của báo cáo
 *     responses:
 *       200:
 *         description: Xóa báo cáo thành công
 *       401:
 *         description: Không có quyền truy cập
 *       404:
 *         description: Không tìm thấy báo cáo
 */
router.delete('/:id', dailyWorkReportController.deleteReport);

/**
 * @swagger
 * /api/daily-work-reports:
 *   get:
 *     tags: [Daily Work Reports]
 *     summary: Tất cả báo cáo
 *     description: "Lấy tất cả báo cáo công việc (chỉ ADMIN, DEPARTMENT_HEAD, TEAM_LEAD)"
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
 *         description: Lấy danh sách báo cáo thành công
 *       401:
 *         description: Không có quyền truy cập
 *       403:
 *         description: Không đủ quyền hạn
 */
router.get(
  '/',
  authorize(UserRole.ADMIN, UserRole.DEPARTMENT_HEAD, UserRole.TEAM_LEAD),
  dailyWorkReportController.getAllReports
);

/**
 * @swagger
 * /api/daily-work-reports/{id}:
 *   get:
 *     tags: [Daily Work Reports]
 *     summary: Chi tiết báo cáo
 *     description: Lấy thông tin chi tiết của một báo cáo theo ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của báo cáo
 *     responses:
 *       200:
 *         description: Lấy chi tiết báo cáo thành công
 *       401:
 *         description: Không có quyền truy cập
 *       404:
 *         description: Không tìm thấy báo cáo
 */
router.get('/:id', dailyWorkReportController.getReportById);

/**
 * @swagger
 * /api/daily-work-reports/employee/{employeeId}:
 *   get:
 *     tags: [Daily Work Reports]
 *     summary: Báo cáo theo nhân viên
 *     description: "Lấy danh sách báo cáo theo nhân viên (chỉ ADMIN, DEPARTMENT_HEAD, TEAM_LEAD)"
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: employeeId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của nhân viên
 *     responses:
 *       200:
 *         description: Lấy danh sách báo cáo thành công
 *       401:
 *         description: Không có quyền truy cập
 *       403:
 *         description: Không đủ quyền hạn
 *       404:
 *         description: Không tìm thấy nhân viên
 */
router.get(
  '/employee/:employeeId',
  authorize(UserRole.ADMIN, UserRole.DEPARTMENT_HEAD, UserRole.TEAM_LEAD),
  dailyWorkReportController.getReportsByEmployeeId
);

/**
 * @swagger
 * /api/daily-work-reports/{id}/comment:
 *   post:
 *     tags: [Daily Work Reports]
 *     summary: Bình luận báo cáo
 *     description: "Thêm bình luận của quản lý vào báo cáo (chỉ ADMIN, DEPARTMENT_HEAD, TEAM_LEAD)"
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của báo cáo
 *     responses:
 *       200:
 *         description: Thêm bình luận thành công
 *       401:
 *         description: Không có quyền truy cập
 *       403:
 *         description: Không đủ quyền hạn
 *       404:
 *         description: Không tìm thấy báo cáo
 */
router.post(
  '/:id/comment',
  authorize(UserRole.ADMIN, UserRole.DEPARTMENT_HEAD, UserRole.TEAM_LEAD),
  dailyWorkReportController.addSupervisorComment
);

export default router;

