import { Router } from 'express';
import attendanceCodeController from '@controllers/attendanceCodeController';
import { authenticate, authorize } from '@middlewares/auth';

const router = Router();

router.get('/', authenticate, authorize('ADMIN', 'DEPARTMENT_HEAD', 'TEAM_LEAD'), attendanceCodeController.list);
router.post('/', authenticate, authorize('ADMIN', 'DEPARTMENT_HEAD'), attendanceCodeController.create);
router.put('/:id', authenticate, authorize('ADMIN', 'DEPARTMENT_HEAD'), attendanceCodeController.update);
router.delete('/:id', authenticate, authorize('ADMIN', 'DEPARTMENT_HEAD'), attendanceCodeController.delete);

export default router;
