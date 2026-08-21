import { Server } from 'http';
import { logger } from './logger';
import { closeDb } from './db/client';
import { closePublisher } from './services/redisClient';

const SHUTDOWN_TIMEOUT_MS = 10_000;

/**
 * Registers SIGTERM and SIGINT handlers that gracefully drain the HTTP server,
 * close the DB pool, and disconnect Redis before the process exits.
 *
 * @param server - The running HTTP server instance to close.
 */
export function registerShutdownHandlers(server: Server): void {
  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal} — starting graceful shutdown`);

    // Force-exit if shutdown takes too long
    const timer = setTimeout(() => {
      logger.error('Graceful shutdown timed out — forcing exit');
      process.exit(1);
    }, SHUTDOWN_TIMEOUT_MS);

    timer.unref();

    try {
      // Stop accepting new connections
      await new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      });
      logger.info('HTTP server closed');

      // Close DB pool
      await closeDb();

      // Close Redis publisher
      await closePublisher();

      logger.info('Graceful shutdown complete');
      process.exit(0);
    } catch (err) {
      logger.error('Error during shutdown', {
        error: err instanceof Error ? err.message : String(err),
      });
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}
