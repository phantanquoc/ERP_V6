import { Router } from 'express';
import {
  getAllInboundPlans,
  getInboundPlanById,
  updateInboundPlan,
  cancelInboundPlan,
  markInboundReceived,
} from '../controllers/inboundPlanController';
import { authenticate } from '@middlewares/auth';
import { requireRule } from '@middlewares/requireRule';

const router = Router();
router.use(authenticate);

router.get('/', requireRule('warehouse-receipts', 'READ'), getAllInboundPlans);
router.get('/:id', requireRule('warehouse-receipts', 'READ'), getInboundPlanById);
router.put('/:id', requireRule('warehouse-receipts', 'UPDATE'), updateInboundPlan);
router.post('/:id/cancel', requireRule('warehouse-receipts', 'UPDATE'), cancelInboundPlan);
router.post('/:id/mark-received', requireRule('warehouse-receipts', 'UPDATE'), markInboundReceived);

export default router;
