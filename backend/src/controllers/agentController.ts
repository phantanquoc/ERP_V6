import { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '@types';
import { ValidationError } from '@utils/errors';
import prisma from '@config/database';
import { env } from '@config/env';

export class AgentController {
  private async _getDepartment(req: AuthenticatedRequest): Promise<string> {
    if (!req.user?.departmentId) return '';
    const dept = await prisma.department.findUnique({
      where: { id: req.user.departmentId },
      select: { code: true },
    });
    return dept?.code ?? '';
  }

  private async _getSecondaryDepartments(req: AuthenticatedRequest): Promise<string[]> {
    const entries = req.user?.secondaryDepartments;
    if (!entries || entries.length === 0) return [];
    const deptIds = entries.map(e => e.departmentId);
    const depts = await prisma.department.findMany({
      where: { id: { in: deptIds } },
      select: { code: true },
    });
    return depts.map(d => d.code);
  }

  async stream(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { message, history, confirm_tool, confirm_params } = req.body as {
        message?: string;
        history?: Array<{ role: string; content: string }>;
        confirm_tool?: string;
        confirm_params?: Record<string, unknown>;
      };

      if (!message && !confirm_tool) {
        throw new ValidationError('Thiếu nội dung tin nhắn hoặc confirm_tool');
      }

      const role = req.user?.role ?? '';
      const department = await this._getDepartment(req);
      const secondaryDepartments = await this._getSecondaryDepartments(req);
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
}

export default new AgentController();
