import { Router } from 'express';
import chatController from '@controllers/chatController';
import { authenticate } from '@middlewares/auth';
import { aiLimiter } from '@middlewares/rateLimiter';

const router = Router();

/** POST /api/chat — gửi tin nhắn đến chatbot RAG (blocking) */
router.post('/', authenticate, aiLimiter, chatController.chat.bind(chatController));

/** POST /api/chat/stream — streaming response (Server-Sent Events style) */
router.post('/stream', authenticate, aiLimiter, chatController.chatStream.bind(chatController));

/** POST /api/chat/feedback — gửi feedback 👍/👎 */
router.post('/feedback', authenticate, chatController.chatFeedback.bind(chatController));

export default router;
