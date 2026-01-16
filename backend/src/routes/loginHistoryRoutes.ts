import { Router } from 'express';
import loginHistoryController from '@controllers/loginHistoryController';
import { authenticate } from '@middlewares/auth';

const router = Router();

// Get my login history (authenticated user)
router.get('/my-history', authenticate, (req, res) =>
  loginHistoryController.getMyLoginHistory(req, res)
);

// Get all login history (admin only)
router.get('/', authenticate, (req, res) =>
  loginHistoryController.getAllLoginHistory(req, res)
);

export default router;

