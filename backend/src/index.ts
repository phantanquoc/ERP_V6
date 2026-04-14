import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import path from 'path';
import { env, isProduction } from '@config/env';
import logger from '@config/logger';
import { swaggerSpec } from '@config/swagger';
import { errorHandler, notFoundHandler } from '@middlewares/errorHandler';
import { registerRoutes } from '@routes/index';
import { globalRateLimiter } from '@middlewares/rateLimiter';
import { initWebSocket, closeWebSocket } from '@services/websocket';
import { broadcast } from '@services/websocket';
import debugRoutes from '@routes/debugRoutes';
import prisma from '@config/database';
import attendanceService from '@services/attendanceService';
import notificationService from '@services/notificationService';
import meetingService from '@services/meetingService';
import systemSettingService from '@services/systemSettingService';
import { NotificationType } from '@types';

const app: Express = express();

// Global rate limiting — apply before all routes
app.use(globalRateLimiter);

// ─── Middleware ──────────────────────────────────────────────────────────────
app.use(helmet());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// CORS — hỗ trợ nhiều origin (phân cách bằng dấu phẩy trong CORS_ORIGIN)
const allowedOrigins = env.CORS_ORIGIN.split(',').map((o) => o.trim());
app.use(
  cors({
    origin: allowedOrigins.length === 1 ? allowedOrigins[0] : allowedOrigins,
    credentials: true,
  })
);

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on('finish', () => {
    if (req.originalUrl === '/health' || res.statusCode === 304) return;
    const duration = Date.now() - start;
    logger.info(`${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`);
  });
  next();
});

// Serve static files from uploads directory (use absolute path for production)
const uploadsPath = path.resolve(process.cwd(), 'uploads');
app.use('/uploads', express.static(uploadsPath));

// ─── Health Check ───────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// ─── Swagger API Documentation (non-production only) ─────────────────────────
if (!isProduction) {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'ERP System - API Documentation',
  }));
  app.get('/api-docs.json', (_req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });

  // ⚠️ SECURITY: Debug routes chỉ available trong development — KHÔNG mount production
  app.use('/api/debug', debugRoutes);
}

// ─── API Routes ─────────────────────────────────────────────────────────────
registerRoutes(app);

// ─── Error Handlers ─────────────────────────────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

// ─── Unhandled Errors ───────────────────────────────────────────────────────
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Rejection:', reason);
});

// ─── Graceful Shutdown ───────────────────────────────────────────────────────
let server: ReturnType<typeof app.listen>;

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

function gracefulShutdown() {
  logger.info('Shutting down gracefully...');
  closeWebSocket();
  if (server) {
    server.close(() => {
      logger.info('HTTP server closed');
      process.exit(0);
    });
  }

  // Force exit after 10 seconds
  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10_000);
}

// ─── Export app for testing (supertest) ─────────────────────────────────────
export default app;

// ─── Start Server ────────────────────────────────────────────────────────────
// Skip in test environment — supertest creates its own server on a random port
if (process.env.NODE_ENV !== 'test') {
  const PORT = env.PORT;
  server = app.listen(PORT, () => {
  logger.info(`🚀 Server is running on http://localhost:${PORT}`);
  logger.info(`Environment: ${env.NODE_ENV}`);

  // Initialize WebSocket server on the same HTTP server
  initWebSocket(server);

  // ─── Attendance Reminder Scheduler ──────────────────────────────────────────
  // Đọc cài đặt nhắc nhở từ DB (có cache) thay vì hardcode thời gian
  const checkAttendanceReminders = async () => {
    try {
      const settings = await systemSettingService.getAttendanceReminderSettings();
      const now = new Date();
      const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

      // Nhắc nhở chấm công vào (mặc định 08:30)
      if (currentTime === settings.checkinReminder) {
        const absent = await attendanceService.getAbsentEmployees(now);
        for (const emp of absent) {
          await notificationService.createNotification({
            userId: emp.userId,
            type: NotificationType.ATTENDANCE_REMINDER,
            title: '⏰ Nhắc nhở chấm công',
            message: `Bạn chưa chấm công vào. Vui lòng điểm danh ngay. (Nhắc nhở lúc ${settings.checkinReminder})`,
          });
        }
        broadcast({ type: 'ATTENDANCE_SUMMARY_CHANGED' });
      }

      // Nhắc nhở chấm công ra (mặc định 17:30)
      if (currentTime === settings.checkoutReminder) {
        const present = await attendanceService.getPresentNotOutEmployees(now);
        for (const emp of present) {
          await notificationService.createNotification({
            userId: emp.employee.userId,
            type: NotificationType.ATTENDANCE_REMINDER,
            title: '⏰ Nhắc nhở chấm công ra',
            message: `Bạn chưa chấm công ra. Vui lòng điểm danh trước khi rời văn phòng. (Nhắc nhở lúc ${settings.checkoutReminder})`,
          });
        }
      }

      // Tự động ghi nhận vắng mặt (mặc định 22:00)
      if (currentTime === settings.autoAbsent) {
        const absent = await attendanceService.getAbsentEmployees(now);
        for (const emp of absent) {
          await prisma.attendance.create({
            data: {
              employeeId: emp.id,
              attendanceDate: now,
              status: 'ABSENT',
            },
          });
          await notificationService.createNotification({
            userId: emp.userId,
            type: NotificationType.ATTENDANCE_REMINDER,
            title: 'Chấm công vắng mặt',
            message: 'Bạn đã được ghi nhận vắng mặt hôm nay.',
          });
        }
        broadcast({ type: 'ATTENDANCE_SUMMARY_CHANGED' });
      }
    } catch (error) {
      logger.error('Attendance reminder scheduler error:', error);
    }
  };

  setInterval(checkAttendanceReminders, 60_000);

  // ─── Meeting Reminder Scheduler ───────────────────────────────────────────
  setInterval(async () => {
    try { await meetingService.checkUpcomingReminders(); }
    catch(e) { logger.error('Meeting reminder check failed:', e); }
  }, 60_000);
});
} // end if (NODE_ENV !== 'test')
