import { env } from '@config/env';
import logger from '@config/logger';

const AI_URL = env.AI_SERVICE_URL;

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatResult {
  answer: string;
  sources: string[];
}

async function sendMessage(
  message: string,
  department: string,
  role: string,
  history: ChatMessage[] = []
): Promise<ChatResult> {
  let res: Response;
  try {
    res = await fetch(`${AI_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, department, role, history }),
    });
  } catch {
    return {
      answer: 'Trợ lý ERP đang khởi động, vui lòng thử lại sau ít phút.',
      sources: [],
    };
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    logger.error(`Chat AI error ${res.status}: ${text}`);
    throw new Error(`AI service error: ${res.status}`);
  }

  return res.json() as Promise<ChatResult>;
}

export default { sendMessage };
