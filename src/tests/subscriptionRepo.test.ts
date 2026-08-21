import { Pool } from 'pg';
import {
  upsertSubscription,
  deactivateSubscription,
  getActiveByContract,
  getByOwner,
  getSubscriptionById,
} from '../db/subscriptionRepo';

/** Builds a minimal mock pg Pool */
function makePool(queryFn: jest.Mock): Pool {
  return { query: queryFn } as unknown as Pool;
}

const baseRow = {
  id: 'sub-1',
  owner: 'GABC',
  contract_id: 'CABC',
  topic_filters: ['transfer'],
  channel: 'Webhook',
  endpoint_hash: 'hash123',
  active: true,
  expires_at: null,
  created_at: new Date('2024-01-01T00:00:00Z'),
  updated_at: new Date('2024-01-01T00:00:00Z'),
};

describe('subscriptionRepo', () => {
  describe('upsertSubscription', () => {
    it('returns a mapped Subscription on success', async () => {
      const query = jest.fn().mockResolvedValue({ rows: [baseRow] });
      const pool = makePool(query);

      const result = await upsertSubscription(
        {
          owner: 'GABC',
          contractId: 'CABC',
          topicFilters: ['transfer'],
          channel: 'Webhook',
          endpointHash: 'hash123',
          expiresAt: undefined,
        },
        pool,
      );

      expect(query).toHaveBeenCalledTimes(1);
      expect(result.id).toBe('sub-1');
      expect(result.owner).toBe('GABC');
      expect(result.contractId).toBe('CABC');
      expect(result.topicFilters).toEqual(['transfer']);
      expect(result.channel).toBe('Webhook');
      expect(result.active).toBe(true);
    });

    it('passes null endpoint_hash when not provided', async () => {
      const query = jest.fn().mockResolvedValue({ rows: [{ ...baseRow, endpoint_hash: null }] });
      const pool = makePool(query);

      await upsertSubscription(
        { owner: 'GABC', contractId: 'CABC', topicFilters: [], channel: 'InApp' },
        pool,
      );

      const callArgs = query.mock.calls[0][1] as unknown[];
      expect(callArgs[4]).toBeNull(); // endpoint_hash param
    });
  });

  describe('deactivateSubscription', () => {
    it('returns true when a row is updated', async () => {
      const query = jest.fn().mockResolvedValue({ rowCount: 1 });
      const pool = makePool(query);

      const result = await deactivateSubscription('sub-1', pool);
      expect(result).toBe(true);
    });

    it('returns false when no row is found', async () => {
      const query = jest.fn().mockResolvedValue({ rowCount: 0 });
      const pool = makePool(query);

      const result = await deactivateSubscription('no-such-id', pool);
      expect(result).toBe(false);
    });
  });

  describe('getActiveByContract', () => {
    it('returns mapped subscriptions for a contract', async () => {
      const query = jest.fn().mockResolvedValue({ rows: [baseRow, { ...baseRow, id: 'sub-2' }] });
      const pool = makePool(query);

      const results = await getActiveByContract('CABC', pool);
      expect(results).toHaveLength(2);
      expect(results[0].contractId).toBe('CABC');
    });

    it('returns an empty array when no subscriptions exist', async () => {
      const query = jest.fn().mockResolvedValue({ rows: [] });
      const pool = makePool(query);

      const results = await getActiveByContract('CNONE', pool);
      expect(results).toEqual([]);
    });
  });

  describe('getByOwner', () => {
    it('returns all subscriptions for an owner', async () => {
      const query = jest.fn().mockResolvedValue({ rows: [baseRow] });
      const pool = makePool(query);

      const results = await getByOwner('GABC', pool);
      expect(results).toHaveLength(1);
      expect(results[0].owner).toBe('GABC');
    });
  });

  describe('getSubscriptionById', () => {
    it('returns the subscription when found', async () => {
      const query = jest.fn().mockResolvedValue({ rows: [baseRow] });
      const pool = makePool(query);

      const result = await getSubscriptionById('sub-1', pool);
      expect(result).not.toBeNull();
      expect(result?.id).toBe('sub-1');
    });

    it('returns null when not found', async () => {
      const query = jest.fn().mockResolvedValue({ rows: [] });
      const pool = makePool(query);

      const result = await getSubscriptionById('ghost', pool);
      expect(result).toBeNull();
    });
  });
});
