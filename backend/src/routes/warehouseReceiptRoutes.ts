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
  voidWarehouseReceipt,
  unvoidWarehouseReceipt,
} from '../controllers/warehouseReceiptController';
import { authenticate } from '@middlewares/auth';
import { requireRule } from '@middlewares/requireRule';
import { zodValidate } from '@middlewares/zodValidation';
import { createReceiptSchema, updateReceiptSchema, voidReceiptSchema } from '@schemas';
const router = express.Router();

router.use(authenticate);

router.get('/generate-code', generateReceiptCode);

router.post('/', requireRule('warehouse-receipts', 'CREATE'), zodValidate(createReceiptSchema), createWarehouseReceipt);

router.get('/', getAllWarehouseReceipts);
router.get('/:id', getWarehouseReceiptById);
router.get('/:id/export-xlsx', exportReceiptXlsxHandler);
router.post('/:id/mark-printed', requireRule('warehouse-receipts', 'CREATE'), markReceiptPrinted);

router.put('/:id', requireRule('warehouse-receipts', 'UPDATE'), zodValidate(updateReceiptSchema), updateWarehouseReceipt);
router.delete('/:id', requireRule('warehouse-receipts', 'DELETE'), deleteWarehouseReceipt);
router.post('/:id/void', requireRule('warehouse-receipts', 'DELETE'), zodValidate(voidReceiptSchema), voidWarehouseReceipt);
router.post('/:id/unvoid', requireRule('warehouse-receipts', 'DELETE'), unvoidWarehouseReceipt);

export default router;
