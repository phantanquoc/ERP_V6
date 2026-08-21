import { Router } from 'express';
import systemSettingsController from '@controllers/systemSettingsController';
import { authenticate } from '@middlewares/auth';
import { requireRule } from '@middlewares/requireRule';

const router = Router();

router.get('/', authenticate, (req, res, next) => systemSettingsController.getSettings(req, res, next));
router.put('/', authenticate, requireRule('system-settings', 'READ'), (req, res, next) => systemSettingsController.updateSettings(req, res, next));

export default router;
