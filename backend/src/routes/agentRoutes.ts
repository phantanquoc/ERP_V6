import { Router } from 'express';
import multer from 'multer';
import agentController from '@controllers/agentController';
import { authenticate } from '@middlewares/auth';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

/** POST /api/agent/stream — agent streaming (intent classify + function calling) */
router.post('/stream', authenticate, agentController.stream.bind(agentController));

/** POST /api/agent/upload — upload document for record creation */
router.post('/upload', authenticate, upload.single('file'), agentController.upload.bind(agentController));

export default router;
