import { Router } from 'express';
import finishedProductController from '@controllers/finishedProductController';
import { authenticate } from '@middlewares/auth';
import { createSingleUploadMiddleware } from '@middlewares/upload';

const router = Router();

// Upload middleware for finished products
const uploadFinishedProduct = createSingleUploadMiddleware('finished-products');

// All routes require authentication
router.use(authenticate);

router.get('/', finishedProductController.getAllFinishedProducts);
router.get('/export/excel', finishedProductController.exportToExcel);
router.get('/output-statistics', finishedProductController.getOutputStatistics);
router.post('/bulk-warehouse-receipt', finishedProductController.bulkConfirmReceipt);
router.get('/:id/receipt-rows', finishedProductController.getReceiptRows);
router.get('/:id', finishedProductController.getFinishedProductById);
router.post('/', uploadFinishedProduct, finishedProductController.createFinishedProduct);
router.post('/:id/warehouse-receipt', finishedProductController.confirmWarehouseReceipt);
router.patch('/:id', uploadFinishedProduct, finishedProductController.updateFinishedProduct);
router.delete('/:id', finishedProductController.deleteFinishedProduct);

export default router;

