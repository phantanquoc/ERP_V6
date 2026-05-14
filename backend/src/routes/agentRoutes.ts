import { Router } from 'express';
import agentController from '@controllers/agentController';
import { authenticate } from '@middlewares/auth';

const router = Router();

/** POST /api/agent/stream — agent streaming (intent classify + function calling) */
router.post('/stream', authenticate, agentController.stream.bind(agentController));

export default router;
