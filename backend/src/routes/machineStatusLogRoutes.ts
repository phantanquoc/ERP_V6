import { Router } from 'express';
import machineStatusLogController from '@controllers/machineStatusLogController';
import { authenticate } from '@middlewares/auth';
import { requireRule } from '@middlewares/requireRule';

const router = Router();

router.use(authenticate);

router.get('/', requireRule('machine-status-logs', 'READ'), machineStatusLogController.getAll.bind(machineStatusLogController));
router.get('/:id', requireRule('machine-status-logs', 'READ'), machineStatusLogController.getById.bind(machineStatusLogController));

export default router;
