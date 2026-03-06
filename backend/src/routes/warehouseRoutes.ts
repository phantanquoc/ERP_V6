import { Router } from 'express';
import {
  getAllWarehouses,
  generateWarehouseCode,
  createWarehouse,
  deleteWarehouse,
} from '@controllers/warehouseController';
import { getLotsByWarehouse } from '@controllers/lotController';
import { authenticate } from '@middlewares/auth';

const router = Router();

router.use(authenticate);

// GET /api/warehouses
router.get('/', getAllWarehouses);

// GET /api/warehouses/generate-code
router.get('/generate-code', generateWarehouseCode);

// POST /api/warehouses
router.post('/', createWarehouse);

// DELETE /api/warehouses/:id
router.delete('/:id', deleteWarehouse);

// GET /api/warehouses/:warehouseId/lots
router.get('/:warehouseId/lots', getLotsByWarehouse);

export default router;

