import { Router, Request, Response } from 'express';
import { getPool } from '../../db/client';

const router = Router();

/**
 * GET /health
 * Returns the service status and DB connectivity check.
 * No authentication required — used by load balancers and uptime monitors.
 */
router.get('/', async (_req: Request, res: Response) => {
  try {
    await getPool().query('SELECT 1');
    res.status(200).json({ status: 'ok', db: 'connected' });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(503).json({ status: 'error', db: 'disconnected', detail: message });
  }
});

export default router;
