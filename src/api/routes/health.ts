import { Router, Request, Response } from 'express';
import { getPool } from '../../db/client';
import { checkRedisHealth } from '../../services/redisClient';

const router = Router();

/**
 * GET /health
 * Returns the service status and DB connectivity check.
 * No authentication required — used by load balancers and uptime monitors.
 */
router.get('/', async (_req: Request, res: Response) => {
  try {
    // Check database connectivity
    await getPool().query('SELECT 1');
    
    // Check Redis connectivity
    const redisHealth = await checkRedisHealth();
    
    if (!redisHealth.ok) {
      res.status(503).json({
        status: 'error',
        db: 'ok',
        redis: 'error',
        detail: redisHealth.error ?? 'Redis connection failed',
      });
      return;
    }
    
    res.status(200).json({
      status: 'ok',
      db: 'ok',
      redis: 'ok',
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(503).json({
      status: 'error',
      db: 'error',
      redis: 'unknown',
      detail: message,
    });
  }
});

export default router;
