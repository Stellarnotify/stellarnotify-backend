import { Router, Request, Response } from 'express';
import {
  getBySubscription,
  getFailed,
  getNotificationById,
} from '../../db/notificationRepo';
import { requireApiKey } from '../middleware/auth';

const router = Router();

/**
 * GET /api/notifications/by-subscription/:id
 * Returns a paginated list of notifications for a given subscription.
 * Query params: limit (default 50), offset (default 0)
 */
router.get('/by-subscription/:id', requireApiKey, async (req: Request, res: Response) => {
  const { id } = req.params;
  const limit = Math.min(parseInt((req.query.limit as string) ?? '50', 10), 200);
  const offset = parseInt((req.query.offset as string) ?? '0', 10);

  const notifications = await getBySubscription(id, limit, offset);
  res.status(200).json({ notifications, limit, offset });
});

/**
 * GET /api/notifications/failed
 * Admin: returns the most recent permanently failed notifications.
 * Query params: limit (default 100)
 */
router.get('/failed', requireApiKey, async (req: Request, res: Response) => {
  const limit = Math.min(parseInt((req.query.limit as string) ?? '100', 10), 500);
  const notifications = await getFailed(limit);
  res.status(200).json({ notifications });
});

/**
 * GET /api/notifications/:id
 * Returns a single notification record by ID.
 */
router.get('/:id', requireApiKey, async (req: Request, res: Response) => {
  const notification = await getNotificationById(req.params.id);
  if (!notification) {
    res.status(404).json({ error: 'Notification not found' });
    return;
  }
  res.status(200).json({ notification });
});

export default router;
