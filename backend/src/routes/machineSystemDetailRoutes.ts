import { Router } from 'express';
import machineSystemDetailController from '@controllers/machineSystemDetailController';
import { authenticate } from '@middlewares/auth';
import { createSingleUploadMiddleware } from '@middlewares/upload';
import { requireTechnicalAccess, TECHNICAL_SUB_DEPARTMENT_CODES } from './technicalAccess';

const router = Router();
const upload = createSingleUploadMiddleware('machine-system-details');
const technicalAccess = requireTechnicalAccess(TECHNICAL_SUB_DEPARTMENT_CODES.QLHTM);

router.use(authenticate);

router.get('/generate-code', technicalAccess, machineSystemDetailController.generateCode.bind(machineSystemDetailController));
router.get('/tree', machineSystemDetailController.getTree.bind(machineSystemDetailController));
router.get('/', machineSystemDetailController.list.bind(machineSystemDetailController));
router.get('/:id', machineSystemDetailController.getById.bind(machineSystemDetailController));
router.post('/', technicalAccess, upload, machineSystemDetailController.create.bind(machineSystemDetailController));
router.put('/:id', technicalAccess, upload, machineSystemDetailController.update.bind(machineSystemDetailController));
router.patch('/:id/deactivate', technicalAccess, machineSystemDetailController.deactivate.bind(machineSystemDetailController));
router.delete('/:id', technicalAccess, machineSystemDetailController.remove.bind(machineSystemDetailController));

export default router;
