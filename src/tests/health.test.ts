import request from 'supertest';
import { createApp } from '../api/server';
import * as dbClient from '../db/client';

jest.mock('../db/client');

const mockGetPool = dbClient.getPool as jest.MockedFunction<typeof dbClient.getPool>;

describe('GET /health', () => {
  it('returns 200 with status ok when DB is reachable', async () => {
    // Mock pool.query to resolve successfully
    mockGetPool.mockReturnValue({
      query: jest.fn().mockResolvedValue({ rows: [{ '?column?': 1 }] }),
    } as unknown as ReturnType<typeof dbClient.getPool>);

    const app = createApp();
    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok', db: 'connected' });
  });

  it('returns 503 with status error when DB is unreachable', async () => {
    mockGetPool.mockReturnValue({
      query: jest.fn().mockRejectedValue(new Error('connection refused')),
    } as unknown as ReturnType<typeof dbClient.getPool>);

    const app = createApp();
    const res = await request(app).get('/health');

    expect(res.status).toBe(503);
    expect(res.body.status).toBe('error');
    expect(res.body.db).toBe('disconnected');
    expect(res.body.detail).toBe('connection refused');
  });
});
