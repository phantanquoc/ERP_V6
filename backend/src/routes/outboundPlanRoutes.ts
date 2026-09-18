import { Router } from 'express';
import {
  getAllOutboundPlans,
  getOutboundPlanById,
  updateOutboundPlan,
  cancelOutboundPlan,
  markOutboundReceived,
} from '../controllers/outboundPlanController';
import { authenticate } from '@middlewares/auth';
import { requireRule } from '@middlewares/requireRule';

const router = Router();
router.use(authenticate);

router.get('/', requireRule('warehouse-receipts', 'READ'), getAllOutboundPlans);
router.get('/:id', requireRule('warehouse-receipts', 'READ'), getOutboundPlanById);
router.put('/:id', requireRule('warehouse-receipts', 'UPDATE'), updateOutboundPlan);
router.post('/:id/cancel', requireRule('warehouse-receipts', 'UPDATE'), cancelOutboundPlan);
router.post('/:id/mark-received', requireRule('warehouse-receipts', 'UPDATE'), markOutboundReceived);

export default router;
