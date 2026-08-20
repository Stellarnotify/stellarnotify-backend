import { Pool } from 'pg';
import { logger } from '../logger';

let pool: Pool | null = null;

/**
 * Returns the singleton pg Pool instance.
 * Initialised lazily on first call.
 */
export function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
    });

    pool.on('error', (err) => {
      logger.error('Unexpected PostgreSQL pool error', { error: err.message });
    });
  }

  return pool;
}

/**
 * Verifies database connectivity by running a lightweight query.
 * Throws if the connection cannot be established.
 */
export async function connectDb(): Promise<void> {
  const client = await getPool().connect();
  try {
    await client.query('SELECT 1');
    logger.info('PostgreSQL connection established');
  } finally {
    client.release();
  }
}

/**
 * Gracefully drains and closes the connection pool.
 */
export async function closeDb(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    logger.info('PostgreSQL pool closed');
  }
}
