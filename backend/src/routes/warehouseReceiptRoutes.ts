import express from 'express';
import {
  generateReceiptCode,
  createWarehouseReceipt,
  getAllWarehouseReceipts,
  getWarehouseReceiptById,
  updateWarehouseReceipt,
  deleteWarehouseReceipt,
  markReceiptPrinted,
  exportReceiptXlsxHandler,
} from '../controllers/warehouseReceiptController';
import { authenticate } from '@middlewares/auth';
import { requireRule } from '@middlewares/requireRule';
const router = express.Router();

router.use(authenticate);

router.get('/generate-code', generateReceiptCode);

router.post('/', requireRule('warehouse-receipts', 'READ'), createWarehouseReceipt);

router.get('/', getAllWarehouseReceipts);
router.get('/:id', getWarehouseReceiptById);
router.get('/:id/export-xlsx', exportReceiptXlsxHandler);
router.post('/:id/mark-printed', requireRule('warehouse-receipts', 'CREATE'), markReceiptPrinted);

router.put('/:id', requireRule('warehouse-receipts', 'READ'), updateWarehouseReceipt);
router.delete('/:id', requireRule('warehouse-receipts', 'READ'), deleteWarehouseReceipt);

export default router;
