import { Router } from 'express';
import departmentController from '@controllers/departmentController';
import { authenticate, authorize } from '@middlewares/auth';
import { checkAccess } from '@middlewares/rbacAbac';
import { UserRole } from '@types';

const router = Router();

/**
 * @swagger
 * /api/departments/public/all:
 *   get:
 *     tags: ["Departments"]
 *     summary: "Danh sách phòng ban (public)"
 *     description: "Lấy tất cả phòng ban, dùng cho dropdown trong form. Không yêu cầu xác thực."
 *     responses:
 *       200:
 *         description: "Danh sách phòng ban"
 */
router.get('/public/all', departmentController.getAllDepartments);

// All department routes require authentication
router.use(authenticate);

/**
 * @swagger
 * /api/departments:
 *   get:
 *     tags: ["Departments"]
 *     summary: "Danh sách phòng ban"
 *     description: "Lấy danh sách phòng ban. Kiểm soát truy cập RBAC+ABAC (ADMIN, DEPARTMENT_HEAD)."
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
 *         description: "Danh sách phòng ban"
 *       401:
 *         description: "Chưa xác thực"
 */
router.get('/',
  checkAccess({
    allowedRoles: [UserRole.ADMIN, UserRole.DEPARTMENT_HEAD],
    checkDepartment: true,
  }),
  departmentController.getAllDepartments
);

/**
 * @swagger
 * /api/departments/{id}:
 *   get:
 *     tags: ["Departments"]
 *     summary: "Chi tiết phòng ban"
 *     description: "Lấy thông tin chi tiết phòng ban. Kiểm soát truy cập RBAC+ABAC (ADMIN, DEPARTMENT_HEAD)."
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: "ID phòng ban"
 *     responses:
 *       200:
 *         description: "Thông tin chi tiết phòng ban"
 *       404:
 *         description: "Không tìm thấy phòng ban"
 */
router.get('/:id',
  checkAccess({
    allowedRoles: [UserRole.ADMIN, UserRole.DEPARTMENT_HEAD],
    checkDepartment: true,
  }),
  departmentController.getDepartmentById
);

/**
 * @swagger
 * /api/departments:
 *   post:
 *     tags: ["Departments"]
 *     summary: "Tạo phòng ban"
 *     description: "Tạo phòng ban mới. Chỉ ADMIN, DEPARTMENT_HEAD."
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
 *         description: "Tạo phòng ban thành công"
 *       400:
 *         description: "Dữ liệu không hợp lệ"
 */
router.post('/', authorize(UserRole.ADMIN, UserRole.DEPARTMENT_HEAD), departmentController.createDepartment);

/**
 * @swagger
 * /api/departments/{id}:
 *   patch:
 *     tags: ["Departments"]
 *     summary: "Cập nhật phòng ban"
 *     description: "Cập nhật thông tin phòng ban. Kiểm soát truy cập RBAC+ABAC (ADMIN, DEPARTMENT_HEAD)."
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: "ID phòng ban"
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
 *         description: "Cập nhật phòng ban thành công"
 *       404:
 *         description: "Không tìm thấy phòng ban"
 */
router.patch('/:id',
  checkAccess({
    allowedRoles: [UserRole.ADMIN, UserRole.DEPARTMENT_HEAD],
    checkDepartment: true,
  }),
  departmentController.updateDepartment
);

/**
 * @swagger
 * /api/departments/{id}:
 *   delete:
 *     tags: ["Departments"]
 *     summary: "Xóa phòng ban"
 *     description: "Xóa phòng ban. Chỉ ADMIN."
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: "ID phòng ban"
 *     responses:
 *       200:
 *         description: "Xóa phòng ban thành công"
 *       404:
 *         description: "Không tìm thấy phòng ban"
 */
router.delete('/:id', authorize(UserRole.ADMIN), departmentController.deleteDepartment);

export default router;

