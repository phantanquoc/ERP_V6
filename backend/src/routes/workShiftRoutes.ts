import { Router } from 'express';
import workShiftController from '@controllers/workShiftController';
import { authenticate } from '@middlewares/auth';

const router = Router();

router.get('/', authenticate, (req, res, next) => workShiftController.getAll(req, res, next));
router.post('/', authenticate, (req, res, next) => workShiftController.create(req, res, next));
router.put('/:id', authenticate, (req, res, next) => workShiftController.update(req, res, next));
router.delete('/:id', authenticate, (req, res, next) => workShiftController.delete(req, res, next));

export default router;
