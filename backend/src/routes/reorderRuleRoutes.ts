import { Router } from 'express';
import reorderRuleController from '@controllers/reorderRuleController';
import { authenticate } from '@middlewares/auth';
import { requireRule } from '@middlewares/requireRule';
const router = Router();

router.use(authenticate);

// List / detail / by-product
router.get('/', reorderRuleController.getAllRules);
router.get('/by-product/:productId', reorderRuleController.getRuleByProduct);
router.get('/:id', reorderRuleController.getRuleById);

// Mutations — admin, department head, or purchasing lead
router.post(
  '/',
  requireRule('reorder-rules', 'READ'),
  reorderRuleController.createRule
);
router.put(
  '/:id',
  requireRule('reorder-rules', 'UPDATE'),
  reorderRuleController.updateRule
);
router.delete(
  '/:id',
  requireRule('reorder-rules', 'DELETE'),
  reorderRuleController.deleteRule
);

export default router;
