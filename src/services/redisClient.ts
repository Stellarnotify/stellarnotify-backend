import Redis from 'ioredis';
import { logger } from '../logger';

let publisher: Redis | null = null;

/**
 * Returns the singleton Redis publisher client.
 * Initialised lazily on first call.
 */
export function getPublisher(): Redis {
  if (!publisher) {
    publisher = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
      lazyConnect: false,
      enableReadyCheck: true,
      maxRetriesPerRequest: 3,
    });

    publisher.on('connect', () => logger.info('Redis publisher connected'));
    publisher.on('error', (err: Error) =>
      logger.error('Redis publisher error', { error: err.message }),
    );
  }

  return publisher;
}

/**
 * Publishes a message to a Redis channel.
 *
 * @param channel - Redis pub/sub channel name
 * @param message - String payload to publish
 */
export async function publish(channel: string, message: string): Promise<void> {
  await getPublisher().publish(channel, message);
}

/**
 * Checks Redis connectivity by sending a PING command.
 * Returns true if Redis responds with PONG, false otherwise.
 */
export async function checkRedisHealth(): Promise<{ ok: boolean; error?: string }> {
  try {
    const response = await getPublisher().ping();
    return { ok: response === 'PONG' };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: message };
  }
}

/**
 * Closes the publisher connection gracefully.
 */
export async function closePublisher(): Promise<void> {
  if (publisher) {
    await publisher.quit();
    publisher = null;
    logger.info('Redis publisher closed');
  }
}
