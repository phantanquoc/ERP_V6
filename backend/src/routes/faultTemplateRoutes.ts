import { Router } from 'express';
import faultTemplateController from '@controllers/faultTemplateController';
import { authenticate } from '@middlewares/auth';
import { createSingleUploadMiddleware } from '@middlewares/upload';
import { requireTechnicalAccess, TECHNICAL_SUB_DEPARTMENT_CODES } from './technicalAccess';

const router = Router();
const upload = createSingleUploadMiddleware('fault-templates');
const mechanicalAccess = requireTechnicalAccess(TECHNICAL_SUB_DEPARTMENT_CODES.MECHANICAL);

router.use(authenticate);

router.get('/', mechanicalAccess, faultTemplateController.list.bind(faultTemplateController));
router.get('/:id', mechanicalAccess, faultTemplateController.getById.bind(faultTemplateController));
router.post('/', mechanicalAccess, upload, faultTemplateController.create.bind(faultTemplateController));
router.put('/:id', mechanicalAccess, upload, faultTemplateController.update.bind(faultTemplateController));
router.patch('/:id/deactivate', mechanicalAccess, faultTemplateController.deactivate.bind(faultTemplateController));
router.delete('/:id', mechanicalAccess, faultTemplateController.remove.bind(faultTemplateController));

export default router;
