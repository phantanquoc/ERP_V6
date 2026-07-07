import { Router } from 'express';
import reorderRuleController from '@controllers/reorderRuleController';
import { authenticate, authorize } from '@middlewares/auth';
import { UserRole } from '@types';

const router = Router();

router.use(authenticate);

// List / detail / by-product
router.get('/', reorderRuleController.getAllRules);
router.get('/by-product/:productId', reorderRuleController.getRuleByProduct);
router.get('/:id', reorderRuleController.getRuleById);

// Mutations — admin, department head, or purchasing lead
router.post(
  '/',
  authorize(UserRole.ADMIN, UserRole.DEPARTMENT_HEAD, UserRole.TEAM_LEAD),
  reorderRuleController.createRule
);
router.put(
  '/:id',
  authorize(UserRole.ADMIN, UserRole.DEPARTMENT_HEAD, UserRole.TEAM_LEAD),
  reorderRuleController.updateRule
);
router.delete(
  '/:id',
  authorize(UserRole.ADMIN, UserRole.DEPARTMENT_HEAD),
  reorderRuleController.deleteRule
);

export default router;
