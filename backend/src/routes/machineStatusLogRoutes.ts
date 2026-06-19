import { Router } from 'express';
import machineStatusLogController from '@controllers/machineStatusLogController';
import { authenticate } from '@middlewares/auth';

const router = Router();

router.use(authenticate);

router.get('/', machineStatusLogController.getAll.bind(machineStatusLogController));
router.get('/:id', machineStatusLogController.getById.bind(machineStatusLogController));

export default router;
