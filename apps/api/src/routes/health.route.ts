import { Router } from 'express';
import type { Request, Response } from 'express';
import type { HealthResponse, HealthStatus } from '@peerspace/shared';
import { checkDatabaseHealth } from '../config/database.js';
import { env } from '../config/env.js';

export const healthRouter = Router();

healthRouter.get('/', async (_req: Request, res: Response) => {
  const dbHealth = await checkDatabaseHealth();

  let overallStatus: HealthStatus = 'ok';
  if (dbHealth.status === 'disconnected') {
    overallStatus = 'degraded';
  }

  const memoryUsage = process.memoryUsage();

  const responseData: HealthResponse = {
    status: overallStatus,
    service: 'PeerSpace API',
    version: '0.1.0',
    environment: env.NODE_ENV,
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    database: {
      status: dbHealth.status,
      name: dbHealth.name,
      host: dbHealth.host,
      latencyMs: dbHealth.latencyMs,
      error: dbHealth.error,
    },
    memory: {
      rssMb: Math.round((memoryUsage.rss / 1024 / 1024) * 100) / 100,
      heapUsedMb: Math.round((memoryUsage.heapUsed / 1024 / 1024) * 100) / 100,
      heapTotalMb: Math.round((memoryUsage.heapTotal / 1024 / 1024) * 100) / 100,
    },
  };

  const httpStatusCode = overallStatus === 'ok' ? 200 : 503;
  res.status(httpStatusCode).json(responseData);
});
