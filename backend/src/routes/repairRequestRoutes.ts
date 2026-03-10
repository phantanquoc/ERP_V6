import { Router } from 'express';
import repairRequestController from '@controllers/repairRequestController';
import { authenticate } from '@middlewares/auth';
import { createSingleUploadMiddleware } from '@middlewares/upload';

const router = Router();

// Upload middleware for repair requests (single file)
const uploadRepairRequest = createSingleUploadMiddleware('repair-requests');

/**
 * @swagger
 * /api/repair-requests:
 *   get:
 *     tags: [Repair Requests]
 *     summary: Lấy danh sách yêu cầu sửa chữa
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
 *         description: Lấy danh sách yêu cầu sửa chữa thành công
 *       401:
 *         description: Không có quyền truy cập
 */
router.get('/', authenticate, repairRequestController.getAllRepairRequests);

/**
 * @swagger
 * /api/repair-requests/export/excel:
 *   get:
 *     tags: [Repair Requests]
 *     summary: Xuất danh sách yêu cầu sửa chữa ra Excel
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
router.get('/export/excel', authenticate, repairRequestController.exportToExcel);

/**
 * @swagger
 * /api/repair-requests/generate-code:
 *   get:
 *     tags: [Repair Requests]
 *     summary: Tạo mã yêu cầu sửa chữa tự động
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Tạo mã yêu cầu sửa chữa thành công
 *       401:
 *         description: Không có quyền truy cập
 */
router.get('/generate-code', authenticate, repairRequestController.generateCode);

/**
 * @swagger
 * /api/repair-requests/{id}:
 *   get:
 *     tags: [Repair Requests]
 *     summary: Lấy chi tiết yêu cầu sửa chữa theo ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của yêu cầu sửa chữa
 *     responses:
 *       200:
 *         description: Lấy chi tiết yêu cầu sửa chữa thành công
 *       401:
 *         description: Không có quyền truy cập
 *       404:
 *         description: Không tìm thấy yêu cầu sửa chữa
 */
router.get('/:id', authenticate, repairRequestController.getRepairRequestById);

/**
 * @swagger
 * /api/repair-requests:
 *   post:
 *     tags: [Repair Requests]
 *     summary: Tạo yêu cầu sửa chữa mới
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
 *         description: Tạo yêu cầu sửa chữa thành công
 *       401:
 *         description: Không có quyền truy cập
 */
router.post('/', authenticate, uploadRepairRequest, repairRequestController.createRepairRequest);

/**
 * @swagger
 * /api/repair-requests/{id}:
 *   put:
 *     tags: [Repair Requests]
 *     summary: Cập nhật yêu cầu sửa chữa
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của yêu cầu sửa chữa
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
 *         description: Cập nhật yêu cầu sửa chữa thành công
 *       401:
 *         description: Không có quyền truy cập
 *       404:
 *         description: Không tìm thấy yêu cầu sửa chữa
 */
router.put('/:id', authenticate, uploadRepairRequest, repairRequestController.updateRepairRequest);

/**
 * @swagger
 * /api/repair-requests/{id}:
 *   delete:
 *     tags: [Repair Requests]
 *     summary: Xóa yêu cầu sửa chữa
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của yêu cầu sửa chữa
 *     responses:
 *       200:
 *         description: Xóa yêu cầu sửa chữa thành công
 *       401:
 *         description: Không có quyền truy cập
 *       404:
 *         description: Không tìm thấy yêu cầu sửa chữa
 */
router.delete('/:id', authenticate, repairRequestController.deleteRepairRequest);

export default router;

