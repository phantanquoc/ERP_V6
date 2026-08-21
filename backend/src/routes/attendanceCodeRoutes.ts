import { Router } from 'express';
import attendanceCodeController from '@controllers/attendanceCodeController';
import { authenticate } from '@middlewares/auth';
import { requireRule } from '@middlewares/requireRule';

const router = Router();

router.get('/', authenticate, requireRule('attendance-codes', 'READ'), attendanceCodeController.list);
router.post('/', authenticate, requireRule('attendance-codes', 'READ'), attendanceCodeController.create);
router.put('/:id', authenticate, requireRule('attendance-codes', 'READ'), attendanceCodeController.update);
router.delete('/:id', authenticate, requireRule('attendance-codes', 'READ'), attendanceCodeController.delete);

export default router;
