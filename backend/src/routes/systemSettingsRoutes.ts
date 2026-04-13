import { Router } from 'express';
import systemSettingsController from '@controllers/systemSettingsController';
import { authenticate, authorize } from '@middlewares/auth';

const router = Router();

router.get('/', authenticate, (req, res, next) => systemSettingsController.getSettings(req, res, next));
router.put('/', authenticate, authorize('ADMIN'), (req, res, next) => systemSettingsController.updateSettings(req, res, next));

export default router;
