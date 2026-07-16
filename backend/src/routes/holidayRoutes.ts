import { Router } from 'express';
import holidayController from '@controllers/holidayController';
import { authenticate } from '@middlewares/auth';

const router = Router();

router.get('/', authenticate, holidayController.list);
router.post('/', authenticate, holidayController.create);
router.put('/:id', authenticate, holidayController.update);
router.delete('/:id', authenticate, holidayController.delete);

export default router;
