import { Router } from 'express';
import faultRecordController from '@controllers/faultRecordController';
import { authenticate, authorize } from '@middlewares/auth';
import { createSingleUploadMiddleware } from '@middlewares/upload';
import { UserRole } from '@types';

const router = Router();
const upload = createSingleUploadMiddleware('fault-records');

router.use(authenticate);

router.get('/', faultRecordController.getAll.bind(faultRecordController));
router.get('/export/excel', faultRecordController.exportExcel.bind(faultRecordController));
router.get('/:id', faultRecordController.getById.bind(faultRecordController));
router.post('/', authorize(UserRole.ADMIN, UserRole.DEPARTMENT_HEAD, UserRole.TEAM_LEAD), upload, faultRecordController.create.bind(faultRecordController));
router.put('/:id', authorize(UserRole.ADMIN, UserRole.DEPARTMENT_HEAD, UserRole.TEAM_LEAD), upload, faultRecordController.update.bind(faultRecordController));
router.delete('/:id', authorize(UserRole.ADMIN, UserRole.DEPARTMENT_HEAD), faultRecordController.remove.bind(faultRecordController));

export default router;
