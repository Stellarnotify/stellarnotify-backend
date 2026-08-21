import { Router, Request, Response } from 'express';
import Redis from 'ioredis';
import { logger } from '../../logger';

const router = Router();

const KEEP_ALIVE_INTERVAL_MS = 20_000;

/**
 * GET /sse/:subscriptionId
 * Opens a Server-Sent Events stream for a given subscription.
 * The client receives real-time notifications published to the
 * corresponding Redis pub/sub channel.
 *
 * Keep-alive comment frames are sent every 20 s to prevent proxies
 * and browsers from closing idle connections.
 */
router.get('/:subscriptionId', (req: Request, res: Response) => {
  const { subscriptionId } = req.params;
  const channel = `stellarnotify:inapp:${subscriptionId}`;

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // disable Nginx buffering
  res.flushHeaders();

  // Create a dedicated subscriber client per connection
  const subscriber = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379');

  subscriber.on('error', (err: Error) => {
    logger.error('SSE Redis subscriber error', {
      subscriptionId,
      error: err.message,
    });
  });

  subscriber.subscribe(channel, (err) => {
    if (err) {
      logger.error('SSE subscribe failed', { subscriptionId, error: err.message });
      res.end();
      return;
    }
    logger.info('SSE client connected', { subscriptionId, channel });
  });

  subscriber.on('message', (_channel: string, message: string) => {
    res.write(`data: ${message}\n\n`);
  });

  // Keep-alive ping — sends an SSE comment frame every 20 s
  const keepAlive = setInterval(() => {
    res.write(': ping\n\n');
  }, KEEP_ALIVE_INTERVAL_MS);

  // Cleanup on client disconnect
  req.on('close', () => {
    clearInterval(keepAlive);
    subscriber.unsubscribe(channel).finally(() => {
      subscriber.quit().catch(() => undefined);
    });
    logger.info('SSE client disconnected', { subscriptionId });
  });
});

export default router;
