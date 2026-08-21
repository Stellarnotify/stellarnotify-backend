import { logger } from '../logger';
import { NotificationRecord, Subscription, WebhookPayload } from '../types';
import { markDelivered, markFailed, markRetrying } from '../db/notificationRepo';
import { deliverWebhook } from './webhookClient';

export const MAX_RETRIES = parseInt(process.env.WEBHOOK_MAX_RETRIES ?? '5', 10);

/**
 * Builds the webhook payload from a notification record and its subscription.
 */
function buildPayload(
  notification: NotificationRecord,
  subscription: Subscription,
): WebhookPayload {
  return {
    notificationId: notification.id,
    subscriptionId: notification.subscriptionId,
    contractId: subscription.contractId,
    eventTimestamp: notification.eventPayload.ledgerClosedAt,
    topics: notification.eventPayload.topics,
    data: notification.eventPayload.data,
    txHash: notification.eventPayload.txHash,
    deliveredAt: new Date().toISOString(),
  };
}

/**
 * Calculates the next retry delay using exponential back-off.
 * Attempt 1 → 30 s, 2 → 60 s, 3 → 120 s, 4 → 240 s, 5 → 480 s.
 * Capped at 1 hour.
 */
export function nextRetryDelay(attempt: number): number {
  return Math.min(30_000 * Math.pow(2, attempt - 1), 3_600_000);
}

/**
 * Attempts to deliver a webhook notification to the subscriber's endpoint.
 * On failure it schedules a retry (up to MAX_RETRIES), then marks permanent failure.
 *
 * @param notification - The notification record to dispatch.
 * @param subscription - The owning subscription (provides endpoint URL and metadata).
 * @returns Resolves when delivery or scheduling is complete — never throws.
 */
export async function dispatchWebhook(
  notification: NotificationRecord,
  subscription: Subscription,
): Promise<void> {
  if (!subscription.endpointUrl) {
    await markFailed(notification.id, 'No endpoint URL configured');
    logger.warn('Webhook dispatch skipped — no endpoint URL', {
      notificationId: notification.id,
    });
    return;
  }

  const payload = buildPayload(notification, subscription);
  const attempt = notification.attempts + 1;

  try {
    await deliverWebhook(subscription.endpointUrl, payload);
    await markDelivered(notification.id);
    logger.info('Webhook delivered', {
      notificationId: notification.id,
      attempt,
      url: subscription.endpointUrl,
    });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    logger.warn('Webhook delivery failed', {
      notificationId: notification.id,
      attempt,
      error: errorMsg,
    });

    if (attempt >= MAX_RETRIES) {
      await markFailed(notification.id, errorMsg);
      logger.error('Webhook permanently failed — max retries reached', {
        notificationId: notification.id,
        maxRetries: MAX_RETRIES,
      });
    } else {
      const delay = nextRetryDelay(attempt);
      const nextRetryAt = new Date(Date.now() + delay);
      await markRetrying(notification.id, attempt, nextRetryAt, errorMsg);
      logger.info('Webhook scheduled for retry', {
        notificationId: notification.id,
        attempt,
        nextRetryAt: nextRetryAt.toISOString(),
      });
    }
  }
}
