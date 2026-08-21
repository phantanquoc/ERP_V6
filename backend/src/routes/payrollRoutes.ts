import { Router } from 'express';
import payrollController from '@controllers/payrollController';
import { authenticate } from '@middlewares/auth';
import { requireRule } from '@middlewares/requireRule';
const router = Router();

/**
 * @swagger
 * /api/payrolls:
 *   get:
 *     tags: [Payrolls]
 *     summary: Danh sách bảng lương
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
 *       - in: query
 *         name: month
 *         schema:
 *           type: integer
 *         description: Tháng
 *       - in: query
 *         name: year
 *         schema:
 *           type: integer
 *         description: Năm
 *     responses:
 *       200:
 *         description: Lấy danh sách bảng lương thành công
 *       401:
 *         description: Không có quyền truy cập
 */
router.get(
  '/',
  authenticate,
  requireRule('payrolls', 'READ'),
  payrollController.getPayrollByMonthYear
);

router.get(
  '/settings',
  authenticate,
  requireRule('payrolls', 'READ'),
  payrollController.getPayrollSettings
);

router.put(
  '/settings',
  authenticate,
  requireRule('payrolls', 'UPDATE'),
  payrollController.updatePayrollSettings
);

/**
 * @swagger
 * /api/payrolls/export/excel:
 *   get:
 *     tags: [Payrolls]
 *     summary: Xuất Excel bảng lương
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: month
 *         schema:
 *           type: integer
 *         description: Tháng
 *       - in: query
 *         name: year
 *         schema:
 *           type: integer
 *         description: Năm
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
router.get(
  '/export/excel',
  authenticate,
  requireRule('payrolls', 'READ'),
  payrollController.exportToExcel
);

router.post(
  '/send-notifications',
  authenticate,
  requireRule('payrolls', 'CREATE'),
  payrollController.sendPayrollNotifications
);

router.get(
  '/my-payroll',
  authenticate,
  payrollController.getMyPayroll
);

/**
 * @swagger
 * /api/payrolls/{payrollId}/detail:
 *   get:
 *     tags: [Payrolls]
 *     summary: Chi tiết bảng lương
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: payrollId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID bảng lương
 *     responses:
 *       200:
 *         description: Lấy chi tiết bảng lương thành công
 *       401:
 *         description: Không có quyền truy cập
 *       404:
 *         description: Không tìm thấy bảng lương
 */
router.get(
  '/:payrollId/detail',
  authenticate,
  requireRule('payrolls', 'READ'),
  payrollController.getPayrollDetail
);

/**
 * @swagger
 * /api/payrolls:
 *   post:
 *     tags: [Payrolls]
 *     summary: Tạo bảng lương
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               month:
 *                 type: integer
 *                 description: Tháng
 *               year:
 *                 type: integer
 *                 description: Năm
 *     responses:
 *       201:
 *         description: Tạo bảng lương thành công
 *       401:
 *         description: Không có quyền truy cập
 */
router.post(
  '/',
  authenticate,
  requireRule('payrolls', 'CREATE'),
  payrollController.createOrUpdatePayroll
);

/**
 * @swagger
 * /api/payrolls/{payrollId}:
 *   patch:
 *     tags: [Payrolls]
 *     summary: Cập nhật bảng lương
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: payrollId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID bảng lương
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Cập nhật bảng lương thành công
 *       401:
 *         description: Không có quyền truy cập
 *       404:
 *         description: Không tìm thấy bảng lương
 */
router.patch(
  '/:payrollId',
  authenticate,
  requireRule('payrolls', 'UPDATE'),
  payrollController.updatePayroll
);

export default router;

