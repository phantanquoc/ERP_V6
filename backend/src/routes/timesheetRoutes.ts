import { Router } from 'express';
import timesheetController from '@controllers/timesheetController';
import { authenticate } from '@middlewares/auth';

const router = Router();

router.get('/monthly', authenticate, timesheetController.getMonthly);
router.post('/cell', authenticate, timesheetController.upsertCell);
router.put('/cell', authenticate, timesheetController.upsertCell);
router.post('/override', authenticate, timesheetController.upsertOverride);
router.put('/override', authenticate, timesheetController.upsertOverride);

export default router;
