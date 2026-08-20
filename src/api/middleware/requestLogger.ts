import { Request, Response, NextFunction } from 'express';
import { logger } from '../../logger';

/**
 * Middleware that logs each HTTP request with method, path, status code,
 * and response duration in milliseconds.
 */
export function requestLogger(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('HTTP request', {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      durationMs: duration,
    });
  });

  next();
}
