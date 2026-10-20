import { z } from 'zod';

export const DatabaseStatusSchema = z.enum([
  'connected',
  'disconnected',
  'connecting',
  'disconnecting',
  'uninitialized',
]);

export type DatabaseStatus = z.infer<typeof DatabaseStatusSchema>;

export const HealthStatusSchema = z.enum(['ok', 'degraded', 'error']);
export type HealthStatus = z.infer<typeof HealthStatusSchema>;

export const HealthResponseSchema = z.object({
  status: HealthStatusSchema,
  service: z.string(),
  version: z.string(),
  environment: z.string(),
  uptime: z.number().describe('Uptime in seconds'),
  timestamp: z.string().datetime(),
  database: z.object({
    status: DatabaseStatusSchema,
    name: z.string().nullable(),
    host: z.string().nullable(),
    latencyMs: z.number().nullable(),
    error: z.string().optional(),
  }),
  memory: z.object({
    rssMb: z.number(),
    heapUsedMb: z.number(),
    heapTotalMb: z.number(),
  }),
});

export type HealthResponse = z.infer<typeof HealthResponseSchema>;
