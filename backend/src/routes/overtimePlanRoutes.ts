import { Router } from 'express';
import overtimePlanController from '@controllers/overtimePlanController';
import { authenticate } from '@middlewares/auth';
import { requireRule } from '@middlewares/requireRule';
import { createUploadMiddleware } from '@middlewares/upload';

const router = Router();

const uploadOvertimePlans = createUploadMiddleware('overtime-plans', 10);

router.use(authenticate);

router.get('/my-plans', overtimePlanController.getMyPlans);
router.get('/', overtimePlanController.getAll);
router.get('/:id', overtimePlanController.getById);
router.post('/', requireRule('overtime-plans', 'READ'), uploadOvertimePlans, overtimePlanController.create);
router.put('/:id', uploadOvertimePlans, overtimePlanController.update);
router.delete('/:id', overtimePlanController.delete);
router.patch('/:id/accept', overtimePlanController.acceptPlan);
router.patch('/:id/approve',
  requireRule('overtime-plans', 'CREATE'),
  async (req: any, res: any, next: any) => {
    if (req.user?.role === 'ADMIN') return next();
    const { isPricingApprover } = await import('@utils/isPricingApprover');
    if (await isPricingApprover(req.user)) return next();
    return res.status(403).json({ success: false, message: 'Không có quyền phê duyệt kế hoạch tăng ca' });
  },
  overtimePlanController.approvePlan);
router.patch('/:id/actual-time', overtimePlanController.updateActualTime);

export default router;

