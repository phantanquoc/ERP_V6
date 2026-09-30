import { Router } from 'express';
import inspectionRequestController from '@controllers/inspectionRequestController';
import { authenticate } from '@middlewares/auth';
import { requireRule } from '@middlewares/requireRule';
import { createSingleUploadMiddleware } from '@middlewares/upload';

const router = Router();
const upload = createSingleUploadMiddleware('inspection-requests');

router.get('/', authenticate, inspectionRequestController.getAll);
router.get('/generate-code', authenticate, inspectionRequestController.generateCode);
router.get('/stats', authenticate, inspectionRequestController.getStats.bind(inspectionRequestController));
router.get('/:id/status-history', authenticate, inspectionRequestController.getStatusHistory);
router.get('/:id', authenticate, inspectionRequestController.getById);

router.post('/', authenticate, requireRule('inspection-requests', 'CREATE'), upload, inspectionRequestController.create);
router.put('/:id', authenticate, requireRule('inspection-requests', 'UPDATE'), upload, inspectionRequestController.update);
router.delete('/:id', authenticate, requireRule('inspection-requests', 'DELETE'), inspectionRequestController.remove);

router.patch('/:id/accept', authenticate, requireRule('inspection-requests', 'UPDATE'), inspectionRequestController.accept);
router.patch('/:id/start-inspection', authenticate, requireRule('inspection-requests', 'UPDATE'), inspectionRequestController.startInspection);
router.put('/:id/details', authenticate, requireRule('inspection-requests', 'UPDATE'), upload, inspectionRequestController.updateDetails);
router.patch('/:id/submit', authenticate, requireRule('inspection-requests', 'UPDATE'), inspectionRequestController.submit);
router.patch('/:id/complete', authenticate, requireRule('inspection-requests', 'UPDATE'), inspectionRequestController.complete);
router.patch('/:id/reject', authenticate, requireRule('inspection-requests', 'UPDATE'), inspectionRequestController.reject);
router.patch('/:id/cancel', authenticate, requireRule('inspection-requests', 'UPDATE'), inspectionRequestController.cancel);
router.post('/:id/cancel', authenticate, requireRule('inspection-requests', 'UPDATE'), inspectionRequestController.cancel);

export default router;
