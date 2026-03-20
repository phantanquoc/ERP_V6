import { Router } from 'express';
import overtimePlanController from '@controllers/overtimePlanController';
import { authenticate } from '@middlewares/auth';
import { createUploadMiddleware } from '@middlewares/upload';

const router = Router();

const uploadOvertimePlans = createUploadMiddleware('overtime-plans', 10);

router.use(authenticate);

router.get('/my-plans', overtimePlanController.getMyPlans);
router.get('/', overtimePlanController.getAll);
router.get('/:id', overtimePlanController.getById);
router.post('/', uploadOvertimePlans, overtimePlanController.create);
router.put('/:id', uploadOvertimePlans, overtimePlanController.update);
router.delete('/:id', overtimePlanController.delete);
router.patch('/:id/accept', overtimePlanController.acceptPlan);
router.patch('/:id/approve', overtimePlanController.approvePlan);

export default router;
