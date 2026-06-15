import { Router } from 'express';
import maintenanceTemplateController from '@controllers/maintenanceTemplateController';
import { authenticate } from '@middlewares/auth';
import { requireTechnicalAccess, TECHNICAL_SUB_DEPARTMENT_CODES } from './technicalAccess';

const router = Router();
const technicalAccess = requireTechnicalAccess(TECHNICAL_SUB_DEPARTMENT_CODES.QLHTM);

router.use(authenticate);

router.get('/', technicalAccess, maintenanceTemplateController.list.bind(maintenanceTemplateController));
router.get('/:id', technicalAccess, maintenanceTemplateController.getById.bind(maintenanceTemplateController));
router.post('/', technicalAccess, maintenanceTemplateController.create.bind(maintenanceTemplateController));
router.put('/:id', technicalAccess, maintenanceTemplateController.update.bind(maintenanceTemplateController));
router.delete('/:id', technicalAccess, maintenanceTemplateController.remove.bind(maintenanceTemplateController));

export default router;
