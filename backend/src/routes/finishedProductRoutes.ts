import { Router } from 'express';
import finishedProductController from '@controllers/finishedProductController';
import { authenticate, deviceOrJwtAuth } from '@middlewares/auth';
import { createSingleUploadMiddleware } from '@middlewares/upload';

const router = Router();

// Upload middleware for finished products
const uploadFinishedProduct = createSingleUploadMiddleware('finished-products');

// Kiosk endpoints — accept device key OR JWT
router.get('/', deviceOrJwtAuth('DATA_ENTRY'), finishedProductController.getAllFinishedProducts);
router.post('/bulk-warehouse-receipt', deviceOrJwtAuth('DATA_ENTRY'), finishedProductController.bulkConfirmReceipt);

// Desktop-only endpoints — require JWT
router.get('/export/excel', authenticate, finishedProductController.exportToExcel);
router.get('/output-statistics', authenticate, finishedProductController.getOutputStatistics);
router.get('/:id/receipt-rows', authenticate, finishedProductController.getReceiptRows);
router.get('/:id', authenticate, finishedProductController.getFinishedProductById);
router.post('/', authenticate, uploadFinishedProduct, finishedProductController.createFinishedProduct);
router.post('/:id/warehouse-receipt', authenticate, finishedProductController.confirmWarehouseReceipt);
router.patch('/:id', authenticate, uploadFinishedProduct, finishedProductController.updateFinishedProduct);
router.delete('/:id', authenticate, finishedProductController.deleteFinishedProduct);

export default router;

