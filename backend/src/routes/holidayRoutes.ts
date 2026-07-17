import { Router } from 'express';
import holidayController from '@controllers/holidayController';
import { authenticate, authorize } from '@middlewares/auth';

const router = Router();

router.get('/', authenticate, authorize('ADMIN', 'DEPARTMENT_HEAD', 'TEAM_LEAD'), holidayController.list);
router.post('/', authenticate, authorize('ADMIN', 'DEPARTMENT_HEAD'), holidayController.create);
router.put('/:id', authenticate, authorize('ADMIN', 'DEPARTMENT_HEAD'), holidayController.update);
router.delete('/:id', authenticate, authorize('ADMIN', 'DEPARTMENT_HEAD'), holidayController.delete);

export default router;
