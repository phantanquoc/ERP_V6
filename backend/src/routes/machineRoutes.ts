import { Router } from 'express';
import machineController from '@controllers/machineController';
import { authenticate, authorize } from '@middlewares/auth';
import { UserRole } from '@types';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @swagger
 * /api/machines:
 *   get:
 *     tags: [Machines]
 *     summary: Lấy danh sách máy móc
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
 *         description: Lấy danh sách máy móc thành công
 *       401:
 *         description: Không có quyền truy cập
 */
router.get('/', machineController.getAllMachines);

/**
 * @swagger
 * /api/machines/export/excel:
 *   get:
 *     tags: [Machines]
 *     summary: Xuất danh sách máy móc ra Excel
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
router.get('/export/excel', machineController.exportToExcel);

/**
 * @swagger
 * /api/machines/generate-code:
 *   get:
 *     tags: [Machines]
 *     summary: Tạo mã máy tự động
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Tạo mã máy thành công
 *       401:
 *         description: Không có quyền truy cập
 */
router.get('/generate-code', machineController.generateMachineCode);

/**
 * @swagger
 * /api/machines/{id}:
 *   get:
 *     tags: [Machines]
 *     summary: Lấy chi tiết máy móc theo ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của máy
 *     responses:
 *       200:
 *         description: Lấy chi tiết máy thành công
 *       401:
 *         description: Không có quyền truy cập
 *       404:
 *         description: Không tìm thấy máy
 */
router.get('/:id', machineController.getMachineById);

/**
 * @swagger
 * /api/machines:
 *   post:
 *     tags: [Machines]
 *     summary: Tạo máy mới
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
 *         description: Tạo máy thành công
 *       401:
 *         description: Không có quyền truy cập
 *       403:
 *         description: Không đủ quyền hạn
 */
router.post(
  '/',
  authorize(UserRole.ADMIN, UserRole.DEPARTMENT_HEAD),
  machineController.createMachine
);

/**
 * @swagger
 * /api/machines/{id}:
 *   patch:
 *     tags: [Machines]
 *     summary: Cập nhật thông tin máy
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của máy
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Cập nhật máy thành công
 *       401:
 *         description: Không có quyền truy cập
 *       403:
 *         description: Không đủ quyền hạn
 *       404:
 *         description: Không tìm thấy máy
 */
router.patch(
  '/:id',
  authorize(UserRole.ADMIN, UserRole.DEPARTMENT_HEAD),
  machineController.updateMachine
);

/**
 * @swagger
 * /api/machines/{id}:
 *   delete:
 *     tags: [Machines]
 *     summary: Xóa máy
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của máy
 *     responses:
 *       200:
 *         description: Xóa máy thành công
 *       401:
 *         description: Không có quyền truy cập
 *       403:
 *         description: Không đủ quyền hạn
 *       404:
 *         description: Không tìm thấy máy
 */
router.delete(
  '/:id',
  authorize(UserRole.ADMIN),
  machineController.deleteMachine
);

export default router;

