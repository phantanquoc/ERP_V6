import { Router } from 'express';
import machineSystemDetailController from '@controllers/machineSystemDetailController';
import { authenticate } from '@middlewares/auth';
import { createSingleUploadMiddleware } from '@middlewares/upload';
import { requireTechnicalAccess, TECHNICAL_SUB_DEPARTMENT_CODES } from './technicalAccess';

const router = Router();
const upload = createSingleUploadMiddleware('machine-system-details');
const qlhtmAccess = requireTechnicalAccess(TECHNICAL_SUB_DEPARTMENT_CODES.QLHTM);

router.use(authenticate);

router.get('/generate-code', qlhtmAccess, machineSystemDetailController.generateCode.bind(machineSystemDetailController));
router.get('/tree', qlhtmAccess, machineSystemDetailController.getTree.bind(machineSystemDetailController));
router.get('/', qlhtmAccess, machineSystemDetailController.list.bind(machineSystemDetailController));
router.get('/:id', qlhtmAccess, machineSystemDetailController.getById.bind(machineSystemDetailController));
router.post('/', qlhtmAccess, upload, machineSystemDetailController.create.bind(machineSystemDetailController));
router.put('/:id', qlhtmAccess, upload, machineSystemDetailController.update.bind(machineSystemDetailController));
router.patch('/:id/deactivate', qlhtmAccess, machineSystemDetailController.deactivate.bind(machineSystemDetailController));
router.delete('/:id', qlhtmAccess, machineSystemDetailController.remove.bind(machineSystemDetailController));

export default router;
