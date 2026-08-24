import { Router } from 'express';
import timesheetController from '@controllers/timesheetController';
import { authenticate } from '@middlewares/auth';
import { requireRule } from '@middlewares/requireRule';

const router = Router();

router.get('/monthly', authenticate, requireRule('timesheet', 'READ'), timesheetController.getMonthly);
router.post('/cell', authenticate, requireRule('timesheet', 'UPDATE'), timesheetController.upsertCell);
// Support both POST and PUT for upsert (POST for backwards compat, PUT is semantically correct)
router.post('/cell/upsert', authenticate, requireRule('timesheet', 'UPDATE'), timesheetController.upsertCell);
router.put('/cell', authenticate, requireRule('timesheet', 'UPDATE'), timesheetController.upsertCell);

router.post('/override', authenticate, requireRule('timesheet', 'CREATE'), timesheetController.upsertOverride);
router.put('/override', authenticate, requireRule('timesheet', 'CREATE'), timesheetController.upsertOverride);

export default router;
