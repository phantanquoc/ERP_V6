import { Router } from 'express';
import positionController from '@controllers/positionController';
import { authenticate, authorize } from '@middlewares/auth';
import { checkAccess } from '@middlewares/rbacAbac';
import { UserRole } from '@types';

const router = Router();

// All position routes require authentication
router.use(authenticate);

/**
 * @swagger
 * /api/positions:
 *   get:
 *     tags: ["Positions"]
 *     summary: "Danh sách chức vụ"
 *     description: "Lấy danh sách chức vụ. Kiểm soát truy cập RBAC+ABAC (ADMIN, DEPARTMENT_HEAD)."
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
 *         description: "Danh sách chức vụ"
 *       401:
 *         description: "Chưa xác thực"
 */
router.get('/',
  checkAccess({
    allowedRoles: [UserRole.ADMIN, UserRole.DEPARTMENT_HEAD],
    checkDepartment: true,
  }),
  positionController.getAllPositions
);

/**
 * @swagger
 * /api/positions/{id}:
 *   get:
 *     tags: ["Positions"]
 *     summary: "Chi tiết chức vụ"
 *     description: "Lấy thông tin chi tiết chức vụ. Kiểm soát truy cập RBAC+ABAC (ADMIN, DEPARTMENT_HEAD)."
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: "ID chức vụ"
 *     responses:
 *       200:
 *         description: "Thông tin chi tiết chức vụ"
 *       404:
 *         description: "Không tìm thấy chức vụ"
 */
router.get('/:id',
  checkAccess({
    allowedRoles: [UserRole.ADMIN, UserRole.DEPARTMENT_HEAD],
    checkDepartment: true,
  }),
  positionController.getPositionById
);

/**
 * @swagger
 * /api/positions:
 *   post:
 *     tags: ["Positions"]
 *     summary: "Tạo chức vụ"
 *     description: "Tạo chức vụ mới. Chỉ ADMIN, DEPARTMENT_HEAD."
 *     security:
 *       - bearerAuth: []
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
 *         description: "Tạo chức vụ thành công"
 *       400:
 *         description: "Dữ liệu không hợp lệ"
 */
router.post('/', authorize(UserRole.ADMIN, UserRole.DEPARTMENT_HEAD), positionController.createPosition);

/**
 * @swagger
 * /api/positions/{id}:
 *   patch:
 *     tags: ["Positions"]
 *     summary: "Cập nhật chức vụ"
 *     description: "Cập nhật thông tin chức vụ. Kiểm soát truy cập RBAC+ABAC (ADMIN, DEPARTMENT_HEAD)."
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
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
 *       200:
 *         description: "Cập nhật chức vụ thành công"
 *       404:
 *         description: "Không tìm thấy chức vụ"
 */
router.patch('/:id',
  checkAccess({
    allowedRoles: [UserRole.ADMIN, UserRole.DEPARTMENT_HEAD],
    checkDepartment: true,
  }),
  positionController.updatePosition
);

/**
 * @swagger
 * /api/positions/{id}:
 *   delete:
 *     tags: ["Positions"]
 *     summary: "Xóa chức vụ"
 *     description: "Xóa chức vụ. Chỉ ADMIN."
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: "ID chức vụ"
 *     responses:
 *       200:
 *         description: "Xóa chức vụ thành công"
 *       404:
 *         description: "Không tìm thấy chức vụ"
 */
router.delete('/:id', authorize(UserRole.ADMIN), positionController.deletePosition);

export default router;

