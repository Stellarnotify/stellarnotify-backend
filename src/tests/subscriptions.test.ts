import request from 'supertest';
import { createApp } from '../api/server';
import * as dbClient from '../db/client';

jest.mock('../db/client');

const mockGetPool = dbClient.getPool as jest.MockedFunction<typeof dbClient.getPool>;

// Valid API key for tests
const API_KEY = 'test-api-key';

beforeEach(() => {
  process.env.API_KEY = API_KEY;
});

afterEach(() => {
  jest.clearAllMocks();
});

describe('POST /api/subscriptions/endpoints', () => {
  it('returns 201 with hash and url on valid input', async () => {
    mockGetPool.mockReturnValue({
      query: jest.fn().mockResolvedValue({ rows: [] }),
    } as unknown as ReturnType<typeof dbClient.getPool>);

    const app = createApp();
    const res = await request(app)
      .post('/api/subscriptions/endpoints')
      .set('Authorization', `Bearer ${API_KEY}`)
      .send({ url: 'https://example.com/webhook' });

    expect(res.status).toBe(201);
    expect(res.body.url).toBe('https://example.com/webhook');
    expect(res.body.hash).toHaveLength(64); // SHA-256 hex
  });

  it('returns 400 when url is missing', async () => {
    const app = createApp();
    const res = await request(app)
      .post('/api/subscriptions/endpoints')
      .set('Authorization', `Bearer ${API_KEY}`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('returns 400 when url is not a valid URL', async () => {
    const app = createApp();
    const res = await request(app)
      .post('/api/subscriptions/endpoints')
      .set('Authorization', `Bearer ${API_KEY}`)
      .send({ url: 'not-a-url' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('returns 400 when url uses a non-http protocol', async () => {
    const app = createApp();
    const res = await request(app)
      .post('/api/subscriptions/endpoints')
      .set('Authorization', `Bearer ${API_KEY}`)
      .send({ url: 'ftp://example.com/webhook' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('returns 401 when Authorization header is missing', async () => {
    const app = createApp();
    const res = await request(app)
      .post('/api/subscriptions/endpoints')
      .send({ url: 'https://example.com/webhook' });

    expect(res.status).toBe(401);
  });

  it('returns 401 when API key is invalid', async () => {
    const app = createApp();
    const res = await request(app)
      .post('/api/subscriptions/endpoints')
      .set('Authorization', 'Bearer wrong-key')
      .send({ url: 'https://example.com/webhook' });

    expect(res.status).toBe(401);
  });
});
