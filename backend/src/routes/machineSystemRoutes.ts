import { Router } from 'express';
import machineSystemController from '@controllers/machineSystemController';
import { authenticate } from '@middlewares/auth';
import { createSingleUploadMiddleware } from '@middlewares/upload';
import { requireTechnicalAccess, TECHNICAL_SUB_DEPARTMENT_CODES } from './technicalAccess';

const router = Router();
const upload = createSingleUploadMiddleware('machine-systems');
const technicalAccess = requireTechnicalAccess(TECHNICAL_SUB_DEPARTMENT_CODES.QLHTM);

router.use(authenticate);

router.get('/generate-code', machineSystemController.getNextCode.bind(machineSystemController));
router.get('/distinct-fields', machineSystemController.getDistinctFields.bind(machineSystemController));
router.get('/', machineSystemController.getAll.bind(machineSystemController));
router.get('/export/excel', machineSystemController.exportExcel.bind(machineSystemController));
router.get('/:id', machineSystemController.getById.bind(machineSystemController));
router.get('/:id/machines', machineSystemController.getMachinesForSystem.bind(machineSystemController));
router.post('/', technicalAccess, upload, machineSystemController.create.bind(machineSystemController));
router.put('/:id', technicalAccess, upload, machineSystemController.update.bind(machineSystemController));
router.delete('/:id', technicalAccess, machineSystemController.remove.bind(machineSystemController));

export default router;
