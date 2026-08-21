import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { z } from 'zod';
import { getPool } from '../../db/client';
import {
  upsertSubscription,
  deactivateSubscription,
  getByOwner,
  getActiveByContract,
  getSubscriptionById,
} from '../../db/subscriptionRepo';
import { requireApiKey } from '../middleware/auth';

const router = Router();

const endpointSchema = z.object({
  url: z
    .string({ required_error: 'url is required' })
    .url('url must be a valid URL')
    .refine(
      (u) => u.startsWith('http://') || u.startsWith('https://'),
      'url must use http or https',
    ),
});

/**
 * POST /api/subscriptions/endpoints
 * Registers a webhook URL and stores a SHA-256 hash → URL mapping.
 * Returns the endpoint hash for use when creating subscriptions.
 */
router.post('/endpoints', requireApiKey, async (req: Request, res: Response) => {
  const result = endpointSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: result.error.flatten().fieldErrors });
    return;
  }

  const { url } = result.data;
  const hash = crypto.createHash('sha256').update(url).digest('hex');

  await getPool().query(
    `INSERT INTO endpoint_registry (hash, url)
     VALUES ($1, $2)
     ON CONFLICT (hash) DO NOTHING`,
    [hash, url],
  );

  res.status(201).json({ hash, url });
});

/**
 * GET /api/subscriptions/by-owner/:owner
 * Returns all subscriptions belonging to a wallet address.
 */
router.get('/by-owner/:owner', requireApiKey, async (req: Request, res: Response) => {
  const { owner } = req.params;
  const subscriptions = await getByOwner(owner);
  res.status(200).json({ subscriptions });
});

/**
 * GET /api/subscriptions/by-contract/:contractId
 * Returns all active subscriptions watching a given contract.
 */
router.get('/by-contract/:contractId', requireApiKey, async (req: Request, res: Response) => {
  const { contractId } = req.params;
  const subscriptions = await getActiveByContract(contractId);
  res.status(200).json({ subscriptions });
});

/**
 * GET /api/subscriptions/:id
 * Returns a single subscription by ID.
 */
router.get('/:id', requireApiKey, async (req: Request, res: Response) => {
  const subscription = await getSubscriptionById(req.params.id);
  if (!subscription) {
    res.status(404).json({ error: 'Subscription not found' });
    return;
  }
  res.status(200).json({ subscription });
});

/**
 * DELETE /api/subscriptions/:id
 * Admin: deactivates a subscription.
 */
router.delete('/:id', requireApiKey, async (req: Request, res: Response) => {
  const found = await deactivateSubscription(req.params.id);
  if (!found) {
    res.status(404).json({ error: 'Subscription not found' });
    return;
  }
  res.status(200).json({ message: 'Subscription deactivated' });
});

export default router;
