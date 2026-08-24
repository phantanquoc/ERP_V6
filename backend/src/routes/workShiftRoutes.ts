import { Router } from 'express';
import workShiftController from '@controllers/workShiftController';
import { authenticate } from '@middlewares/auth';
import { requireRule } from '@middlewares/requireRule';

const router = Router();

router.get('/', authenticate, requireRule('work-shifts', 'READ'), (req, res, next) => workShiftController.getAll(req, res, next));
router.post('/', authenticate, requireRule('work-shifts', 'CREATE'), (req, res, next) => workShiftController.create(req, res, next));
router.put('/:id', authenticate, requireRule('work-shifts', 'UPDATE'), (req, res, next) => workShiftController.update(req, res, next));
router.delete('/:id', authenticate, requireRule('work-shifts', 'DELETE'), (req, res, next) => workShiftController.delete(req, res, next));

export default router;
