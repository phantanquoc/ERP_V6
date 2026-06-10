import { Router } from 'express';
import sparePartController from '@controllers/sparePartController';
import { authenticate } from '@middlewares/auth';
import { createSingleUploadMiddleware } from '@middlewares/upload';
import { requireTechnicalAccess, TECHNICAL_SUB_DEPARTMENT_CODES } from './technicalAccess';

const router = Router();
const upload = createSingleUploadMiddleware('spare-parts');
const technicalAccess = requireTechnicalAccess(TECHNICAL_SUB_DEPARTMENT_CODES.MECHANICAL);

router.use(authenticate);

router.get('/', sparePartController.getAll.bind(sparePartController));
router.get('/stats', sparePartController.getStats.bind(sparePartController));
router.get('/export/excel', sparePartController.exportExcel.bind(sparePartController));
router.get('/:id', sparePartController.getById.bind(sparePartController));
router.post('/', technicalAccess, upload, sparePartController.create.bind(sparePartController));
router.put('/:id', technicalAccess, upload, sparePartController.update.bind(sparePartController));
router.delete('/:id', technicalAccess, sparePartController.remove.bind(sparePartController));

export default router;
