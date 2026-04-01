/**
 * Debug Routes — chỉ mount trong môi trường development
 * ─────────────────────────────────────────────────────────────────────────────
 * Các endpoint này KHÔNG được mount trong production.
 * Dùng để test WebSocket notifications, kiểm tra trạng thái kết nối, v.v.
 *
 * Mount point: /api/debug  (xem src/index.ts)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { Router, Response } from 'express';
import { AuthenticatedRequest } from '@types';
import { authenticate } from '@middlewares/auth';
import { NotificationService } from '@services/notificationService';
import { getConnectedCount, clientsByEmployee } from '@services/websocket';

const router = Router();
const notificationService = new NotificationService();

/* ─────────────────────────────────────────────────────────────────────────────
   GET /api/debug/ws-status
   Trả về số lượng clients đang kết nối WebSocket.
   Không cần auth — dùng để check nhanh server có WS chưa.
   ───────────────────────────────────────────────────────────────────────────── */
router.get('/ws-status', (_req, res: Response) => {
  const connected: Record<string, number> = {};
  clientsByEmployee.forEach((clients, empId) => {
    connected[empId] = clients.size;
  });

  res.json({
    success: true,
    data: {
      totalEmployees: getConnectedCount(),
      totalConnections: [...clientsByEmployee.values()].reduce((sum, s) => sum + s.size, 0),
      clients: connected,
    },
  });
});

/* ─────────────────────────────────────────────────────────────────────────────
   POST /api/debug/push-notification
   Trigger push notification đến chính user đang login (employeeId từ JWT).
   Dùng để test toàn bộ flow: DB insert → WS push → NotificationBell update.

   Body:
     { title: string, message: string, type?: string }

   Example curl:
     curl -s -X POST http://localhost:5000/api/debug/push-notification \
       -H "Authorization: Bearer <token>" \
       -H "Content-Type: application/json" \
       -d '{"title":"Test 🔔","message":"Hello từ debug endpoint!"}' | jq
   ───────────────────────────────────────────────────────────────────────────── */
router.post('/push-notification', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { title = 'Test Notification', message = 'Debug push', type = 'TASK' } =
      req.body as { title?: string; message?: string; type?: string };

    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    // Tạo notification thật trong DB + push qua WebSocket
    const notification = await notificationService.createNotification({
      userId,
      type,
      title,
      message,
    });

    res.status(201).json({
      success: true,
      message: 'Notification created and pushed via WebSocket',
      data: {
        notification,
        wsClients: getConnectedCount(),
      },
    });
  } catch (err) {
    const error = err as Error;
    res.status(500).json({ success: false, message: error.message });
  }
});

/* ─────────────────────────────────────────────────────────────────────────────
   POST /api/debug/push-to-employee
   Trigger push notification đến một employeeId bất kỳ (admin only).

   Body:
     { employeeId: string, title: string, message: string, type?: string }
   ───────────────────────────────────────────────────────────────────────────── */
router.post('/push-to-employee', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { employeeId, title = 'Test', message = 'Debug push', type = 'TASK' } =
      req.body as { employeeId?: string; title?: string; message?: string; type?: string };

    if (!employeeId) {
      res.status(400).json({ success: false, message: 'employeeId is required' });
      return;
    }

    // Cần userId của employee → lookup ngược
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const prisma = require('@config/database').default;
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: { userId: true },
    });

    if (!employee) {
      res.status(404).json({ success: false, message: `Employee ${employeeId} not found` });
      return;
    }

    const notification = await notificationService.createNotification({
      userId: employee.userId,
      type,
      title,
      message,
    });

    const isOnline = clientsByEmployee.has(employeeId);

    res.status(201).json({
      success: true,
      message: isOnline
        ? 'Notification pushed via WebSocket (employee is online)'
        : 'Notification saved to DB (employee is offline — will see on next login)',
      data: { notification, employeeOnline: isOnline },
    });
  } catch (err) {
    const error = err as Error;
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
