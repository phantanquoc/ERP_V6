import { Router } from 'express';
import attendanceCodeController from '@controllers/attendanceCodeController';
import { authenticate } from '@middlewares/auth';

const router = Router();

router.get('/', authenticate, attendanceCodeController.list);
router.post('/', authenticate, attendanceCodeController.create);
router.put('/:id', authenticate, attendanceCodeController.update);
router.delete('/:id', authenticate, attendanceCodeController.delete);

export default router;
