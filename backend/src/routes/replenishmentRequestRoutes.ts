import { Router } from 'express';
import replenishmentRequestController from '@controllers/replenishmentRequestController';
import { authenticate } from '@middlewares/auth';
import { requireRule } from '@middlewares/requireRule';
import { createSingleUploadMiddleware } from '@middlewares/upload';

const router = Router();
const uploadReplenishmentRequest = createSingleUploadMiddleware('replenishment-requests');

router.use(authenticate);

router.get('/', requireRule('replenishment-requests', 'READ'), replenishmentRequestController.getAllReplenishmentRequests);
router.get('/generate-code', requireRule('replenishment-requests', 'READ'), replenishmentRequestController.generateReplenishmentRequestCode);
router.get('/export/excel', requireRule('replenishment-requests', 'EXPORT'), replenishmentRequestController.exportToExcel);
router.get('/:id', requireRule('replenishment-requests', 'READ'), replenishmentRequestController.getReplenishmentRequestById);
// POST / is the warehouse's manual "Tạo yêu cầu bổ sung" from the supply-request detail.
// Declared after /generate-code and /export/excel so it cannot shadow them, and before
// /:id so "/generate-code" is not parsed as an id.
router.post('/', requireRule('replenishment-requests', 'CREATE'), uploadReplenishmentRequest, replenishmentRequestController.createReplenishmentRequest);
router.put('/:id', requireRule('replenishment-requests', 'UPDATE'), uploadReplenishmentRequest, replenishmentRequestController.updateReplenishmentRequest);
router.post('/:id/convert', requireRule('replenishment-requests', 'APPROVE'), replenishmentRequestController.convertToPurchaseRequest);
router.post('/:id/cancel', requireRule('replenishment-requests', 'UPDATE'), replenishmentRequestController.cancelReplenishmentRequest);
router.delete('/:id', requireRule('replenishment-requests', 'DELETE'), replenishmentRequestController.deleteReplenishmentRequest);

export default router;
