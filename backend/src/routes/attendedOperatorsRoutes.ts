import { Router } from 'express';
import { deviceOrJwtAuth } from '@middlewares/auth';
import attendedOperatorsController from '@controllers/attendedOperatorsController';

const router = Router();

// Kiosk endpoint with device-key auth
router.get(
  '/attended-operators',
  deviceOrJwtAuth('DATA_ENTRY'),
  attendedOperatorsController.getAttendedOperators
);

export default router;
