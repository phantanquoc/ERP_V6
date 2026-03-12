import { Router } from 'express';
import attendanceController from '@controllers/attendanceController';
import { authenticate } from '@middlewares/auth';

const router = Router();

/**
 * @swagger
 * /api/attendances/date-range:
 *   get:
 *     tags: [Attendances]
 *     summary: Chấm công theo khoảng ngày
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Ngày bắt đầu
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Ngày kết thúc
 *     responses:
 *       200:
 *         description: Lấy danh sách chấm công thành công
 *       401:
 *         description: Không có quyền truy cập
 */
router.get('/date-range', authenticate, (req, res, next) => attendanceController.getAttendanceByDateRange(req, res, next));

/**
 * @swagger
 * /api/attendances/export/excel:
 *   get:
 *     tags: [Attendances]
 *     summary: Xuất Excel chấm công
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Ngày bắt đầu
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Ngày kết thúc
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
router.get('/export/excel', authenticate, (req, res, next) => attendanceController.exportToExcel(req, res, next));

/**
 * @swagger
 * /api/attendances/employee/{employeeId}:
 *   get:
 *     tags: [Attendances]
 *     summary: Chấm công theo nhân viên
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: employeeId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID nhân viên
 *     responses:
 *       200:
 *         description: Lấy chấm công nhân viên thành công
 *       401:
 *         description: Không có quyền truy cập
 *       404:
 *         description: Không tìm thấy nhân viên
 */
router.get('/employee/:employeeId', authenticate, (req, res, next) => attendanceController.getEmployeeAttendance(req, res, next));

/**
 * @swagger
 * /api/attendances/check-in:
 *   post:
 *     tags: [Attendances]
 *     summary: Check-in
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Check-in thành công
 *       401:
 *         description: Không có quyền truy cập
 */
router.post('/check-in', authenticate, (req, res, next) => attendanceController.checkIn(req, res, next));

/**
 * @swagger
 * /api/attendances/check-out:
 *   post:
 *     tags: [Attendances]
 *     summary: Check-out
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Check-out thành công
 *       401:
 *         description: Không có quyền truy cập
 */
router.post('/check-out', authenticate, (req, res, next) => attendanceController.checkOut(req, res, next));

/**
 * @swagger
 * /api/attendances/overtime-check-in:
 *   post:
 *     tags: [Attendances]
 *     summary: Chấm công tăng ca vào
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Chấm công tăng ca vào thành công
 *       401:
 *         description: Không có quyền truy cập
 */
router.post('/overtime-check-in', authenticate, (req, res, next) => attendanceController.overtimeCheckIn(req, res, next));

/**
 * @swagger
 * /api/attendances/overtime-check-out:
 *   post:
 *     tags: [Attendances]
 *     summary: Chấm công tăng ca ra
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Chấm công tăng ca ra thành công
 *       401:
 *         description: Không có quyền truy cập
 */
router.post('/overtime-check-out', authenticate, (req, res, next) => attendanceController.overtimeCheckOut(req, res, next));

/**
 * @swagger
 * /api/attendances:
 *   post:
 *     tags: [Attendances]
 *     summary: Tạo chấm công
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
 *         description: Tạo chấm công thành công
 *       401:
 *         description: Không có quyền truy cập
 */
router.post('/', authenticate, (req, res, next) => attendanceController.createAttendance(req, res, next));

/**
 * @swagger
 * /api/attendances/{id}:
 *   put:
 *     tags: [Attendances]
 *     summary: Cập nhật chấm công
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID chấm công
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Cập nhật chấm công thành công
 *       401:
 *         description: Không có quyền truy cập
 *       404:
 *         description: Không tìm thấy chấm công
 */
router.put('/:id', authenticate, (req, res, next) => attendanceController.updateAttendance(req, res, next));

/**
 * @swagger
 * /api/attendances/{id}:
 *   delete:
 *     tags: [Attendances]
 *     summary: Xóa chấm công
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID chấm công
 *     responses:
 *       200:
 *         description: Xóa chấm công thành công
 *       401:
 *         description: Không có quyền truy cập
 *       404:
 *         description: Không tìm thấy chấm công
 */
router.delete('/:id', authenticate, (req, res, next) => attendanceController.deleteAttendance(req, res, next));

export default router;

