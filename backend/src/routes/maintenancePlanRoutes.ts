import { Router } from 'express';
import maintenancePlanController from '@controllers/maintenancePlanController';
import { authenticate } from '@middlewares/auth';
import { createSingleUploadMiddleware } from '@middlewares/upload';
import { requireTechnicalAccess, TECHNICAL_SUB_DEPARTMENT_CODES } from './technicalAccess';

const router = Router();
const upload = createSingleUploadMiddleware('maintenance-plans');
const technicalAccess = requireTechnicalAccess(TECHNICAL_SUB_DEPARTMENT_CODES.QLHTM);

router.use(authenticate);

router.get('/', technicalAccess, maintenancePlanController.list.bind(maintenancePlanController));
router.get('/generate-code', technicalAccess, maintenancePlanController.generateCode.bind(maintenancePlanController));
router.get('/:id', technicalAccess, maintenancePlanController.getById.bind(maintenancePlanController));
router.post('/', technicalAccess, upload, maintenancePlanController.create.bind(maintenancePlanController));
router.put('/:id', technicalAccess, upload, maintenancePlanController.update.bind(maintenancePlanController));
router.patch('/:id/items/:itemId/toggle', technicalAccess, maintenancePlanController.toggleMonth.bind(maintenancePlanController));
router.patch('/logs/:logId/note', technicalAccess, maintenancePlanController.updateLogNote.bind(maintenancePlanController));
router.delete('/:id', technicalAccess, maintenancePlanController.remove.bind(maintenancePlanController));

export default router;
