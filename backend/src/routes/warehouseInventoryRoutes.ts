import { Router } from 'express';
import warehouseInventoryController from '@controllers/warehouseInventoryController';
import { authenticate, authorize } from '@middlewares/auth';
import { UserRole } from '@types';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get all inventory (all authenticated users can view)
router.get('/', warehouseInventoryController.getAllInventory);

// Get inventory by product name (all authenticated users can view)
router.get('/by-product-name', warehouseInventoryController.getInventoryByProductName);

// Get inventory by ID (all authenticated users can view)
router.get('/:id', warehouseInventoryController.getInventoryById);

// Create inventory (ADMIN, DEPARTMENT_HEAD, TEAM_LEAD)
router.post(
  '/',
  authorize(UserRole.ADMIN, UserRole.DEPARTMENT_HEAD, UserRole.TEAM_LEAD),
  warehouseInventoryController.createInventory
);

// Update inventory (ADMIN, DEPARTMENT_HEAD, TEAM_LEAD)
router.put(
  '/:id',
  authorize(UserRole.ADMIN, UserRole.DEPARTMENT_HEAD, UserRole.TEAM_LEAD),
  warehouseInventoryController.updateInventory
);

// Delete inventory (ADMIN only)
router.delete(
  '/:id',
  authorize(UserRole.ADMIN),
  warehouseInventoryController.deleteInventory
);

export default router;

