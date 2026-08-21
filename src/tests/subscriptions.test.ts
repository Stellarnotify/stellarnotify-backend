import request from 'supertest';
import { createApp } from '../api/server';
import * as dbClient from '../db/client';
import * as subscriptionRepo from '../db/subscriptionRepo';

jest.mock('../db/client');
jest.mock('../db/subscriptionRepo');

const mockGetPool = dbClient.getPool as jest.MockedFunction<typeof dbClient.getPool>;
const mockGetByOwner = subscriptionRepo.getByOwner as jest.MockedFunction<typeof subscriptionRepo.getByOwner>;
const mockGetActiveByContract = subscriptionRepo.getActiveByContract as jest.MockedFunction<typeof subscriptionRepo.getActiveByContract>;

const API_KEY = 'test-api-key';

beforeEach(() => {
  process.env.API_KEY = API_KEY;
  mockGetPool.mockReturnValue({
    query: jest.fn().mockResolvedValue({ rows: [] }),
  } as unknown as ReturnType<typeof dbClient.getPool>);
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

describe('GET /api/subscriptions/by-owner/:owner', () => {
  const mockSub = {
    id: 'sub-1',
    owner: 'GABC',
    contractId: 'CABC',
    topicFilters: [],
    channel: 'Webhook' as const,
    active: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };

  it('returns 200 with subscription rows for a valid owner', async () => {
    mockGetByOwner.mockResolvedValue([mockSub]);

    const app = createApp();
    const res = await request(app)
      .get('/api/subscriptions/by-owner/GABC')
      .set('Authorization', `Bearer ${API_KEY}`);

    expect(res.status).toBe(200);
    expect(res.body.subscriptions).toHaveLength(1);
    expect(res.body.subscriptions[0].owner).toBe('GABC');
  });

  it('returns 200 with empty array when owner has no subscriptions', async () => {
    mockGetByOwner.mockResolvedValue([]);

    const app = createApp();
    const res = await request(app)
      .get('/api/subscriptions/by-owner/GNONE')
      .set('Authorization', `Bearer ${API_KEY}`);

    expect(res.status).toBe(200);
    expect(res.body.subscriptions).toEqual([]);
  });

  it('returns 401 without auth header', async () => {
    const app = createApp();
    const res = await request(app).get('/api/subscriptions/by-owner/GABC');
    expect(res.status).toBe(401);
  });
});
