import { Router } from 'express';
import faultRecordController from '@controllers/faultRecordController';
import { authenticate } from '@middlewares/auth';
import { createSingleUploadMiddleware } from '@middlewares/upload';
import { requireTechnicalAccess, TECHNICAL_SUB_DEPARTMENT_CODES } from './technicalAccess';

const router = Router();
const upload = createSingleUploadMiddleware('fault-records');
const technicalAccess = requireTechnicalAccess(TECHNICAL_SUB_DEPARTMENT_CODES.MECHANICAL);

router.use(authenticate);

// Read-only + create: open to all authenticated users
router.get('/', faultRecordController.getAll.bind(faultRecordController));
router.get('/export/excel', faultRecordController.exportExcel.bind(faultRecordController));
// New aggregate endpoints must come BEFORE /:id to avoid route shadowing
router.get('/recurrence', faultRecordController.checkRecurrence.bind(faultRecordController));
router.get('/stats', faultRecordController.getStats.bind(faultRecordController));
router.get('/heatmap', faultRecordController.getHeatmap.bind(faultRecordController));
router.get('/:id', faultRecordController.getById.bind(faultRecordController));
router.post('/', upload, faultRecordController.create.bind(faultRecordController));

// Mutating operations remain restricted to technical-mechanical users
router.put('/:id', technicalAccess, upload, faultRecordController.update.bind(faultRecordController));
router.delete('/:id', technicalAccess, faultRecordController.remove.bind(faultRecordController));

export default router;
