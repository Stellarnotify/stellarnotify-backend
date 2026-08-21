import { Pool } from 'pg';
import {
  createNotification,
  getPending,
  markDelivered,
  markFailed,
  markRetrying,
  getBySubscription,
  getFailed,
  getNotificationById,
} from '../db/notificationRepo';
import { SorobanEvent } from '../types';

function makePool(queryFn: jest.Mock): Pool {
  return { query: queryFn } as unknown as Pool;
}

const mockEvent: SorobanEvent = {
  id: 'evt-1',
  contractId: 'CABC',
  ledger: 100,
  ledgerClosedAt: '2024-01-01T00:00:00Z',
  topics: ['transfer'],
  data: 'AAAAAA==',
  txHash: 'txhash123',
};

const baseRow = {
  id: 'notif-1',
  subscription_id: 'sub-1',
  event_payload: mockEvent,
  channel: 'Webhook',
  status: 'Pending',
  attempts: 0,
  next_retry_at: null,
  last_error: null,
  created_at: new Date('2024-01-01T00:00:00Z'),
  updated_at: new Date('2024-01-01T00:00:00Z'),
};

describe('notificationRepo', () => {
  describe('createNotification', () => {
    it('inserts and returns a mapped NotificationRecord', async () => {
      const query = jest.fn().mockResolvedValue({ rows: [baseRow] });
      const pool = makePool(query);

      const result = await createNotification(
        { subscriptionId: 'sub-1', eventPayload: mockEvent, channel: 'Webhook' },
        pool,
      );

      expect(query).toHaveBeenCalledTimes(1);
      expect(result.id).toBe('notif-1');
      expect(result.subscriptionId).toBe('sub-1');
      expect(result.status).toBe('Pending');
      expect(result.attempts).toBe(0);
    });
  });

  describe('getPending', () => {
    it('returns pending notifications', async () => {
      const query = jest.fn().mockResolvedValue({ rows: [baseRow] });
      const pool = makePool(query);

      const results = await getPending(100, pool);
      expect(results).toHaveLength(1);
      expect(results[0].status).toBe('Pending');
    });

    it('returns empty array when none are pending', async () => {
      const query = jest.fn().mockResolvedValue({ rows: [] });
      const pool = makePool(query);

      const results = await getPending(100, pool);
      expect(results).toEqual([]);
    });
  });

  describe('markDelivered', () => {
    it('executes update query with correct id', async () => {
      const query = jest.fn().mockResolvedValue({ rowCount: 1 });
      const pool = makePool(query);

      await markDelivered('notif-1', pool);

      expect(query).toHaveBeenCalledTimes(1);
      const sql = query.mock.calls[0][0] as string;
      expect(sql).toContain('Delivered');
      expect(query.mock.calls[0][1]).toEqual(['notif-1']);
    });
  });

  describe('markFailed', () => {
    it('executes update query with id and error message', async () => {
      const query = jest.fn().mockResolvedValue({ rowCount: 1 });
      const pool = makePool(query);

      await markFailed('notif-1', 'connection refused', pool);

      expect(query).toHaveBeenCalledTimes(1);
      const sql = query.mock.calls[0][0] as string;
      expect(sql).toContain('Failed');
      expect(query.mock.calls[0][1]).toEqual(['notif-1', 'connection refused']);
    });
  });

  describe('markRetrying', () => {
    it('executes update with retry metadata', async () => {
      const query = jest.fn().mockResolvedValue({ rowCount: 1 });
      const pool = makePool(query);
      const retryAt = new Date('2024-01-01T01:00:00Z');

      await markRetrying('notif-1', 2, retryAt, 'timeout', pool);

      expect(query).toHaveBeenCalledTimes(1);
      const args = query.mock.calls[0][1] as unknown[];
      expect(args[0]).toBe('notif-1');
      expect(args[1]).toBe(2);
      expect(args[2]).toBe(retryAt);
      expect(args[3]).toBe('timeout');
    });
  });

  describe('getBySubscription', () => {
    it('returns notifications for a subscription', async () => {
      const query = jest.fn().mockResolvedValue({ rows: [baseRow] });
      const pool = makePool(query);

      const results = await getBySubscription('sub-1', 50, 0, pool);
      expect(results).toHaveLength(1);
      expect(results[0].subscriptionId).toBe('sub-1');
    });
  });

  describe('getFailed', () => {
    it('returns failed notifications', async () => {
      const failedRow = { ...baseRow, status: 'Failed', last_error: 'timeout' };
      const query = jest.fn().mockResolvedValue({ rows: [failedRow] });
      const pool = makePool(query);

      const results = await getFailed(100, pool);
      expect(results).toHaveLength(1);
      expect(results[0].status).toBe('Failed');
      expect(results[0].lastError).toBe('timeout');
    });
  });

  describe('getNotificationById', () => {
    it('returns the notification when found', async () => {
      const query = jest.fn().mockResolvedValue({ rows: [baseRow] });
      const pool = makePool(query);

      const result = await getNotificationById('notif-1', pool);
      expect(result).not.toBeNull();
      expect(result?.id).toBe('notif-1');
    });

    it('returns null when not found', async () => {
      const query = jest.fn().mockResolvedValue({ rows: [] });
      const pool = makePool(query);

      const result = await getNotificationById('ghost', pool);
      expect(result).toBeNull();
    });
  });
});
