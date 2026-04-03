import { Router } from 'express';
import supplyAdjustmentController from '@controllers/supplyAdjustmentController';
import { authenticate } from '@middlewares/auth';

const router = Router();

router.use(authenticate);

router.get('/', supplyAdjustmentController.getAll.bind(supplyAdjustmentController));
router.post('/', supplyAdjustmentController.create.bind(supplyAdjustmentController));
router.get('/:id', supplyAdjustmentController.getById.bind(supplyAdjustmentController));
router.patch('/:id/approve', supplyAdjustmentController.approve.bind(supplyAdjustmentController));
router.patch('/:id/reject', supplyAdjustmentController.reject.bind(supplyAdjustmentController));

export default router;
