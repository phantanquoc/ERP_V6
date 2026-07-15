import express from 'express';
import {
  generateReceiptCode,
  createWarehouseReceipt,
  batchCreateWarehouseReceipts,
  getAllWarehouseReceipts,
  getWarehouseReceiptById,
  updateWarehouseReceipt,
  deleteWarehouseReceipt,
} from '../controllers/warehouseReceiptController';
import { authenticate, authorize } from '@middlewares/auth';
import { UserRole } from '@types';

const router = express.Router();

router.use(authenticate);

router.get('/generate-code', generateReceiptCode);

router.post('/batch', authorize(UserRole.ADMIN, UserRole.DEPARTMENT_HEAD, UserRole.TEAM_LEAD), batchCreateWarehouseReceipts);
router.post('/', authorize(UserRole.ADMIN, UserRole.DEPARTMENT_HEAD, UserRole.TEAM_LEAD), createWarehouseReceipt);

router.get('/', getAllWarehouseReceipts);
router.get('/:id', getWarehouseReceiptById);

router.put('/:id', authorize(UserRole.ADMIN, UserRole.DEPARTMENT_HEAD, UserRole.TEAM_LEAD), updateWarehouseReceipt);
router.delete('/:id', authorize(UserRole.ADMIN, UserRole.DEPARTMENT_HEAD, UserRole.TEAM_LEAD), deleteWarehouseReceipt);

export default router;

