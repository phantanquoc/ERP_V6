import { Router } from 'express';
import faultTemplateController from '@controllers/faultTemplateController';
import { authenticate } from '@middlewares/auth';
import { createSingleUploadMiddleware } from '@middlewares/upload';
import { requireTechnicalAccess, TECHNICAL_SUB_DEPARTMENT_CODES } from './technicalAccess';

const router = Router();
const upload = createSingleUploadMiddleware('fault-templates');
const technicalAccess = requireTechnicalAccess(TECHNICAL_SUB_DEPARTMENT_CODES.MECHANICAL);

router.use(authenticate);

router.get('/', technicalAccess, faultTemplateController.list.bind(faultTemplateController));
// Task 4.2: summary route must be registered BEFORE /:id to avoid route shadowing
router.get('/:id/summary', faultTemplateController.getSummary.bind(faultTemplateController));
router.get('/:id', technicalAccess, faultTemplateController.getById.bind(faultTemplateController));
router.post('/', technicalAccess, upload, faultTemplateController.create.bind(faultTemplateController));
router.put('/:id', technicalAccess, upload, faultTemplateController.update.bind(faultTemplateController));
router.patch('/:id/deactivate', technicalAccess, faultTemplateController.deactivate.bind(faultTemplateController));
router.delete('/:id', technicalAccess, faultTemplateController.remove.bind(faultTemplateController));

export default router;
