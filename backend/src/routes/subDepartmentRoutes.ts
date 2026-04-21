import { Router } from 'express';
import subDepartmentController from '@controllers/subDepartmentController';
import { authenticate } from '@middlewares/auth';

const router = Router();

/**
 * @swagger
 * /api/sub-departments/public/all:
 *   get:
 *     tags: ["SubDepartments"]
 *     summary: "Danh sách bộ phận con (public)"
 *     description: "Lấy tất cả bộ phận con để dùng cho dropdown. Không yêu cầu xác thực."
 *     responses:
 *       200:
 *         description: "Danh sách bộ phận con"
 */
router.get('/public/all', subDepartmentController.getAllSubDepartments);

router.use(authenticate);

/**
 * @swagger
 * /api/sub-departments/{id}:
 *   get:
 *     tags: ["SubDepartments"]
 *     summary: "Chi tiết bộ phận con"
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: "Thông tin bộ phận con"
 *       401:
 *         description: "Chưa xác thực"
 */
router.get('/:id', subDepartmentController.getSubDepartmentById);

export default router;
