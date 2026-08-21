import express, { Application } from 'express';
import healthRouter from './routes/health';
import subscriptionsRouter from './routes/subscriptions';
import notificationsRouter from './routes/notifications';
import sseRouter from './routes/sse';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';

/**
 * Creates and configures the Express application instance.
 * Routes are mounted separately so the factory stays testable.
 */
export function createApp(): Application {
  const app = express();

  // Parse JSON request bodies
  app.use(express.json());

  // Request logging
  app.use(requestLogger);

  // Routes
  app.use('/health', healthRouter);
  app.use('/api/subscriptions', subscriptionsRouter);
  app.use('/api/notifications', notificationsRouter);
  app.use('/sse', sseRouter);

  // 404 handler — must be registered after all routes
  app.use(notFoundHandler);

  // Global error handler — must be last
  app.use(errorHandler);

  return app;
}
