import express from 'express';
import { privateFeedbackController } from '../controllers/privateFeedbackController';
import { authenticate } from '@middlewares/auth';
import { createUploadMiddleware } from '@middlewares/upload';

const router = express.Router();

// Upload middleware for feedbacks (multiple files, max 5)
const uploadFeedback = createUploadMiddleware('feedbacks', 5);

// Tất cả routes đều cần authentication
router.use(authenticate);

/**
 * @swagger
 * /api/private-feedbacks/stats:
 *   get:
 *     tags: [Private Feedbacks]
 *     summary: Thống kê góp ý
 *     description: Lấy thống kê tổng quan về góp ý nội bộ
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lấy thống kê thành công
 *       401:
 *         description: Không có quyền truy cập
 */
router.get('/stats', privateFeedbackController.getStats);

/**
 * @swagger
 * /api/private-feedbacks/generate-code:
 *   post:
 *     tags: [Private Feedbacks]
 *     summary: Tạo mã góp ý
 *     description: Tạo mã tự động cho góp ý mới
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Tạo mã thành công
 *       401:
 *         description: Không có quyền truy cập
 */
router.post('/generate-code', privateFeedbackController.generateCode);

/**
 * @swagger
 * /api/private-feedbacks/code/{code}:
 *   get:
 *     tags: [Private Feedbacks]
 *     summary: Tìm theo mã
 *     description: Lấy thông tin góp ý theo mã code
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: code
 *         required: true
 *         schema:
 *           type: string
 *         description: Mã góp ý
 *     responses:
 *       200:
 *         description: Lấy thông tin góp ý thành công
 *       401:
 *         description: Không có quyền truy cập
 *       404:
 *         description: Không tìm thấy góp ý
 */
router.get('/code/:code', privateFeedbackController.getByCode);

/**
 * @swagger
 * /api/private-feedbacks:
 *   get:
 *     tags: [Private Feedbacks]
 *     summary: Danh sách góp ý
 *     description: Lấy tất cả góp ý nội bộ
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
 *         description: Lấy danh sách góp ý thành công
 *       401:
 *         description: Không có quyền truy cập
 */
router.get('/', privateFeedbackController.getAll);

/**
 * @swagger
 * /api/private-feedbacks/{id}:
 *   get:
 *     tags: [Private Feedbacks]
 *     summary: Chi tiết góp ý
 *     description: Lấy thông tin chi tiết của một góp ý theo ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của góp ý
 *     responses:
 *       200:
 *         description: Lấy chi tiết góp ý thành công
 *       401:
 *         description: Không có quyền truy cập
 *       404:
 *         description: Không tìm thấy góp ý
 */
router.get('/:id', privateFeedbackController.getById);

/**
 * @swagger
 * /api/private-feedbacks:
 *   post:
 *     tags: [Private Feedbacks]
 *     summary: Tạo góp ý
 *     description: Tạo góp ý mới với khả năng đính kèm nhiều file
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
 *                 description: "Danh sách file đính kèm (tối đa 5 file)"
 *     responses:
 *       201:
 *         description: Tạo góp ý thành công
 *       400:
 *         description: Dữ liệu không hợp lệ
 *       401:
 *         description: Không có quyền truy cập
 */
router.post('/', uploadFeedback, privateFeedbackController.create);

/**
 * @swagger
 * /api/private-feedbacks/{id}:
 *   patch:
 *     tags: [Private Feedbacks]
 *     summary: Cập nhật góp ý
 *     description: Cập nhật thông tin góp ý với khả năng đính kèm nhiều file
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của góp ý
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
 *                 description: "Danh sách file đính kèm (tối đa 5 file)"
 *     responses:
 *       200:
 *         description: Cập nhật góp ý thành công
 *       400:
 *         description: Dữ liệu không hợp lệ
 *       401:
 *         description: Không có quyền truy cập
 *       404:
 *         description: Không tìm thấy góp ý
 */
router.patch('/:id', uploadFeedback, privateFeedbackController.update);

/**
 * @swagger
 * /api/private-feedbacks/{id}:
 *   delete:
 *     tags: [Private Feedbacks]
 *     summary: Xóa góp ý
 *     description: Xóa một góp ý theo ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của góp ý
 *     responses:
 *       200:
 *         description: Xóa góp ý thành công
 *       401:
 *         description: Không có quyền truy cập
 *       404:
 *         description: Không tìm thấy góp ý
 */
router.delete('/:id', privateFeedbackController.delete);

export default router;

