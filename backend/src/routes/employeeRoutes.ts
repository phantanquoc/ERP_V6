import { Router } from 'express';
import employeeController from '@controllers/employeeController';
import { authenticate, authorize } from '@middlewares/auth';
import { checkAccess } from '@middlewares/rbacAbac';
import { UserRole } from '@types';

const router = Router();

// All employee routes require authentication
router.use(authenticate);

// Public endpoint for task assignment - get all employees (basic info only)
router.get('/for-assignment',
  employeeController.getAllEmployees
);

// Get all employees (with RBAC + ABAC)
router.get('/',
  checkAccess({
    allowedRoles: [UserRole.ADMIN, UserRole.DEPARTMENT_HEAD, UserRole.TEAM_LEAD],
    checkDepartment: true,
  }),
  employeeController.getAllEmployees
);

// Get employee by ID (with RBAC + ABAC)
router.get('/:id',
  checkAccess({
    allowedRoles: [UserRole.ADMIN, UserRole.DEPARTMENT_HEAD, UserRole.TEAM_LEAD],
    checkDepartment: true,
  }),
  employeeController.getEmployeeById
);

// Get employee by code (with RBAC + ABAC)
router.get('/code/:code',
  checkAccess({
    allowedRoles: [UserRole.ADMIN, UserRole.DEPARTMENT_HEAD, UserRole.TEAM_LEAD],
    checkDepartment: true,
  }),
  employeeController.getEmployeeByCode
);

// Generate employee code based on department
router.post('/generate-code',
  authorize(UserRole.ADMIN, UserRole.DEPARTMENT_HEAD),
  employeeController.generateEmployeeCode
);

// Create employee (Admin, Department Head only)
router.post('/',
  authorize(UserRole.ADMIN, UserRole.DEPARTMENT_HEAD),
  employeeController.createEmployee
);

// Update employee (Admin, Department Head, Team Lead)
router.patch('/:id',
  checkAccess({
    allowedRoles: [UserRole.ADMIN, UserRole.DEPARTMENT_HEAD, UserRole.TEAM_LEAD],
    checkDepartment: true,
  }),
  employeeController.updateEmployee
);

// Delete employee (Admin only)
router.delete('/:id', authorize(UserRole.ADMIN), employeeController.deleteEmployee);

export default router;

