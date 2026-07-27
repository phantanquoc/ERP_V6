import { Router } from 'express';
import finishedProductController from '@controllers/finishedProductController';
import { authenticate, deviceOrJwtAuth } from '@middlewares/auth';
import { createSingleUploadMiddleware } from '@middlewares/upload';
import { zodValidate } from '@middlewares/zodValidation';
import { updateFinishedProductSchema, upsertFinishedProductByBatchMachineSchema } from '@schemas';

const router = Router();

// Upload middleware for finished products
const uploadFinishedProduct = createSingleUploadMiddleware('finished-products');

// Kiosk endpoints — accept device key OR JWT
router.get('/', deviceOrJwtAuth('DATA_ENTRY'), finishedProductController.getAllFinishedProducts);
router.post('/bulk-warehouse-receipt', deviceOrJwtAuth('DATA_ENTRY'), finishedProductController.bulkConfirmReceipt);

// Upsert by (maChien, machineSystemId) — kiosk-accessible, validates input
router.put('/by-batch-machine', deviceOrJwtAuth('DATA_ENTRY'), zodValidate(upsertFinishedProductByBatchMachineSchema), finishedProductController.upsertByBatchMachine);

// Desktop-only endpoints — require JWT
router.get('/export/excel', authenticate, finishedProductController.exportToExcel);
router.get('/output-statistics', authenticate, finishedProductController.getOutputStatistics);
router.get('/:id/receipt-rows', authenticate, finishedProductController.getReceiptRows);
router.get('/:id', authenticate, finishedProductController.getFinishedProductById);
router.post('/', authenticate, uploadFinishedProduct, finishedProductController.createFinishedProduct);
router.post('/:id/warehouse-receipt', authenticate, finishedProductController.confirmWarehouseReceipt);
router.patch('/:id', deviceOrJwtAuth('DATA_ENTRY'), uploadFinishedProduct, zodValidate(updateFinishedProductSchema), finishedProductController.updateFinishedProduct);
router.delete('/:id', authenticate, finishedProductController.deleteFinishedProduct);

export default router;

