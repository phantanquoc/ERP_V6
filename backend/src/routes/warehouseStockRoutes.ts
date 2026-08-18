import { Router } from 'express';
import { authenticate, authorize } from '@middlewares/auth';
import { UserRole } from '@types';
import { receiveSplit, issueFifo } from '@controllers/warehouseStockController';

const router = Router();

const ALLOWED = [UserRole.ADMIN, UserRole.DEPARTMENT_HEAD, UserRole.TEAM_LEAD];

router.post('/receive', authenticate, authorize(...ALLOWED), receiveSplit);
router.post('/issue', authenticate, authorize(...ALLOWED), issueFifo);

export default router;