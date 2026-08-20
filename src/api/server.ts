import express, { Application, Request, Response, NextFunction } from 'express';
import { logger } from '../logger';
import healthRouter from './routes/health';

/**
 * Creates and configures the Express application instance.
 * Routes are mounted separately so the factory stays testable.
 */
export function createApp(): Application {
  const app = express();

  // Parse JSON request bodies
  app.use(express.json());

  // Routes
  app.use('/health', healthRouter);

  // 404 handler — must be registered after all routes
  app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: 'Not found' });
  });

  // Global error handler — must be last and have 4 parameters
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    logger.error('Unhandled error', { error: err.message, stack: err.stack });
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}
