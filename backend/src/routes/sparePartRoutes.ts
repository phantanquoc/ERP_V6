import { Router } from 'express';
import sparePartController from '@controllers/sparePartController';
import { authenticate, authorize } from '@middlewares/auth';
import { createSingleUploadMiddleware } from '@middlewares/upload';
import { UserRole } from '@types';

const router = Router();
const upload = createSingleUploadMiddleware('spare-parts');

router.use(authenticate);

router.get('/', sparePartController.getAll.bind(sparePartController));
router.get('/stats', sparePartController.getStats.bind(sparePartController));
router.get('/export/excel', sparePartController.exportExcel.bind(sparePartController));
router.get('/:id', sparePartController.getById.bind(sparePartController));
router.post('/', authorize(UserRole.ADMIN, UserRole.DEPARTMENT_HEAD, UserRole.TEAM_LEAD), upload, sparePartController.create.bind(sparePartController));
router.put('/:id', authorize(UserRole.ADMIN, UserRole.DEPARTMENT_HEAD, UserRole.TEAM_LEAD), upload, sparePartController.update.bind(sparePartController));
router.delete('/:id', authorize(UserRole.ADMIN, UserRole.DEPARTMENT_HEAD), sparePartController.remove.bind(sparePartController));

export default router;
