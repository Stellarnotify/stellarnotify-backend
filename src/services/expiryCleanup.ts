import { getPool } from '../db/client';
import { logger } from '../logger';

const CLEANUP_INTERVAL_MS = parseInt(process.env.EXPIRY_CLEANUP_INTERVAL_MS ?? '3600000', 10); // Default: 1 hour

/**
 * Deactivates all subscriptions where expires_at is in the past.
 * Returns the count of deactivated subscriptions.
 */
export async function deactivateExpiredSubscriptions(): Promise<number> {
  const pool = getPool();
  
  const { rowCount } = await pool.query(
    `UPDATE subscriptions
     SET active = FALSE, updated_at = NOW()
     WHERE active = TRUE
       AND expires_at IS NOT NULL
       AND expires_at < NOW()`,
  );
  
  return rowCount ?? 0;
}

/**
 * Runs the expiry cleanup job once.
 * Deactivates expired subscriptions and logs the count.
 */
export async function runExpiryCleanup(): Promise<void> {
  try {
    const deactivatedCount = await deactivateExpiredSubscriptions();
    
    if (deactivatedCount > 0) {
      logger.info('Expiry cleanup completed', {
        deactivatedCount,
        timestamp: new Date().toISOString(),
      });
    } else {
      logger.debug('Expiry cleanup completed — no expired subscriptions found', {
        timestamp: new Date().toISOString(),
      });
    }
  } catch (err) {
    logger.error('Expiry cleanup job failed', {
      error: err instanceof Error ? err.message : String(err),
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Starts the periodic expiry cleanup job.
 * Returns an interval handle that can be used to stop the job.
 */
export function startExpiryCleanupJob(): NodeJS.Timeout {
  logger.info('Starting expiry cleanup job', {
    intervalMs: CLEANUP_INTERVAL_MS,
    intervalHours: CLEANUP_INTERVAL_MS / 3600000,
  });

  // Run immediately on startup
  runExpiryCleanup().catch((err) => {
    logger.error('Initial expiry cleanup failed', {
      error: err instanceof Error ? err.message : String(err),
    });
  });

  // Then run periodically
  const interval = setInterval(() => {
    runExpiryCleanup().catch((err) => {
      logger.error('Scheduled expiry cleanup failed', {
        error: err instanceof Error ? err.message : String(err),
      });
    });
  }, CLEANUP_INTERVAL_MS);

  return interval;
}

/**
 * Stops the periodic expiry cleanup job.
 */
export function stopExpiryCleanupJob(interval: NodeJS.Timeout): void {
  clearInterval(interval);
  logger.info('Expiry cleanup job stopped');
}
