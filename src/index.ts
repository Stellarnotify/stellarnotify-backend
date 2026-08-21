import 'dotenv/config';
import { createApp } from './api/server';
import { connectDb } from './db/client';
import { getPublisher } from './services/redisClient';
import { registerShutdownHandlers } from './shutdown';
import { logger } from './logger';
import { config } from './config';

async function main(): Promise<void> {
  // Verify DB connectivity before accepting traffic
  await connectDb();

  // Initialise Redis publisher (eagerly connect so errors surface at startup)
  getPublisher();

  const app = createApp();

  const server = app.listen(config.PORT, () => {
    logger.info(`StellarNotify backend listening`, {
      port: config.PORT,
      env: config.NODE_ENV,
    });
  });

  registerShutdownHandlers(server);
}

main().catch((err) => {
  logger.error('Fatal startup error', {
    error: err instanceof Error ? err.message : String(err),
  });
  process.exit(1);
});
