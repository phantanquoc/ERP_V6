import { Router } from 'express';
import { createLot, deleteLot } from '@controllers/lotController';
import { authenticate } from '@middlewares/auth';

const router = Router();

router.use(authenticate);

// POST /api/lots
router.post('/', createLot);

// DELETE /api/lots/:id
router.delete('/:id', deleteLot);

export default router;

