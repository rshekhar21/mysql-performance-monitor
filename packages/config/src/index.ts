import { z } from 'zod';

const nodeEnvSchema = z.enum(['development', 'test', 'production']).default('development');

export const baseEnvSchema = z.object({
  NODE_ENV: nodeEnvSchema,
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
  APP_DATABASE_URL: z.string().url(),
  CREDENTIAL_ENCRYPTION_KEY: z.string().min(32),
  JWT_SECRET: z.string().min(32)
});

export const apiEnvSchema = baseEnvSchema.extend({
  API_PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  AUTH_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(10)
});

export const collectorEnvSchema = baseEnvSchema.extend({
  COLLECTOR_HEALTH_PORT: z.coerce.number().int().min(1).max(65535).default(4100),
  COLLECTOR_CONCURRENCY: z.coerce.number().int().min(1).max(100).default(5),
  COLLECT_STATUS_INTERVAL_MS: z.coerce.number().int().positive().default(15_000),
  COLLECT_INNODB_INTERVAL_MS: z.coerce.number().int().positive().default(30_000),
  COLLECT_STORAGE_INTERVAL_MS: z.coerce.number().int().positive().default(300_000),
  COLLECT_TABLE_SIZE_INTERVAL_MS: z.coerce.number().int().positive().default(900_000),
  COLLECT_QUERY_DIGEST_INTERVAL_MS: z.coerce.number().int().positive().default(60_000),
  COLLECT_REPLICATION_INTERVAL_MS: z.coerce.number().int().positive().default(30_000),
  RETENTION_HIGH_FREQUENCY_DAYS: z.coerce.number().int().positive().default(30),
  RETENTION_STORAGE_DAYS: z.coerce.number().int().positive().default(1095),
  RETENTION_COLLECTOR_RUN_DAYS: z.coerce.number().int().positive().default(90)
});

export const webEnvSchema = z.object({
  VITE_API_BASE_URL: z.string().url().default('http://localhost:4000')
});

export type ApiConfig = z.infer<typeof apiEnvSchema>;
export type CollectorConfig = z.infer<typeof collectorEnvSchema>;
export type WebConfig = z.infer<typeof webEnvSchema>;

export function parseApiConfig(env: NodeJS.ProcessEnv): ApiConfig {
  return apiEnvSchema.parse(env);
}

export function parseCollectorConfig(env: NodeJS.ProcessEnv): CollectorConfig {
  return collectorEnvSchema.parse(env);
}

export function parseWebConfig(env: Record<string, string | undefined>): WebConfig {
  return webEnvSchema.parse(env);
}
