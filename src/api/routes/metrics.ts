import { Router, Request, Response } from 'express';
import { register } from '../../services/metrics';

const router = Router();

/**
 * GET /metrics
 * Returns Prometheus-formatted metrics for scraping.
 * No authentication required — typically scraped by internal monitoring systems.
 */
router.get('/', async (_req: Request, res: Response) => {
  try {
    res.set('Content-Type', register.contentType);
    const metrics = await register.metrics();
    res.status(200).send(metrics);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({
      error: 'Failed to generate metrics',
      detail: message,
    });
  }
});

export default router;
