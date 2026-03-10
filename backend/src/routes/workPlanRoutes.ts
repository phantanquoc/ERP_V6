import { Router } from 'express';
import workPlanController from '@controllers/workPlanController';
import { authenticate, authorize } from '@middlewares/auth';
import { UserRole } from '@types';
import { createUploadMiddleware } from '@middlewares/upload';

const router = Router();

// Upload middleware for work plans (multiple files, max 10)
const uploadWorkPlans = createUploadMiddleware('work-plans', 10);

// All routes require authentication
router.use(authenticate);

/**
 * @swagger
 * /api/work-plans:
 *   get:
 *     tags: [Work Plans]
 *     summary: Danh sách kế hoạch
 *     description: Lấy tất cả kế hoạch công việc
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
 *         description: Lấy danh sách kế hoạch thành công
 *       401:
 *         description: Không có quyền truy cập
 */
router.get('/', workPlanController.getAllWorkPlans);

/**
 * @swagger
 * /api/work-plans/my-work-plans:
 *   get:
 *     tags: [Work Plans]
 *     summary: Kế hoạch của tôi
 *     description: Lấy danh sách kế hoạch công việc mà tôi tạo hoặc được phân công thực hiện
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
 *         description: Lấy danh sách kế hoạch của tôi thành công
 *       401:
 *         description: Không có quyền truy cập
 */
router.get('/my-work-plans', workPlanController.getMyWorkPlans);

/**
 * @swagger
 * /api/work-plans/{id}:
 *   get:
 *     tags: [Work Plans]
 *     summary: Chi tiết kế hoạch
 *     description: Lấy thông tin chi tiết của một kế hoạch theo ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của kế hoạch
 *     responses:
 *       200:
 *         description: Lấy chi tiết kế hoạch thành công
 *       401:
 *         description: Không có quyền truy cập
 *       404:
 *         description: Không tìm thấy kế hoạch
 */
router.get('/:id', workPlanController.getWorkPlanById);

/**
 * @swagger
 * /api/work-plans:
 *   post:
 *     tags: [Work Plans]
 *     summary: Tạo kế hoạch
 *     description: Tạo kế hoạch công việc mới với khả năng đính kèm nhiều file
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
 *         description: Tạo kế hoạch thành công
 *       400:
 *         description: Dữ liệu không hợp lệ
 *       401:
 *         description: Không có quyền truy cập
 */
router.post(
  '/',
  uploadWorkPlans,
  workPlanController.createWorkPlan
);

/**
 * @swagger
 * /api/work-plans/{id}:
 *   put:
 *     tags: [Work Plans]
 *     summary: Cập nhật kế hoạch
 *     description: Cập nhật thông tin kế hoạch với khả năng đính kèm nhiều file
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của kế hoạch
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
 *         description: Cập nhật kế hoạch thành công
 *       400:
 *         description: Dữ liệu không hợp lệ
 *       401:
 *         description: Không có quyền truy cập
 *       404:
 *         description: Không tìm thấy kế hoạch
 */
router.put(
  '/:id',
  uploadWorkPlans,
  workPlanController.updateWorkPlan
);

/**
 * @swagger
 * /api/work-plans/{id}:
 *   delete:
 *     tags: [Work Plans]
 *     summary: Xóa kế hoạch
 *     description: "Xóa một kế hoạch theo ID (chỉ ADMIN và DEPARTMENT_HEAD)"
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của kế hoạch
 *     responses:
 *       200:
 *         description: Xóa kế hoạch thành công
 *       401:
 *         description: Không có quyền truy cập
 *       403:
 *         description: Không đủ quyền hạn
 *       404:
 *         description: Không tìm thấy kế hoạch
 */
router.delete(
  '/:id',
  authorize(UserRole.ADMIN, UserRole.DEPARTMENT_HEAD),
  workPlanController.deleteWorkPlan
);

export default router;

