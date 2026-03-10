import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import { env } from '@config/env';
import logger from '@config/logger';
import { swaggerSpec } from '@config/swagger';
import { errorHandler, notFoundHandler } from '@middlewares/errorHandler';
import { registerRoutes } from '@routes/index';

const app: Express = express();

// Middleware
app.use(helmet());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(
  cors({
    origin: env.CORS_ORIGIN,
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

// Serve static files from uploads directory
app.use('/uploads', express.static('uploads'));

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Swagger API Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'ERP System - API Documentation',
}));
app.get('/api-docs.json', (_req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

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
  logger.info(`🚀 Server is running on http://localhost:${PORT}`);
  logger.info(`Environment: ${env.NODE_ENV}`);
});

server.on('error', (error) => {
  logger.error('Server error:', error);
});

export default app;

