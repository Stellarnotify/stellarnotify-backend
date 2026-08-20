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
 * Closes the publisher connection gracefully.
 */
export async function closePublisher(): Promise<void> {
  if (publisher) {
    await publisher.quit();
    publisher = null;
    logger.info('Redis publisher closed');
  }
}
