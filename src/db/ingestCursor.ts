import { Pool } from 'pg';
import { getPool } from './client';
import { logger } from '../logger';

/**
 * Reads the last successfully ingested ledger sequence number from the DB.
 * Returns 0 if no cursor row exists yet.
 */
export async function readCursor(db: Pool = getPool()): Promise<number> {
  const { rows } = await db.query(
    `SELECT last_ledger FROM ingest_cursor WHERE id = 1`,
  );
  const ledger = rows.length ? (rows[0].last_ledger as number) : 0;
  logger.debug('Read ingest cursor', { lastLedger: ledger });
  return ledger;
}

/**
 * Persists the latest successfully ingested ledger sequence number.
 * Uses an upsert so it works even if the row was never seeded.
 */
export async function writeCursor(
  lastLedger: number,
  db: Pool = getPool(),
): Promise<void> {
  await db.query(
    `INSERT INTO ingest_cursor (id, last_ledger, updated_at)
     VALUES (1, $1, NOW())
     ON CONFLICT (id) DO UPDATE
       SET last_ledger = EXCLUDED.last_ledger,
           updated_at  = NOW()`,
    [lastLedger],
  );
  logger.debug('Wrote ingest cursor', { lastLedger });
}
