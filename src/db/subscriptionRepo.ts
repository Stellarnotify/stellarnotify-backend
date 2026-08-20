import { Pool } from 'pg';
import { getPool } from './client';
import { Subscription, NotificationChannel } from '../types';

/** Maps a raw DB row to a Subscription object. */
function rowToSubscription(row: Record<string, unknown>): Subscription {
  return {
    id: row.id as string,
    owner: row.owner as string,
    contractId: row.contract_id as string,
    topicFilters: (row.topic_filters as string[]) ?? [],
    channel: row.channel as NotificationChannel,
    endpointHash: (row.endpoint_hash as string) ?? undefined,
    active: row.active as boolean,
    expiresAt: row.expires_at ? (row.expires_at as Date).toISOString() : undefined,
    createdAt: (row.created_at as Date).toISOString(),
    updatedAt: (row.updated_at as Date).toISOString(),
  };
}

/**
 * Insert a new subscription or update an existing one (matched by owner +
 * contractId + channel). Returns the upserted subscription.
 */
export async function upsertSubscription(
  data: Pick<Subscription, 'owner' | 'contractId' | 'topicFilters' | 'channel' | 'endpointHash' | 'expiresAt'>,
  db: Pool = getPool(),
): Promise<Subscription> {
  const { rows } = await db.query(
    `INSERT INTO subscriptions
       (owner, contract_id, topic_filters, channel, endpoint_hash, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (owner, contract_id, channel)
     DO UPDATE SET
       topic_filters = EXCLUDED.topic_filters,
       endpoint_hash = EXCLUDED.endpoint_hash,
       expires_at    = EXCLUDED.expires_at,
       active        = TRUE,
       updated_at    = NOW()
     RETURNING *`,
    [
      data.owner,
      data.contractId,
      data.topicFilters,
      data.channel,
      data.endpointHash ?? null,
      data.expiresAt ?? null,
    ],
  );
  return rowToSubscription(rows[0]);
}

/**
 * Soft-deletes a subscription by setting active = FALSE.
 * Returns true if the row was found and updated.
 */
export async function deactivateSubscription(
  id: string,
  db: Pool = getPool(),
): Promise<boolean> {
  const { rowCount } = await db.query(
    `UPDATE subscriptions SET active = FALSE, updated_at = NOW() WHERE id = $1`,
    [id],
  );
  return (rowCount ?? 0) > 0;
}

/**
 * Returns all active, non-expired subscriptions watching a given contract.
 */
export async function getActiveByContract(
  contractId: string,
  db: Pool = getPool(),
): Promise<Subscription[]> {
  const { rows } = await db.query(
    `SELECT * FROM subscriptions
     WHERE contract_id = $1
       AND active = TRUE
       AND (expires_at IS NULL OR expires_at > NOW())
     ORDER BY created_at ASC`,
    [contractId],
  );
  return rows.map(rowToSubscription);
}

/**
 * Returns all subscriptions (active or inactive) belonging to a wallet owner.
 */
export async function getByOwner(
  owner: string,
  db: Pool = getPool(),
): Promise<Subscription[]> {
  const { rows } = await db.query(
    `SELECT * FROM subscriptions WHERE owner = $1 ORDER BY created_at DESC`,
    [owner],
  );
  return rows.map(rowToSubscription);
}

/**
 * Returns a single subscription by ID, or null if not found.
 */
export async function getSubscriptionById(
  id: string,
  db: Pool = getPool(),
): Promise<Subscription | null> {
  const { rows } = await db.query(
    `SELECT * FROM subscriptions WHERE id = $1`,
    [id],
  );
  return rows.length ? rowToSubscription(rows[0]) : null;
}
