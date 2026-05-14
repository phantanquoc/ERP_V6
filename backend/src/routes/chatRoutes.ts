import { Router } from 'express';
import chatController from '@controllers/chatController';
import { authenticate } from '@middlewares/auth';

const router = Router();

/** POST /api/chat — gửi tin nhắn đến chatbot RAG (blocking) */
router.post('/', authenticate, chatController.chat.bind(chatController));

/** POST /api/chat/stream — streaming response (Server-Sent Events style) */
router.post('/stream', authenticate, chatController.chatStream.bind(chatController));

/** POST /api/chat/feedback — gửi feedback 👍/👎 */
router.post('/feedback', authenticate, chatController.chatFeedback.bind(chatController));

export default router;
