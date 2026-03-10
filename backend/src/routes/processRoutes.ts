import { Router } from 'express';
import processController from '@controllers/processController';
import { authenticate, authorize } from '@middlewares/auth';
import { UserRole } from '@types';
import { createSingleUploadMiddleware } from '@middlewares/upload';

const uploadProcessFile = createSingleUploadMiddleware('processes');

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @swagger
 * /api/processes:
 *   get:
 *     tags: [Processes]
 *     summary: Danh sách quy trình
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
 *         description: Lấy danh sách quy trình thành công
 *       401:
 *         description: Không có quyền truy cập
 */
router.get('/', processController.getAllProcesses);

/**
 * @swagger
 * /api/processes/generate-code:
 *   get:
 *     tags: [Processes]
 *     summary: Tạo mã quy trình
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Tạo mã quy trình thành công
 *       401:
 *         description: Không có quyền truy cập
 */
router.get('/generate-code', processController.generateProcessCode);

/**
 * @swagger
 * /api/processes/export/excel:
 *   get:
 *     tags: [Processes]
 *     summary: Xuất Excel danh sách quy trình
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
router.get('/export/excel', processController.exportToExcel);

/**
 * @swagger
 * /api/processes/{id}:
 *   get:
 *     tags: [Processes]
 *     summary: Chi tiết quy trình
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của quy trình
 *     responses:
 *       200:
 *         description: Lấy chi tiết quy trình thành công
 *       401:
 *         description: Không có quyền truy cập
 *       404:
 *         description: Không tìm thấy quy trình
 */
router.get('/:id', processController.getProcessById);

/**
 * @swagger
 * /api/processes:
 *   post:
 *     tags: [Processes]
 *     summary: Tạo quy trình
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
 *         description: Tạo quy trình thành công
 *       401:
 *         description: Không có quyền truy cập
 *       403:
 *         description: Không đủ quyền hạn
 */
router.post(
  '/',
  authorize(UserRole.ADMIN, UserRole.DEPARTMENT_HEAD),
  processController.createProcess
);

/**
 * @swagger
 * /api/processes/upload-file:
 *   post:
 *     tags: [Processes]
 *     summary: Upload file cho quy trình
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
 *     responses:
 *       200:
 *         description: Upload file thành công
 *       401:
 *         description: Không có quyền truy cập
 *       403:
 *         description: Không đủ quyền hạn
 */
router.post(
  '/upload-file',
  authorize(UserRole.ADMIN, UserRole.DEPARTMENT_HEAD),
  uploadProcessFile,
  processController.uploadFile
);

/**
 * @swagger
 * /api/processes/{id}:
 *   put:
 *     tags: [Processes]
 *     summary: Cập nhật quy trình
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của quy trình
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Cập nhật quy trình thành công
 *       401:
 *         description: Không có quyền truy cập
 *       403:
 *         description: Không đủ quyền hạn
 *       404:
 *         description: Không tìm thấy quy trình
 */
router.put(
  '/:id',
  authorize(UserRole.ADMIN, UserRole.DEPARTMENT_HEAD),
  processController.updateProcess
);

/**
 * @swagger
 * /api/processes/{id}:
 *   delete:
 *     tags: [Processes]
 *     summary: Xóa quy trình
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của quy trình
 *     responses:
 *       200:
 *         description: Xóa quy trình thành công
 *       401:
 *         description: Không có quyền truy cập
 *       403:
 *         description: Không đủ quyền hạn
 *       404:
 *         description: Không tìm thấy quy trình
 */
router.delete(
  '/:id',
  authorize(UserRole.ADMIN),
  processController.deleteProcess
);

// ==================== FLOWCHART ROUTES ====================

/**
 * @swagger
 * /api/processes/{processId}/flowchart:
 *   get:
 *     tags: [Processes]
 *     summary: Lấy flowchart của quy trình
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: processId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của quy trình
 *     responses:
 *       200:
 *         description: Lấy flowchart thành công
 *       401:
 *         description: Không có quyền truy cập
 *       404:
 *         description: Không tìm thấy flowchart
 */
router.get('/:processId/flowchart', processController.getFlowchart);

/**
 * @swagger
 * /api/processes/{processId}/flowchart:
 *   post:
 *     tags: [Processes]
 *     summary: Tạo flowchart cho quy trình
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: processId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của quy trình
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Tạo flowchart thành công
 *       401:
 *         description: Không có quyền truy cập
 *       403:
 *         description: Không đủ quyền hạn
 */
router.post(
  '/:processId/flowchart',
  authorize(UserRole.ADMIN, UserRole.DEPARTMENT_HEAD),
  processController.createFlowchart
);

/**
 * @swagger
 * /api/processes/{processId}/flowchart:
 *   put:
 *     tags: [Processes]
 *     summary: Cập nhật flowchart của quy trình
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: processId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của quy trình
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Cập nhật flowchart thành công
 *       401:
 *         description: Không có quyền truy cập
 *       403:
 *         description: Không đủ quyền hạn
 */
router.put(
  '/:processId/flowchart',
  authorize(UserRole.ADMIN, UserRole.DEPARTMENT_HEAD),
  processController.updateFlowchart
);

/**
 * @swagger
 * /api/processes/{processId}/flowchart:
 *   delete:
 *     tags: [Processes]
 *     summary: Xóa flowchart của quy trình
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: processId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của quy trình
 *     responses:
 *       200:
 *         description: Xóa flowchart thành công
 *       401:
 *         description: Không có quyền truy cập
 *       403:
 *         description: Không đủ quyền hạn
 *       404:
 *         description: Không tìm thấy flowchart
 */
router.delete(
  '/:processId/flowchart',
  authorize(UserRole.ADMIN),
  processController.deleteFlowchart
);

export default router;

