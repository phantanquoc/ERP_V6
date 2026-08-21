import { Router } from 'express';
import { authenticate } from '@middlewares/auth';
import { requireRule } from '@middlewares/requireRule';
import dataEntryPagePositionController from '@controllers/dataEntryPagePositionController';

const router = Router();

// All routes require ADMIN role
router.get(
  '/pages/:pageKey/positions',
  authenticate,
  requireRule('data-entry-page-positions', 'READ'),
  dataEntryPagePositionController.listByPage
);

router.post(
  '/pages/:pageKey/positions',
  authenticate,
  requireRule('data-entry-page-positions', 'CREATE'),
  dataEntryPagePositionController.addMapping
);

router.delete(
  '/pages/:pageKey/positions/:positionId',
  authenticate,
  requireRule('data-entry-page-positions', 'DELETE'),
  dataEntryPagePositionController.removeMapping
);

export default router;
