import { Router } from 'express';
import machineSystemController from '@controllers/machineSystemController';
import { authenticate, authorize } from '@middlewares/auth';
import { createSingleUploadMiddleware } from '@middlewares/upload';
import { UserRole } from '@types';

const router = Router();
const upload = createSingleUploadMiddleware('machine-systems');

router.use(authenticate);

router.get('/', machineSystemController.getAll.bind(machineSystemController));
router.get('/export/excel', machineSystemController.exportExcel.bind(machineSystemController));
router.get('/:id', machineSystemController.getById.bind(machineSystemController));
router.post('/', authorize(UserRole.ADMIN, UserRole.DEPARTMENT_HEAD), upload, machineSystemController.create.bind(machineSystemController));
router.put('/:id', authorize(UserRole.ADMIN, UserRole.DEPARTMENT_HEAD), upload, machineSystemController.update.bind(machineSystemController));
router.delete('/:id', authorize(UserRole.ADMIN, UserRole.DEPARTMENT_HEAD), machineSystemController.remove.bind(machineSystemController));

export default router;
