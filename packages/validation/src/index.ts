import { z } from 'zod';

export const uuidParamSchema = z.object({
  id: z.string().uuid()
});

export const loginSchema = z.object({
  email: z.string().email().max(320),
  password: z.string().min(12).max(256)
});

export const monitoredServerCreateSchema = z.object({
  name: z.string().min(2).max(120),
  host: z.string().min(1).max(255),
  port: z.coerce.number().int().min(1).max(65535).default(3306),
  username: z.string().min(1).max(128),
  password: z.string().min(1).max(1024),
  sslMode: z.enum(['disabled', 'preferred', 'required']).default('preferred'),
  environment: z.string().min(1).max(64).optional(),
  enabled: z.boolean().default(true)
});

export const monitoredServerUpdateSchema = monitoredServerCreateSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field must be provided'
  });

export const metricQuerySchema = z.object({
  start: z.string().datetime().optional(),
  end: z.string().datetime().optional(),
  range: z.enum(['15m', '1h', '6h', '24h', '7d', '30d']).optional(),
  granularity: z.enum(['raw', '1m', '5m', '15m', '1h', '1d']).default('1m'),
  metricKeys: z
    .string()
    .transform((value) =>
      value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
    )
    .optional()
});

export const alertRuleCreateSchema = z.object({
  serverId: z.string().uuid().nullable().optional(),
  name: z.string().min(2).max(160),
  metricKey: z.string().min(2).max(120),
  warningThreshold: z.number().nullable().optional(),
  criticalThreshold: z.number().nullable().optional(),
  evaluationWindowSeconds: z.number().int().positive().default(300),
  minimumConsecutiveFailures: z.number().int().positive().default(1),
  cooldownSeconds: z.number().int().positive().default(300),
  autoResolve: z.boolean().default(true),
  description: z.string().max(2000).nullable().optional(),
  remediation: z.string().max(4000).nullable().optional()
});

export type LoginInput = z.infer<typeof loginSchema>;
export type MonitoredServerCreateInput = z.infer<typeof monitoredServerCreateSchema>;
export type MonitoredServerUpdateInput = z.infer<typeof monitoredServerUpdateSchema>;
export type MetricQueryInput = z.infer<typeof metricQuerySchema>;
export type AlertRuleCreateInput = z.infer<typeof alertRuleCreateSchema>;
export { z };
