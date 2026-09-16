import { Router } from 'express';
import overtimePlanController from '@controllers/overtimePlanController';
import { authenticate } from '@middlewares/auth';
import { requireRule } from '@middlewares/requireRule';
import { createUploadMiddleware } from '@middlewares/upload';

const router = Router();

const uploadOvertimePlans = createUploadMiddleware('overtime-plans', 10);

router.use(authenticate);

router.get('/my-plans', requireRule('overtime-plans', 'READ'), overtimePlanController.getMyPlans);
router.get('/', requireRule('overtime-plans', 'READ'), overtimePlanController.getAll);
router.get('/:id', requireRule('overtime-plans', 'READ'), overtimePlanController.getById);
router.post('/', requireRule('overtime-plans', 'CREATE'), uploadOvertimePlans, overtimePlanController.create);
router.put('/:id', requireRule('overtime-plans', 'UPDATE'), uploadOvertimePlans, overtimePlanController.update);
router.delete('/:id', requireRule('overtime-plans', 'DELETE'), overtimePlanController.delete);
router.patch('/:id/accept', requireRule('overtime-plans', 'UPDATE'), overtimePlanController.acceptPlan);
router.patch('/:id/approve',
  requireRule('overtime-plans', 'APPROVE'),
  async (req: any, res: any, next: any) => {
    if (req.user?.role === 'ADMIN') return next();
    const { isPricingApprover } = await import('@utils/isPricingApprover');
    if (await isPricingApprover(req.user)) return next();
    return res.status(403).json({ success: false, message: 'Không có quyền phê duyệt kế hoạch tăng ca' });
  },
  overtimePlanController.approvePlan);
router.patch('/:id/actual-time', requireRule('overtime-plans', 'UPDATE'), overtimePlanController.updateActualTime);

export default router;

