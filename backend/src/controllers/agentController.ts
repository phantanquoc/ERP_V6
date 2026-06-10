import { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '@types';
import { ValidationError } from '@utils/errors';
import { getDepartmentCode, getDepartmentCodes } from '@services/userLookupService';
import { env } from '@config/env';

export class AgentController {
  async stream(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { message, history, confirm_tool, confirm_params, confirm_context, uploaded_files } = req.body as {
        message?: string;
        history?: Array<{ role: string; content: string }>;
        confirm_tool?: string;
        confirm_params?: Record<string, unknown>;
        confirm_context?: Record<string, unknown>;
        uploaded_files?: Array<{ file_id: string; filename: string }>;
      };

      if (!message && !confirm_tool) {
        throw new ValidationError('Thiếu nội dung tin nhắn hoặc confirm_tool');
      }

      const role = req.user?.role ?? '';
      const department = await getDepartmentCode(req.user?.departmentId);
      const entries = req.user?.secondaryDepartments;
      const secondaryDepartments = entries?.length
        ? await getDepartmentCodes(entries.map(e => e.departmentId))
        : [];
      const jwtToken = req.headers.authorization?.replace('Bearer ', '') ?? '';

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10 * 60 * 1000);

      let fetchRes: globalThis.Response;
      try {
        fetchRes = await fetch(`${env.AI_SERVICE_URL}/agent/stream`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${jwtToken}`,
          },
          body: JSON.stringify({
            message: message?.trim() ?? '',
            department,
            secondary_departments: secondaryDepartments,
            role,
            history: Array.isArray(history) ? history : [],
            confirm_tool: confirm_tool ?? '',
            confirm_params: confirm_params ?? {},
            confirm_context: confirm_context ?? null,
            uploaded_files: Array.isArray(uploaded_files) ? uploaded_files : [],
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
        if (!res.headersSent) { next(streamErr); } else { res.end(); }
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (error) {
      next(error);
    }
  }

  async upload(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const file = req.file;
      if (!file) {
        throw new ValidationError('Không có file nào được tải lên');
      }

      const formData = new FormData();
      formData.append('file', new Blob([file.buffer], { type: file.mimetype }), file.originalname);

      const fetchRes = await fetch(`${env.AI_SERVICE_URL}/docs/upload`, {
        method: 'POST',
        body: formData,
      });

      const data = await fetchRes.json();
      res.status(fetchRes.status).json(data);
    } catch (error) {
      next(error);
    }
  }
}

export default new AgentController();
