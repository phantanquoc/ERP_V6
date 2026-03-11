import { Router } from 'express';
import taskController from '@controllers/taskController';
import { authenticate } from '@middlewares/auth';
import { createUploadMiddleware } from '@middlewares/upload';

const router = Router();

// Upload middleware for tasks (multiple files, max 10)
const uploadTasks = createUploadMiddleware('tasks', 10);

// All routes require authentication
router.use(authenticate);

/**
 * @swagger
 * /api/tasks/my-tasks:
 *   get:
 *     tags: [Tasks]
 *     summary: Nhiệm vụ của tôi
 *     description: Lấy danh sách nhiệm vụ được giao cho người dùng hiện tại
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
 *         description: Lấy danh sách nhiệm vụ thành công
 *       401:
 *         description: Không có quyền truy cập
 */
router.get('/my-tasks', taskController.getMyTasks);

/**
 * @swagger
 * /api/tasks:
 *   get:
 *     tags: [Tasks]
 *     summary: Danh sách nhiệm vụ
 *     description: Lấy tất cả nhiệm vụ
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
 *         description: Lấy danh sách nhiệm vụ thành công
 *       401:
 *         description: Không có quyền truy cập
 */
router.get('/', taskController.getAllTasks);

/**
 * @swagger
 * /api/tasks/{id}:
 *   get:
 *     tags: [Tasks]
 *     summary: Chi tiết nhiệm vụ
 *     description: Lấy thông tin chi tiết của một nhiệm vụ theo ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của nhiệm vụ
 *     responses:
 *       200:
 *         description: Lấy chi tiết nhiệm vụ thành công
 *       401:
 *         description: Không có quyền truy cập
 *       404:
 *         description: Không tìm thấy nhiệm vụ
 */
router.get('/:id', taskController.getTaskById);

/**
 * @swagger
 * /api/tasks:
 *   post:
 *     tags: [Tasks]
 *     summary: Tạo nhiệm vụ
 *     description: Tạo nhiệm vụ mới với khả năng đính kèm nhiều file
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
 *         description: Tạo nhiệm vụ thành công
 *       400:
 *         description: Dữ liệu không hợp lệ
 *       401:
 *         description: Không có quyền truy cập
 */
router.post(
  '/',
  uploadTasks,
  taskController.createTask
);

/**
 * @swagger
 * /api/tasks/{id}:
 *   put:
 *     tags: [Tasks]
 *     summary: Cập nhật nhiệm vụ
 *     description: Cập nhật thông tin nhiệm vụ với khả năng đính kèm nhiều file
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của nhiệm vụ
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
 *         description: Cập nhật nhiệm vụ thành công
 *       400:
 *         description: Dữ liệu không hợp lệ
 *       401:
 *         description: Không có quyền truy cập
 *       404:
 *         description: Không tìm thấy nhiệm vụ
 */
router.put(
  '/:id',
  uploadTasks,
  taskController.updateTask
);

/**
 * @swagger
 * /api/tasks/{id}:
 *   delete:
 *     tags: [Tasks]
 *     summary: Xóa nhiệm vụ
 *     description: Xóa một nhiệm vụ theo ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của nhiệm vụ
 *     responses:
 *       200:
 *         description: Xóa nhiệm vụ thành công
 *       401:
 *         description: Không có quyền truy cập
 *       404:
 *         description: Không tìm thấy nhiệm vụ
 */
router.delete('/:id', taskController.deleteTask);

/**
 * @swagger
 * /api/tasks/{id}/accept:
 *   patch:
 *     tags: [Tasks]
 *     summary: Tiếp nhận/Từ chối nhiệm vụ
 *     description: Cập nhật trạng thái tiếp nhận nhiệm vụ (DA_TIEP_NHAN hoặc TU_CHOI)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của nhiệm vụ
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               trangThai:
 *                 type: string
 *                 enum: [DA_TIEP_NHAN, TU_CHOI]
 *     responses:
 *       200:
 *         description: Cập nhật trạng thái thành công
 *       401:
 *         description: Không có quyền truy cập
 *       403:
 *         description: Không phải người nhận nhiệm vụ
 *       404:
 *         description: Không tìm thấy nhiệm vụ
 */
router.patch('/:id/accept', taskController.acceptTask);

export default router;

