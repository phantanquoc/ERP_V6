import { Router } from 'express';
import attendanceCodeController from '@controllers/attendanceCodeController';
import { authenticate } from '@middlewares/auth';
import { requireRule } from '@middlewares/requireRule';

const router = Router();

router.get('/', authenticate, requireRule('attendance-codes', 'READ'), attendanceCodeController.list);
router.post('/', authenticate, requireRule('attendance-codes', 'CREATE'), attendanceCodeController.create);
router.put('/:id', authenticate, requireRule('attendance-codes', 'UPDATE'), attendanceCodeController.update);
router.delete('/:id', authenticate, requireRule('attendance-codes', 'DELETE'), attendanceCodeController.delete);

export default router;
