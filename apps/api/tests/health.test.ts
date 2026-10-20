import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { connectDatabase, disconnectDatabase } from '../src/config/database.js';
import { HealthResponseSchema } from '@peerspace/shared';

describe('Health and System Endpoints', () => {
  const app = createApp();

  beforeAll(async () => {
    try {
      await connectDatabase();
    } catch {
      // Continue even if local DB is not reachable during isolated tests
    }
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  it('GET /api/health returns a valid HealthResponse schema', async () => {
    const res = await request(app).get('/api/health');

    // Status is 200 (if connected) or 503 (if degraded/disconnected)
    expect([200, 503]).toContain(res.status);
    expect(res.headers['content-type']).toMatch(/json/);

    // Validate structure matches HealthResponseSchema
    const parseResult = HealthResponseSchema.safeParse(res.body);
    expect(parseResult.success).toBe(true);

    if (parseResult.success) {
      expect(parseResult.data.service).toBe('PeerSpace API');
      expect(parseResult.data.version).toBe('0.1.0');
      expect(typeof parseResult.data.uptime).toBe('number');
      expect(parseResult.data.memory.heapUsedMb).toBeGreaterThan(0);
    }
  });

  it('GET /api/unknown-endpoint returns 404 with structured error envelope', async () => {
    const res = await request(app).get('/api/unknown-endpoint');

    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({
      success: false,
      error: {
        code: 'NOT_FOUND',
      },
    });
    expect(res.body.meta.timestamp).toBeDefined();
  });
});
