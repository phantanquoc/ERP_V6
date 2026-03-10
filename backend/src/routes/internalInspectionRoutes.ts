import { Router } from 'express';
import internalInspectionController from '@controllers/internalInspectionController';
import { authenticate, authorize } from '@middlewares/auth';

const router = Router();

/**
 * @swagger
 * /api/internal-inspections:
 *   get:
 *     tags: [Internal Inspections]
 *     summary: "Danh sách kiểm tra nội bộ"
 *     description: "Lấy danh sách kiểm tra nội bộ. Roles cho phép: ADMIN, DEPARTMENT_HEAD"
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: "Số trang"
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: "Số lượng mỗi trang"
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: "Từ khóa tìm kiếm"
 *     responses:
 *       200:
 *         description: "Lấy danh sách kiểm tra nội bộ thành công"
 *       401:
 *         description: "Không có quyền truy cập"
 *       403:
 *         description: "Không đủ quyền hạn"
 */
router.get(
  '/',
  authenticate,
  authorize('ADMIN', 'DEPARTMENT_HEAD'),
  (req, res, next) => internalInspectionController.getAllInspections(req, res, next)
);

/**
 * @swagger
 * /api/internal-inspections/export/excel:
 *   get:
 *     tags: [Internal Inspections]
 *     summary: "Xuất Excel danh sách kiểm tra nội bộ"
 *     description: "Roles cho phép: ADMIN, DEPARTMENT_HEAD"
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: "Xuất Excel thành công"
 *         content:
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
 *             schema:
 *               type: string
 *               format: binary
 *       401:
 *         description: "Không có quyền truy cập"
 *       403:
 *         description: "Không đủ quyền hạn"
 */
router.get(
  '/export/excel',
  authenticate,
  authorize('ADMIN', 'DEPARTMENT_HEAD'),
  (req, res, next) => internalInspectionController.exportToExcel(req, res, next)
);

/**
 * @swagger
 * /api/internal-inspections/{id}:
 *   get:
 *     tags: [Internal Inspections]
 *     summary: "Chi tiết kiểm tra nội bộ"
 *     description: "Roles cho phép: ADMIN, DEPARTMENT_HEAD, TEAM_LEAD"
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: "ID của kiểm tra nội bộ"
 *     responses:
 *       200:
 *         description: "Lấy chi tiết kiểm tra nội bộ thành công"
 *       401:
 *         description: "Không có quyền truy cập"
 *       403:
 *         description: "Không đủ quyền hạn"
 *       404:
 *         description: "Không tìm thấy kiểm tra nội bộ"
 */
router.get(
  '/:id',
  authenticate,
  authorize('ADMIN', 'DEPARTMENT_HEAD', 'TEAM_LEAD'),
  (req, res, next) => internalInspectionController.getInspectionById(req, res, next)
);

/**
 * @swagger
 * /api/internal-inspections:
 *   post:
 *     tags: [Internal Inspections]
 *     summary: "Tạo kiểm tra nội bộ"
 *     description: "Tạo bản ghi kiểm tra nội bộ mới"
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
 *         description: "Tạo kiểm tra nội bộ thành công"
 *       400:
 *         description: "Dữ liệu không hợp lệ"
 *       401:
 *         description: "Không có quyền truy cập"
 *       403:
 *         description: "Không đủ quyền hạn"
 */
router.post(
  '/',
  authenticate,
  authorize('ADMIN', 'DEPARTMENT_HEAD'),
  (req, res, next) => internalInspectionController.createInspection(req, res, next)
);

/**
 * @swagger
 * /api/internal-inspections/{id}:
 *   patch:
 *     tags: [Internal Inspections]
 *     summary: "Cập nhật kiểm tra nội bộ"
 *     description: "Cập nhật thông tin bản ghi kiểm tra nội bộ theo ID"
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: "ID của bản ghi kiểm tra"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: "Cập nhật kiểm tra nội bộ thành công"
 *       400:
 *         description: "Dữ liệu không hợp lệ"
 *       401:
 *         description: "Không có quyền truy cập"
 *       403:
 *         description: "Không đủ quyền hạn"
 *       404:
 *         description: "Không tìm thấy bản ghi kiểm tra"
 */
router.patch(
  '/:id',
  authenticate,
  authorize('ADMIN', 'DEPARTMENT_HEAD'),
  (req, res, next) => internalInspectionController.updateInspection(req, res, next)
);

/**
 * @swagger
 * /api/internal-inspections/{id}:
 *   delete:
 *     tags: [Internal Inspections]
 *     summary: "Xóa kiểm tra nội bộ"
 *     description: "Xóa một bản ghi kiểm tra nội bộ theo ID"
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: "ID của bản ghi kiểm tra"
 *     responses:
 *       200:
 *         description: "Xóa kiểm tra nội bộ thành công"
 *       401:
 *         description: "Không có quyền truy cập"
 *       403:
 *         description: "Không đủ quyền hạn"
 *       404:
 *         description: "Không tìm thấy bản ghi kiểm tra"
 */
router.delete(
  '/:id',
  authenticate,
  authorize('ADMIN', 'DEPARTMENT_HEAD'),
  (req, res, next) => internalInspectionController.deleteInspection(req, res, next)
);

export default router;

