import { Pool } from 'pg';
import { getPool } from './client';
import { NotificationRecord, NotificationChannel, NotificationStatus, SorobanEvent } from '../types';

/** Maps a raw DB row to a NotificationRecord object. */
function rowToNotification(row: Record<string, unknown>): NotificationRecord {
  return {
    id: row.id as string,
    subscriptionId: row.subscription_id as string,
    eventPayload: row.event_payload as SorobanEvent,
    channel: row.channel as NotificationChannel,
    status: row.status as NotificationStatus,
    attempts: row.attempts as number,
    nextRetryAt: row.next_retry_at ? (row.next_retry_at as Date).toISOString() : undefined,
    lastError: (row.last_error as string) ?? undefined,
    createdAt: (row.created_at as Date).toISOString(),
    updatedAt: (row.updated_at as Date).toISOString(),
  };
}

/**
 * Persists a new notification record in Pending status.
 */
export async function createNotification(
  data: Pick<NotificationRecord, 'subscriptionId' | 'eventPayload' | 'channel'>,
  db: Pool = getPool(),
): Promise<NotificationRecord> {
  const { rows } = await db.query(
    `INSERT INTO notifications (subscription_id, event_payload, channel)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [data.subscriptionId, JSON.stringify(data.eventPayload), data.channel],
  );
  return rowToNotification(rows[0]);
}

/**
 * Returns all notifications in Pending or Retrying status that are due for
 * delivery (next_retry_at is null or in the past).
 */
export async function getPending(
  limit = 100,
  db: Pool = getPool(),
): Promise<NotificationRecord[]> {
  const { rows } = await db.query(
    `SELECT * FROM notifications
     WHERE status IN ('Pending', 'Retrying')
       AND (next_retry_at IS NULL OR next_retry_at <= NOW())
     ORDER BY created_at ASC
     LIMIT $1`,
    [limit],
  );
  return rows.map(rowToNotification);
}

/**
 * Marks a notification as successfully delivered.
 */
export async function markDelivered(
  id: string,
  db: Pool = getPool(),
): Promise<void> {
  await db.query(
    `UPDATE notifications
     SET status = 'Delivered', updated_at = NOW()
     WHERE id = $1`,
    [id],
  );
}

/**
 * Marks a notification as permanently failed.
 */
export async function markFailed(
  id: string,
  lastError: string,
  db: Pool = getPool(),
): Promise<void> {
  await db.query(
    `UPDATE notifications
     SET status = 'Failed', last_error = $2, updated_at = NOW()
     WHERE id = $1`,
    [id, lastError],
  );
}

/**
 * Schedules a notification for retry with exponential back-off.
 */
export async function markRetrying(
  id: string,
  attempts: number,
  nextRetryAt: Date,
  lastError: string,
  db: Pool = getPool(),
): Promise<void> {
  await db.query(
    `UPDATE notifications
     SET status = 'Retrying',
         attempts = $2,
         next_retry_at = $3,
         last_error = $4,
         updated_at = NOW()
     WHERE id = $1`,
    [id, attempts, nextRetryAt, lastError],
  );
}

/**
 * Returns paginated notifications for a given subscription.
 */
export async function getBySubscription(
  subscriptionId: string,
  limit = 50,
  offset = 0,
  db: Pool = getPool(),
): Promise<NotificationRecord[]> {
  const { rows } = await db.query(
    `SELECT * FROM notifications
     WHERE subscription_id = $1
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`,
    [subscriptionId, limit, offset],
  );
  return rows.map(rowToNotification);
}

/**
 * Returns all permanently failed notifications, most recent first.
 */
export async function getFailed(
  limit = 100,
  db: Pool = getPool(),
): Promise<NotificationRecord[]> {
  const { rows } = await db.query(
    `SELECT * FROM notifications
     WHERE status = 'Failed'
     ORDER BY updated_at DESC
     LIMIT $1`,
    [limit],
  );
  return rows.map(rowToNotification);
}

/**
 * Returns a single notification by ID, or null if not found.
 */
export async function getNotificationById(
  id: string,
  db: Pool = getPool(),
): Promise<NotificationRecord | null> {
  const { rows } = await db.query(
    `SELECT * FROM notifications WHERE id = $1`,
    [id],
  );
  return rows.length ? rowToNotification(rows[0]) : null;
}
