import { Router } from 'express';
import acceptanceHandoverController from '@controllers/acceptanceHandoverController';
import { authenticate } from '@middlewares/auth';
import { createSingleUploadMiddleware } from '@middlewares/upload';

const router = Router();

// Upload middleware for acceptance handovers (single file)
const uploadAcceptanceHandover = createSingleUploadMiddleware('acceptance-handovers');

// All routes require authentication
router.use(authenticate);

/**
 * @swagger
 * /api/acceptance-handovers:
 *   get:
 *     tags: [Acceptance Handovers]
 *     summary: Lấy danh sách biên bản nghiệm thu bàn giao
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
 *         description: Lấy danh sách biên bản nghiệm thu thành công
 *       401:
 *         description: Không có quyền truy cập
 */
router.get('/', acceptanceHandoverController.getAllAcceptanceHandovers);

/**
 * @swagger
 * /api/acceptance-handovers/export/excel:
 *   get:
 *     tags: [Acceptance Handovers]
 *     summary: Xuất danh sách biên bản nghiệm thu ra Excel
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
router.get('/export/excel', acceptanceHandoverController.exportToExcel);

/**
 * @swagger
 * /api/acceptance-handovers/generate-code:
 *   get:
 *     tags: [Acceptance Handovers]
 *     summary: Tạo mã biên bản nghiệm thu tự động
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Tạo mã biên bản nghiệm thu thành công
 *       401:
 *         description: Không có quyền truy cập
 */
router.get('/generate-code', acceptanceHandoverController.generateAcceptanceHandoverCode);

/**
 * @swagger
 * /api/acceptance-handovers/{id}:
 *   get:
 *     tags: [Acceptance Handovers]
 *     summary: Lấy chi tiết biên bản nghiệm thu theo ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của biên bản nghiệm thu
 *     responses:
 *       200:
 *         description: Lấy chi tiết biên bản nghiệm thu thành công
 *       401:
 *         description: Không có quyền truy cập
 *       404:
 *         description: Không tìm thấy biên bản nghiệm thu
 */
router.get('/:id', acceptanceHandoverController.getAcceptanceHandoverById);

/**
 * @swagger
 * /api/acceptance-handovers:
 *   post:
 *     tags: [Acceptance Handovers]
 *     summary: Tạo biên bản nghiệm thu mới
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
 *         description: Tạo biên bản nghiệm thu thành công
 *       401:
 *         description: Không có quyền truy cập
 */
router.post('/', uploadAcceptanceHandover, acceptanceHandoverController.createAcceptanceHandover);

/**
 * @swagger
 * /api/acceptance-handovers/{id}:
 *   put:
 *     tags: [Acceptance Handovers]
 *     summary: Cập nhật biên bản nghiệm thu
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của biên bản nghiệm thu
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
 *         description: Cập nhật biên bản nghiệm thu thành công
 *       401:
 *         description: Không có quyền truy cập
 *       404:
 *         description: Không tìm thấy biên bản nghiệm thu
 */
router.put('/:id', uploadAcceptanceHandover, acceptanceHandoverController.updateAcceptanceHandover);

/**
 * @swagger
 * /api/acceptance-handovers/{id}:
 *   delete:
 *     tags: [Acceptance Handovers]
 *     summary: Xóa biên bản nghiệm thu
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của biên bản nghiệm thu
 *     responses:
 *       200:
 *         description: Xóa biên bản nghiệm thu thành công
 *       401:
 *         description: Không có quyền truy cập
 *       404:
 *         description: Không tìm thấy biên bản nghiệm thu
 */
router.delete('/:id', acceptanceHandoverController.deleteAcceptanceHandover);

export default router;

