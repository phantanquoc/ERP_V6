import { Router } from 'express';
import holidayController from '@controllers/holidayController';
import { authenticate } from '@middlewares/auth';
import { requireRule } from '@middlewares/requireRule';

const router = Router();

router.get('/', authenticate, requireRule('holidays', 'READ'), holidayController.list);
router.post('/', authenticate, requireRule('holidays', 'READ'), holidayController.create);
router.put('/:id', authenticate, requireRule('holidays', 'READ'), holidayController.update);
router.delete('/:id', authenticate, requireRule('holidays', 'READ'), holidayController.delete);

export default router;
