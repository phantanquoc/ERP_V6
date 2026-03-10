import { Router } from 'express';
import positionLevelController from '@controllers/positionLevelController';
import { authenticate, authorize } from '@middlewares/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @swagger
 * /api/position-levels:
 *   get:
 *     tags: ["Position Levels"]
 *     summary: "Tất cả cấp bậc"
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
 *         description: "Danh sách tất cả cấp bậc"
 *       401:
 *         description: "Chưa xác thực"
 */
router.get('/', positionLevelController.getAllLevels);

/**
 * @swagger
 * /api/position-levels/{positionId}/levels:
 *   get:
 *     tags: ["Position Levels"]
 *     summary: "Danh sách cấp bậc theo chức vụ"
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: positionId
 *         required: true
 *         schema:
 *           type: string
 *         description: "ID chức vụ"
 *     responses:
 *       200:
 *         description: "Danh sách cấp bậc của chức vụ"
 *       404:
 *         description: "Không tìm thấy chức vụ"
 */
router.get('/:positionId/levels', positionLevelController.getAllLevelsByPosition);

/**
 * @swagger
 * /api/position-levels/level/{id}:
 *   get:
 *     tags: ["Position Levels"]
 *     summary: "Chi tiết cấp bậc"
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: "ID cấp bậc"
 *     responses:
 *       200:
 *         description: "Thông tin chi tiết cấp bậc"
 *       404:
 *         description: "Không tìm thấy cấp bậc"
 */
router.get('/level/:id', positionLevelController.getLevelById);

/**
 * @swagger
 * /api/position-levels/{positionId}/levels:
 *   post:
 *     tags: ["Position Levels"]
 *     summary: "Tạo cấp bậc"
 *     description: "Tạo cấp bậc mới cho chức vụ. Chỉ ADMIN, DEPARTMENT_HEAD."
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: positionId
 *         required: true
 *         schema:
 *           type: string
 *         description: "ID chức vụ"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: "Tạo cấp bậc thành công"
 *       400:
 *         description: "Dữ liệu không hợp lệ"
 */
router.post('/:positionId/levels', authorize('ADMIN', 'DEPARTMENT_HEAD'), positionLevelController.createLevel);

/**
 * @swagger
 * /api/position-levels/level/{id}:
 *   patch:
 *     tags: ["Position Levels"]
 *     summary: "Cập nhật cấp bậc"
 *     description: "Cập nhật thông tin cấp bậc. Chỉ ADMIN, DEPARTMENT_HEAD."
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: "ID cấp bậc"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: "Cập nhật cấp bậc thành công"
 *       404:
 *         description: "Không tìm thấy cấp bậc"
 */
router.patch('/level/:id', authorize('ADMIN', 'DEPARTMENT_HEAD'), positionLevelController.updateLevel);

/**
 * @swagger
 * /api/position-levels/level/{id}:
 *   delete:
 *     tags: ["Position Levels"]
 *     summary: "Xóa cấp bậc"
 *     description: "Xóa cấp bậc. Chỉ ADMIN."
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: "ID cấp bậc"
 *     responses:
 *       200:
 *         description: "Xóa cấp bậc thành công"
 *       404:
 *         description: "Không tìm thấy cấp bậc"
 */
router.delete('/level/:id', authorize('ADMIN'), positionLevelController.deleteLevel);

export default router;

