import { Request, Response, NextFunction } from 'express';
import { logger } from '../../logger';

/**
 * Global Express error handler.
 * Ensures all error responses are JSON with the correct Content-Type header.
 * Must be registered as the last middleware in the chain (4-argument signature).
 */
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void {
  logger.error('Unhandled error', { error: err.message, stack: err.stack });
  res
    .status(500)
    .setHeader('Content-Type', 'application/json')
    .json({ error: 'Internal server error' });
}

/**
 * 404 handler for unmatched routes.
 * Must be registered after all route definitions.
 */
export function notFoundHandler(_req: Request, res: Response): void {
  res
    .status(404)
    .setHeader('Content-Type', 'application/json')
    .json({ error: 'Not found' });
}
