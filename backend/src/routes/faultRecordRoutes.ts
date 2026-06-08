import { Router } from 'express';
import faultRecordController from '@controllers/faultRecordController';
import { authenticate, authorize } from '@middlewares/auth';
import { createSingleUploadMiddleware } from '@middlewares/upload';
import { UserRole } from '@types';
import { requireTechnicalAccess, TECHNICAL_SUB_DEPARTMENT_CODES } from './technicalAccess';

const router = Router();
const upload = createSingleUploadMiddleware('fault-records');
const mechanicalAccess = requireTechnicalAccess(TECHNICAL_SUB_DEPARTMENT_CODES.MECHANICAL);

router.use(authenticate);

router.get('/', mechanicalAccess, faultRecordController.getAll.bind(faultRecordController));
router.get('/export/excel', mechanicalAccess, faultRecordController.exportExcel.bind(faultRecordController));
router.get('/:id', mechanicalAccess, faultRecordController.getById.bind(faultRecordController));
router.post('/', mechanicalAccess, authorize(UserRole.ADMIN, UserRole.DEPARTMENT_HEAD, UserRole.TEAM_LEAD), upload, faultRecordController.create.bind(faultRecordController));
router.put('/:id', mechanicalAccess, authorize(UserRole.ADMIN, UserRole.DEPARTMENT_HEAD, UserRole.TEAM_LEAD), upload, faultRecordController.update.bind(faultRecordController));
router.delete('/:id', mechanicalAccess, authorize(UserRole.ADMIN, UserRole.DEPARTMENT_HEAD), faultRecordController.remove.bind(faultRecordController));

export default router;
