import { Router } from 'express';
import departmentController from '@controllers/departmentController';
import { authenticate, authorize } from '@middlewares/auth';
import { checkAccess } from '@middlewares/rbacAbac';
import { UserRole } from '@types';

const router = Router();

// Public endpoint to get all departments (for form dropdowns)
router.get('/public/all', departmentController.getAllDepartments);

// All department routes require authentication
router.use(authenticate);

// Get all departments (with RBAC + ABAC)
router.get('/',
  checkAccess({
    allowedRoles: [UserRole.ADMIN, UserRole.DEPARTMENT_HEAD],
    checkDepartment: true,
  }),
  departmentController.getAllDepartments
);

// Get department by ID (with RBAC + ABAC)
router.get('/:id',
  checkAccess({
    allowedRoles: [UserRole.ADMIN, UserRole.DEPARTMENT_HEAD],
    checkDepartment: true,
  }),
  departmentController.getDepartmentById
);

// Create department (Admin, Department Head only)
router.post('/', authorize(UserRole.ADMIN, UserRole.DEPARTMENT_HEAD), departmentController.createDepartment);

// Update department (Admin, Department Head only)
router.patch('/:id',
  checkAccess({
    allowedRoles: [UserRole.ADMIN, UserRole.DEPARTMENT_HEAD],
    checkDepartment: true,
  }),
  departmentController.updateDepartment
);

// Delete department (Admin only)
router.delete('/:id', authorize(UserRole.ADMIN), departmentController.deleteDepartment);

export default router;

