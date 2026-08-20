import { publish } from './redisClient';
import { NotificationRecord } from '../types';
import { logger } from '../logger';

/**
 * Derives the Redis pub/sub channel name for a given subscription.
 * Consumers (SSE connections) subscribe to this channel to receive
 * real-time in-app notifications.
 */
export function inAppChannel(subscriptionId: string): string {
  return `stellarnotify:inapp:${subscriptionId}`;
}

/**
 * Publishes a notification to the in-app Redis pub/sub channel.
 * SSE route handlers subscribe to this channel per connected client.
 *
 * @param notification - The notification record to broadcast.
 */
export async function broadcastInApp(
  notification: NotificationRecord,
): Promise<void> {
  const channel = inAppChannel(notification.subscriptionId);
  const message = JSON.stringify(notification);

  await publish(channel, message);

  logger.info('InApp notification broadcast', {
    notificationId: notification.id,
    subscriptionId: notification.subscriptionId,
    channel,
  });
}
