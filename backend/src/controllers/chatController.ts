import { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '@types';
import chatService, { ChatMessage } from '@services/chatService';
import { ValidationError } from '@utils/errors';
import prisma from '@config/database';
import { env } from '@config/env';

export class ChatController {
  private async _getDepartment(req: AuthenticatedRequest): Promise<string> {
    if (!req.user?.departmentId) return '';
    const dept = await prisma.department.findUnique({
      where: { id: req.user.departmentId },
      select: { code: true },
    });
    return dept?.code ?? '';
  }

  async chat(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { message, history } = req.body as {
        message: string;
        history?: ChatMessage[];
      };

      if (!message || typeof message !== 'string' || !message.trim()) {
        throw new ValidationError('Thiếu nội dung tin nhắn');
      }

      const role = req.user?.role ?? '';
      const department = await this._getDepartment(req);

      const result = await chatService.sendMessage(
        message.trim(),
        department,
        role,
        Array.isArray(history) ? history : []
      );

      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async chatStream(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { message, history } = req.body as {
        message: string;
        history?: ChatMessage[];
      };

      if (!message || typeof message !== 'string' || !message.trim()) {
        throw new ValidationError('Thiếu nội dung tin nhắn');
      }

      const role = req.user?.role ?? '';
      const department = await this._getDepartment(req);

      // Proxy stream từ AI service về client
      // signal với timeout 10 phút — đủ cho CPU inference
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10 * 60 * 1000);

      let fetchRes: globalThis.Response;
      try {
        fetchRes = await fetch(`${env.AI_SERVICE_URL}/chat/stream`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: message.trim(),
            department,
            role,
            history: Array.isArray(history) ? history : [],
          }),
          signal: controller.signal,
        });
      } catch (err: unknown) {
        clearTimeout(timeoutId);
        const isAbort = err instanceof Error && err.name === 'AbortError';
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.status(200).send(
          isAbort
            ? 'Trợ lý ERP mất quá nhiều thời gian để trả lời. Vui lòng thử lại.'
            : 'Trợ lý ERP đang khởi động, vui lòng thử lại sau ít phút.'
        );
        return;
      }

      if (!fetchRes.ok || !fetchRes.body) {
        clearTimeout(timeoutId);
        throw new Error(`AI service error: ${fetchRes.status}`);
      }

      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Transfer-Encoding', 'chunked');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('X-Accel-Buffering', 'no');

      const reader = fetchRes.body.getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          res.write(value);
        }
        res.end();
      } catch (streamErr) {
        if (!res.headersSent) {
          next(streamErr);
        } else {
          res.end();
        }
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (error) {
      next(error);
    }
  }
  async chatFeedback(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { question, answer, rating, comment } = req.body as {
        question: string;
        answer: string;
        rating: number;
        comment?: string;
      };

      if (!question || !answer || ![-1, 1].includes(rating)) {
        throw new ValidationError('Thiếu thông tin feedback');
      }

      const role = req.user?.role ?? '';
      const department = await this._getDepartment(req);

      const fetchRes = await fetch(`${env.AI_SERVICE_URL}/chat/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, answer, rating, comment: comment || '', department, role }),
      });

      if (!fetchRes.ok) {
        throw new Error(`AI service feedback error: ${fetchRes.status}`);
      }

      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  }
}

export default new ChatController();
