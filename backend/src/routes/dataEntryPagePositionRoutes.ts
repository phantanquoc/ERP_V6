import { Router } from 'express';
import { authenticate, authorize } from '@middlewares/auth';
import dataEntryPagePositionController from '@controllers/dataEntryPagePositionController';

const router = Router();

// All routes require ADMIN role
router.get(
  '/pages/:pageKey/positions',
  authenticate,
  authorize('ADMIN'),
  dataEntryPagePositionController.listByPage
);

router.post(
  '/pages/:pageKey/positions',
  authenticate,
  authorize('ADMIN'),
  dataEntryPagePositionController.addMapping
);

router.delete(
  '/pages/:pageKey/positions/:positionId',
  authenticate,
  authorize('ADMIN'),
  dataEntryPagePositionController.removeMapping
);

export default router;
