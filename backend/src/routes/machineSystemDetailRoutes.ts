import { Router } from 'express';
import machineSystemDetailController from '@controllers/machineSystemDetailController';
import { authenticate, deviceOrJwtAuth } from '@middlewares/auth';
import { createSingleUploadMiddleware } from '@middlewares/upload';
import { requireTechnicalAccess, TECHNICAL_SUB_DEPARTMENT_CODES } from './technicalAccess';

const router = Router();
const upload = createSingleUploadMiddleware('machine-system-details');
const technicalAccess = requireTechnicalAccess(TECHNICAL_SUB_DEPARTMENT_CODES.QLHTM);

// Kiosk-accessible endpoint — accept device key OR JWT
router.get('/', deviceOrJwtAuth('DATA_ENTRY'), machineSystemDetailController.list.bind(machineSystemDetailController));

// Desktop-only endpoints — require JWT
router.get('/generate-code', authenticate, technicalAccess, machineSystemDetailController.generateCode.bind(machineSystemDetailController));
router.get('/tree', authenticate, machineSystemDetailController.getTree.bind(machineSystemDetailController));
router.get('/:id', authenticate, machineSystemDetailController.getById.bind(machineSystemDetailController));
router.post('/', authenticate, technicalAccess, upload, machineSystemDetailController.create.bind(machineSystemDetailController));
router.put('/:id', authenticate, technicalAccess, upload, machineSystemDetailController.update.bind(machineSystemDetailController));
router.patch('/:id/deactivate', authenticate, technicalAccess, machineSystemDetailController.deactivate.bind(machineSystemDetailController));
router.delete('/:id', authenticate, technicalAccess, machineSystemDetailController.remove.bind(machineSystemDetailController));

export default router;
