import { Router } from 'express';
import maintenanceRecordController from '@controllers/maintenanceRecordController';
import { authenticate } from '@middlewares/auth';
import { createSingleUploadMiddleware } from '@middlewares/upload';
import { requireTechnicalAccess, TECHNICAL_SUB_DEPARTMENT_CODES } from './technicalAccess';

const router = Router();
const upload = createSingleUploadMiddleware('maintenance-records');
const technicalAccess = requireTechnicalAccess(TECHNICAL_SUB_DEPARTMENT_CODES.QLHTM);

router.use(authenticate);

router.get('/', technicalAccess, maintenanceRecordController.list.bind(maintenanceRecordController));
router.get('/generate-code', technicalAccess, maintenanceRecordController.generateCode.bind(maintenanceRecordController));
router.get('/export/excel', technicalAccess, maintenanceRecordController.exportExcel.bind(maintenanceRecordController));
router.get('/:id', technicalAccess, maintenanceRecordController.getById.bind(maintenanceRecordController));
router.post('/', technicalAccess, upload, maintenanceRecordController.create.bind(maintenanceRecordController));
router.put('/:id', technicalAccess, upload, maintenanceRecordController.update.bind(maintenanceRecordController));
router.delete('/:id', technicalAccess, maintenanceRecordController.remove.bind(maintenanceRecordController));

export default router;
