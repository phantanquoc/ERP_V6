import { Router } from 'express';
import { authenticate } from '@middlewares/auth';
import { requireRule } from '@middlewares/requireRule';
import { receiveSplit, issueFifo } from '@controllers/warehouseStockController';

const router = Router();

router.post('/receive', authenticate, requireRule('warehouse-stock', 'CREATE'), receiveSplit);
router.post('/issue', authenticate, requireRule('warehouse-stock', 'CREATE'), issueFifo);

export default router;