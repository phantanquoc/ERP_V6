import { Router } from 'express';
import positionResponsibilityController from '@controllers/positionResponsibilityController';
import { authenticate, authorize } from '@middlewares/auth';
import { checkAccess } from '@middlewares/rbacAbac';
import { UserRole } from '@types';

const router = Router();

// All responsibility routes require authentication
router.use(authenticate);

/**
 * @swagger
 * /api/position-responsibilities/{positionId}/responsibilities:
 *   get:
 *     tags: ["Position Responsibilities"]
 *     summary: "Danh sách trách nhiệm theo chức vụ"
 *     description: "Lấy danh sách trách nhiệm của chức vụ. Kiểm soát truy cập RBAC+ABAC (ADMIN, DEPARTMENT_HEAD)."
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
 *         description: "Danh sách trách nhiệm của chức vụ"
 *       404:
 *         description: "Không tìm thấy chức vụ"
 */
router.get('/:positionId/responsibilities',
  checkAccess({
    allowedRoles: [UserRole.ADMIN, UserRole.DEPARTMENT_HEAD],
    checkDepartment: true,
  }),
  positionResponsibilityController.getAllResponsibilities
);

/**
 * @swagger
 * /api/position-responsibilities/responsibility/{id}:
 *   get:
 *     tags: ["Position Responsibilities"]
 *     summary: "Chi tiết trách nhiệm"
 *     description: "Lấy thông tin chi tiết trách nhiệm. Kiểm soát truy cập RBAC+ABAC (ADMIN, DEPARTMENT_HEAD)."
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: "ID trách nhiệm"
 *     responses:
 *       200:
 *         description: "Thông tin chi tiết trách nhiệm"
 *       404:
 *         description: "Không tìm thấy trách nhiệm"
 */
router.get('/responsibility/:id',
  checkAccess({
    allowedRoles: [UserRole.ADMIN, UserRole.DEPARTMENT_HEAD],
    checkDepartment: true,
  }),
  positionResponsibilityController.getResponsibilityById
);

/**
 * @swagger
 * /api/position-responsibilities/{positionId}/responsibilities:
 *   post:
 *     tags: ["Position Responsibilities"]
 *     summary: "Tạo trách nhiệm"
 *     description: "Tạo trách nhiệm mới cho chức vụ. Chỉ ADMIN, DEPARTMENT_HEAD."
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
 *         description: "Tạo trách nhiệm thành công"
 *       400:
 *         description: "Dữ liệu không hợp lệ"
 */
router.post('/:positionId/responsibilities',
  authorize(UserRole.ADMIN, UserRole.DEPARTMENT_HEAD),
  positionResponsibilityController.createResponsibility
);

/**
 * @swagger
 * /api/position-responsibilities/responsibility/{id}:
 *   patch:
 *     tags: ["Position Responsibilities"]
 *     summary: "Cập nhật trách nhiệm"
 *     description: "Cập nhật thông tin trách nhiệm. Chỉ ADMIN, DEPARTMENT_HEAD."
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: "ID trách nhiệm"
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
 *         description: "Cập nhật trách nhiệm thành công"
 *       404:
 *         description: "Không tìm thấy trách nhiệm"
 */
router.patch('/responsibility/:id',
  authorize(UserRole.ADMIN, UserRole.DEPARTMENT_HEAD),
  positionResponsibilityController.updateResponsibility
);

/**
 * @swagger
 * /api/position-responsibilities/responsibility/{id}:
 *   delete:
 *     tags: ["Position Responsibilities"]
 *     summary: "Xóa trách nhiệm"
 *     description: "Xóa trách nhiệm. Chỉ ADMIN."
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: "ID trách nhiệm"
 *     responses:
 *       200:
 *         description: "Xóa trách nhiệm thành công"
 *       404:
 *         description: "Không tìm thấy trách nhiệm"
 */
router.delete('/responsibility/:id',
  authorize(UserRole.ADMIN),
  positionResponsibilityController.deleteResponsibility
);

export default router;

