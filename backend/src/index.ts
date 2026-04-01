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
import debugRoutes from '@routes/debugRoutes';

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
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

function gracefulShutdown() {
  logger.info('Shutting down gracefully...');
  closeWebSocket();
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });

  // Force exit after 10 seconds
  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10_000);
}

// ─── Start Server ────────────────────────────────────────────────────────────
const PORT = env.PORT;
const server = app.listen(PORT, () => {
  logger.info(`🚀 Server is running on http://localhost:${PORT}`);
  logger.info(`Environment: ${env.NODE_ENV}`);

  // Initialize WebSocket server on the same HTTP server
  initWebSocket(server);
});

server.on('error', (error) => {
  logger.error('Server error:', error);
});

export default app;
