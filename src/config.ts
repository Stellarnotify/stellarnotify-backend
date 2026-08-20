import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3000').transform(Number),

  DATABASE_URL: z.string().url(),

  REDIS_URL: z.string().url(),

  STELLAR_RPC_URL: z.string().url(),
  STELLAR_NETWORK_PASSPHRASE: z.string(),

  API_KEY: z.string().min(1),

  WEBHOOK_TIMEOUT_MS: z.string().default('5000').transform(Number),
  WEBHOOK_MAX_RETRIES: z.string().default('5').transform(Number),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

/** Typed, validated application config derived from environment variables. */
export const config = parsed.data;

export type Config = typeof config;
