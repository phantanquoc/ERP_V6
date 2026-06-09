import { Router } from 'express';
import faultRecordController from '@controllers/faultRecordController';
import { authenticate } from '@middlewares/auth';
import { createSingleUploadMiddleware } from '@middlewares/upload';
import { requireTechnicalAccess, TECHNICAL_SUB_DEPARTMENT_CODES } from './technicalAccess';

const router = Router();
const upload = createSingleUploadMiddleware('fault-records');
const technicalAccess = requireTechnicalAccess(TECHNICAL_SUB_DEPARTMENT_CODES.MECHANICAL);

router.use(authenticate);

router.get('/', technicalAccess, faultRecordController.getAll.bind(faultRecordController));
router.get('/export/excel', technicalAccess, faultRecordController.exportExcel.bind(faultRecordController));
router.get('/:id', technicalAccess, faultRecordController.getById.bind(faultRecordController));
router.post('/', technicalAccess, upload, faultRecordController.create.bind(faultRecordController));
router.put('/:id', technicalAccess, upload, faultRecordController.update.bind(faultRecordController));
router.delete('/:id', technicalAccess, faultRecordController.remove.bind(faultRecordController));

export default router;
