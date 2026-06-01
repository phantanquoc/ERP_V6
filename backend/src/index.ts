import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import path from 'path';
import pg from 'pg';
import { env, isProduction } from '@config/env';
import logger from '@config/logger';
import { swaggerSpec } from '@config/swagger';
import { errorHandler, notFoundHandler } from '@middlewares/errorHandler';
import { registerRoutes } from '@routes/index';
import { startSnapshotCleanup } from '@utils/snapshotCleanup';
import { setPgNotifier, resetLocalEmbeddingCache } from '@services/faceAttendanceService';
import { initWebSocket, shutdownWebSocket } from '@services/wsManager';

const app: Express = express();

// CORS — hỗ trợ nhiều origin (phân cách bằng dấu phẩy trong CORS_ORIGIN)
const allowedOrigins = env.CORS_ORIGIN.split(',').map((o) => o.trim());

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      'frame-ancestors': ["'self'", ...allowedOrigins],
    },
  },
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
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

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Swagger API Documentation (chỉ bật ở development)
if (!isProduction) {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'ERP System - API Documentation',
  }));
  app.get('/api-docs.json', (_req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });
}

// API Routes
registerRoutes(app);

// 404 handler
app.use(notFoundHandler);

// Error handler (must be last)
app.use(errorHandler);

// Catch unhandled errors
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Rejection:', reason);
});

// Start server
const PORT = env.PORT;
const server = app.listen(PORT, () => {
  logger.info(`Server is running on http://localhost:${PORT}`);
  logger.info(`Environment: ${env.NODE_ENV}`);
  startSnapshotCleanup();
  initWebSocket(server);
});

server.on('error', (error) => {
  logger.error('Server error:', error);
});

// ─── Postgres LISTEN/NOTIFY for embedding cache invalidation ─────────────────
// A dedicated pg client subscribes to face_profile_changed so that when any
// backend instance calls invalidateEmbeddingCache(), all instances reset their
// local embedding caches within notification delivery latency.
const listenClient = new pg.Client({ connectionString: env.DATABASE_URL });

listenClient.connect()
  .then(async () => {
    await listenClient.query('LISTEN face_profile_changed');
    logger.info('LISTEN registered on channel face_profile_changed');

    // Wire up the notifier so invalidateEmbeddingCache() can NOTIFY all instances
    setPgNotifier(async () => {
      await listenClient.query("NOTIFY face_profile_changed, 'invalidate'");
    });

    listenClient.on('notification', (msg: { channel: string; payload?: string }) => {
      if (msg.channel === 'face_profile_changed') {
        logger.debug('Received face_profile_changed notification — resetting local embedding cache');
        resetLocalEmbeddingCache();
      }
    });
  })
  .catch((err: Error) => {
    logger.error('Failed to connect pg LISTEN client:', err);
  });

async function gracefulShutdown(signal: string) {
  logger.info(`${signal} received — shutting down gracefully`);
  shutdownWebSocket();
  try {
    await listenClient.query('UNLISTEN face_profile_changed');
    await listenClient.end();
    logger.info('pg LISTEN client disconnected');
  } catch (err) {
    logger.warn('Error during pg LISTEN client shutdown:', err);
  }
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

export default app;

