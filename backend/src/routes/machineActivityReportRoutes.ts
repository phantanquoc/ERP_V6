import { Router } from 'express';
import machineActivityReportController from '@controllers/machineActivityReportController';
import { authenticate, authorize } from '@middlewares/auth';
import { createSingleUploadMiddleware } from '@middlewares/upload';
import { UserRole } from '@types';

const router = Router();
const upload = createSingleUploadMiddleware('machine-reports');

router.use(authenticate);

router.get('/', machineActivityReportController.getAll.bind(machineActivityReportController));
router.get('/export/excel', machineActivityReportController.exportExcel.bind(machineActivityReportController));
router.get('/:id', machineActivityReportController.getById.bind(machineActivityReportController));
router.post('/', authorize(UserRole.ADMIN, UserRole.DEPARTMENT_HEAD, UserRole.TEAM_LEAD), upload, machineActivityReportController.create.bind(machineActivityReportController));
router.put('/:id', authorize(UserRole.ADMIN, UserRole.DEPARTMENT_HEAD, UserRole.TEAM_LEAD), upload, machineActivityReportController.update.bind(machineActivityReportController));
router.delete('/:id', authorize(UserRole.ADMIN, UserRole.DEPARTMENT_HEAD), machineActivityReportController.remove.bind(machineActivityReportController));

export default router;
