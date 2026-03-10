import { Router } from 'express';
import employeeController from '@controllers/employeeController';
import { authenticate, authorize } from '@middlewares/auth';
import { checkAccess } from '@middlewares/rbacAbac';
import { UserRole } from '@types';

const router = Router();

// All employee routes require authentication
router.use(authenticate);

/**
 * @swagger
 * /api/employees/for-assignment:
 *   get:
 *     tags: [Employees]
 *     summary: Lấy danh sách nhân viên để giao việc
 *     description: "Lấy danh sách nhân viên (thông tin cơ bản) dùng cho chức năng giao việc."
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Danh sách nhân viên
 *       401:
 *         description: Chưa xác thực
 */
router.get('/for-assignment',
  employeeController.getAllEmployees
);

/**
 * @swagger
 * /api/employees:
 *   get:
 *     tags: [Employees]
 *     summary: Danh sách nhân viên
 *     description: "Lấy tất cả nhân viên. Kiểm soát truy cập RBAC+ABAC (ADMIN, DEPARTMENT_HEAD, TEAM_LEAD)."
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
 *         description: Danh sách nhân viên
 *       401:
 *         description: Chưa xác thực
 *       403:
 *         description: Không có quyền truy cập
 */
router.get('/',
  checkAccess({
    allowedRoles: [UserRole.ADMIN, UserRole.DEPARTMENT_HEAD, UserRole.TEAM_LEAD],
    checkDepartment: true,
  }),
  employeeController.getAllEmployees
);

/**
 * @swagger
 * /api/employees/export/excel:
 *   get:
 *     tags: [Employees]
 *     summary: Xuất danh sách nhân viên ra Excel
 *     description: "Xuất dữ liệu nhân viên sang file Excel. Kiểm soát truy cập RBAC+ABAC (ADMIN, DEPARTMENT_HEAD, TEAM_LEAD)."
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: File Excel
 *         content:
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
 *             schema:
 *               type: string
 *               format: binary
 *       401:
 *         description: Chưa xác thực
 *       403:
 *         description: Không có quyền truy cập
 */
router.get('/export/excel',
  checkAccess({
    allowedRoles: [UserRole.ADMIN, UserRole.DEPARTMENT_HEAD, UserRole.TEAM_LEAD],
    checkDepartment: true,
  }),
  employeeController.exportToExcel
);

/**
 * @swagger
 * /api/employees/{id}:
 *   get:
 *     tags: [Employees]
 *     summary: Chi tiết nhân viên theo ID
 *     description: "Lấy thông tin chi tiết nhân viên theo ID. Kiểm soát truy cập RBAC+ABAC (ADMIN, DEPARTMENT_HEAD, TEAM_LEAD)."
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID nhân viên
 *     responses:
 *       200:
 *         description: Thông tin chi tiết nhân viên
 *       401:
 *         description: Chưa xác thực
 *       404:
 *         description: Không tìm thấy nhân viên
 */
router.get('/:id',
  checkAccess({
    allowedRoles: [UserRole.ADMIN, UserRole.DEPARTMENT_HEAD, UserRole.TEAM_LEAD],
    checkDepartment: true,
  }),
  employeeController.getEmployeeById
);

/**
 * @swagger
 * /api/employees/code/{code}:
 *   get:
 *     tags: [Employees]
 *     summary: Tìm nhân viên theo mã nhân viên
 *     description: "Lấy thông tin nhân viên theo mã nhân viên. Kiểm soát truy cập RBAC+ABAC (ADMIN, DEPARTMENT_HEAD, TEAM_LEAD)."
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: code
 *         required: true
 *         schema:
 *           type: string
 *         description: Mã nhân viên
 *     responses:
 *       200:
 *         description: Thông tin nhân viên
 *       401:
 *         description: Chưa xác thực
 *       404:
 *         description: Không tìm thấy nhân viên
 */
router.get('/code/:code',
  checkAccess({
    allowedRoles: [UserRole.ADMIN, UserRole.DEPARTMENT_HEAD, UserRole.TEAM_LEAD],
    checkDepartment: true,
  }),
  employeeController.getEmployeeByCode
);

/**
 * @swagger
 * /api/employees/generate-code:
 *   post:
 *     tags: [Employees]
 *     summary: Tạo mã nhân viên
 *     description: "Tự động sinh mã nhân viên dựa trên phòng ban. Chỉ ADMIN, DEPARTMENT_HEAD."
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               departmentId:
 *                 type: string
 *                 description: ID phòng ban
 *     responses:
 *       200:
 *         description: Mã nhân viên được tạo thành công
 *       401:
 *         description: Chưa xác thực
 *       403:
 *         description: Không có quyền thực hiện
 */
router.post('/generate-code',
  authorize(UserRole.ADMIN, UserRole.DEPARTMENT_HEAD),
  employeeController.generateEmployeeCode
);

/**
 * @swagger
 * /api/employees:
 *   post:
 *     tags: [Employees]
 *     summary: Tạo nhân viên mới
 *     description: Tạo mới một nhân viên. Chỉ Admin và Trưởng phòng mới có quyền.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               code:
 *                 type: string
 *                 description: Mã nhân viên
 *               name:
 *                 type: string
 *                 description: Họ tên nhân viên
 *               departmentId:
 *                 type: string
 *                 description: ID phòng ban
 *     responses:
 *       201:
 *         description: Tạo nhân viên thành công
 *       400:
 *         description: Dữ liệu không hợp lệ
 *       401:
 *         description: Chưa xác thực
 *       403:
 *         description: Không có quyền thực hiện
 */
router.post('/',
  authorize(UserRole.ADMIN, UserRole.DEPARTMENT_HEAD),
  employeeController.createEmployee
);

/**
 * @swagger
 * /api/employees/{id}:
 *   patch:
 *     tags: [Employees]
 *     summary: Cập nhật nhân viên
 *     description: "Cập nhật thông tin nhân viên theo ID. Kiểm soát truy cập RBAC+ABAC (ADMIN, DEPARTMENT_HEAD, TEAM_LEAD)."
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID nhân viên
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Họ tên nhân viên
 *               departmentId:
 *                 type: string
 *                 description: ID phòng ban
 *     responses:
 *       200:
 *         description: Cập nhật nhân viên thành công
 *       401:
 *         description: Chưa xác thực
 *       404:
 *         description: Không tìm thấy nhân viên
 */
router.patch('/:id',
  checkAccess({
    allowedRoles: [UserRole.ADMIN, UserRole.DEPARTMENT_HEAD, UserRole.TEAM_LEAD],
    checkDepartment: true,
  }),
  employeeController.updateEmployee
);

/**
 * @swagger
 * /api/employees/{id}:
 *   delete:
 *     tags: [Employees]
 *     summary: Xóa nhân viên
 *     description: Xóa nhân viên theo ID. Chỉ Admin mới có quyền.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID nhân viên
 *     responses:
 *       200:
 *         description: Xóa nhân viên thành công
 *       401:
 *         description: Chưa xác thực
 *       404:
 *         description: Không tìm thấy nhân viên
 */
router.delete('/:id', authorize(UserRole.ADMIN), employeeController.deleteEmployee);

export default router;

