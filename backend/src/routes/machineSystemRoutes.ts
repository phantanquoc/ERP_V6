import { Router } from 'express';
import machineSystemController from '@controllers/machineSystemController';
import { authenticate, deviceOrJwtAuth } from '@middlewares/auth';
import { createSingleUploadMiddleware } from '@middlewares/upload';
import { requireTechnicalAccess, TECHNICAL_SUB_DEPARTMENT_CODES } from './technicalAccess';

const router = Router();
const upload = createSingleUploadMiddleware('machine-systems');
const technicalAccess = requireTechnicalAccess(TECHNICAL_SUB_DEPARTMENT_CODES.QLHTM);

// Kiosk-accessible endpoint — accept device key OR JWT
router.get('/active-production', deviceOrJwtAuth('DATA_ENTRY'), machineSystemController.getActiveProductionMachines.bind(machineSystemController));

// Desktop-only endpoints — require JWT
router.get('/generate-code', authenticate, machineSystemController.getNextCode.bind(machineSystemController));
router.get('/distinct-fields', authenticate, machineSystemController.getDistinctFields.bind(machineSystemController));
router.get('/', authenticate, machineSystemController.getAll.bind(machineSystemController));
router.get('/export/excel', authenticate, machineSystemController.exportExcel.bind(machineSystemController));
router.get('/:id', authenticate, machineSystemController.getById.bind(machineSystemController));
router.get('/:id/summary', authenticate, machineSystemController.getSummary.bind(machineSystemController));
router.post('/', authenticate, technicalAccess, upload, machineSystemController.create.bind(machineSystemController));
router.post('/:id/clone', authenticate, technicalAccess, machineSystemController.clone.bind(machineSystemController));
router.post('/:id/status', authenticate, technicalAccess, machineSystemController.updateStatus.bind(machineSystemController));
router.put('/:id', authenticate, technicalAccess, upload, machineSystemController.update.bind(machineSystemController));
router.delete('/:id', authenticate, technicalAccess, machineSystemController.remove.bind(machineSystemController));

export default router;
