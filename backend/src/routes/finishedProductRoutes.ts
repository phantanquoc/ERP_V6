import { Router } from 'express';
import finishedProductController from '@controllers/finishedProductController';
import { authenticate, deviceOrJwtAuth } from '@middlewares/auth';
import { requireRule } from '@middlewares/requireRule';
import { createSingleUploadMiddleware } from '@middlewares/upload';
import { zodValidate } from '@middlewares/zodValidation';
import { updateFinishedProductSchema, upsertFinishedProductByBatchMachineSchema } from '@schemas';

const router = Router();

// Upload middleware for finished products
const uploadFinishedProduct = createSingleUploadMiddleware('finished-products');

// Kiosk endpoints — accept device key OR JWT
router.get('/', deviceOrJwtAuth('DATA_ENTRY'), requireRule('finished-products', 'READ'), finishedProductController.getAllFinishedProducts);
router.post('/bulk-warehouse-receipt', deviceOrJwtAuth('DATA_ENTRY'), requireRule('finished-products', 'CREATE'), finishedProductController.bulkConfirmReceipt);

// Upsert by (maChien, machineSystemId) — kiosk-accessible, validates input
router.put('/by-batch-machine', deviceOrJwtAuth('DATA_ENTRY'), requireRule('finished-products', 'UPDATE'), zodValidate(upsertFinishedProductByBatchMachineSchema), finishedProductController.upsertByBatchMachine);

// Desktop-only endpoints — require JWT
router.get('/export/excel', authenticate, requireRule('finished-products', 'EXPORT'), finishedProductController.exportToExcel);
router.get('/output-statistics', authenticate, requireRule('finished-products', 'READ'), finishedProductController.getOutputStatistics);
router.get('/:id/receipt-rows', authenticate, requireRule('finished-products', 'READ'), finishedProductController.getReceiptRows);
router.get('/:id', authenticate, requireRule('finished-products', 'READ'), finishedProductController.getFinishedProductById);
router.post('/', authenticate, requireRule('finished-products', 'CREATE'), uploadFinishedProduct, finishedProductController.createFinishedProduct);
router.post('/:id/warehouse-receipt', authenticate, requireRule('finished-products', 'CREATE'), finishedProductController.confirmWarehouseReceipt);
router.patch('/:id', deviceOrJwtAuth('DATA_ENTRY'), requireRule('finished-products', 'UPDATE'), uploadFinishedProduct, zodValidate(updateFinishedProductSchema), finishedProductController.updateFinishedProduct);
router.delete('/:id', authenticate, requireRule('finished-products', 'DELETE'), finishedProductController.deleteFinishedProduct);

export default router;

