import { dispatchWebhook, nextRetryDelay, MAX_RETRIES } from '../services/webhookDispatcher';
import * as webhookClient from '../services/webhookClient';
import * as notificationRepo from '../db/notificationRepo';
import { NotificationRecord, Subscription } from '../types';

jest.mock('../services/webhookClient');
jest.mock('../db/notificationRepo');

const mockDeliverWebhook = webhookClient.deliverWebhook as jest.MockedFunction<typeof webhookClient.deliverWebhook>;
const mockMarkDelivered = notificationRepo.markDelivered as jest.MockedFunction<typeof notificationRepo.markDelivered>;
const mockMarkFailed = notificationRepo.markFailed as jest.MockedFunction<typeof notificationRepo.markFailed>;
const mockMarkRetrying = notificationRepo.markRetrying as jest.MockedFunction<typeof notificationRepo.markRetrying>;

const baseNotification: NotificationRecord = {
  id: 'notif-1',
  subscriptionId: 'sub-1',
  eventPayload: {
    id: 'evt-1',
    contractId: 'CABC',
    ledger: 100,
    ledgerClosedAt: '2024-01-01T00:00:00Z',
    topics: ['transfer'],
    data: 'AAAAAA==',
    txHash: 'txhash123',
  },
  channel: 'Webhook',
  status: 'Pending',
  attempts: 0,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

const baseSubscription: Subscription = {
  id: 'sub-1',
  owner: 'GABC',
  contractId: 'CABC',
  topicFilters: [],
  channel: 'Webhook',
  endpointUrl: 'https://example.com/webhook',
  endpointHash: 'hash123',
  active: true,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

beforeEach(() => {
  jest.clearAllMocks();
  mockMarkDelivered.mockResolvedValue(undefined);
  mockMarkFailed.mockResolvedValue(undefined);
  mockMarkRetrying.mockResolvedValue(undefined);
});

describe('nextRetryDelay', () => {
  it('returns 30s for attempt 1', () => {
    expect(nextRetryDelay(1)).toBe(30_000);
  });

  it('doubles for each subsequent attempt', () => {
    expect(nextRetryDelay(2)).toBe(60_000);
    expect(nextRetryDelay(3)).toBe(120_000);
    expect(nextRetryDelay(4)).toBe(240_000);
  });

  it('caps at 1 hour', () => {
    expect(nextRetryDelay(100)).toBe(3_600_000);
  });
});

describe('dispatchWebhook', () => {
  it('marks notification delivered on successful HTTP call', async () => {
    mockDeliverWebhook.mockResolvedValue(undefined);

    await dispatchWebhook(baseNotification, baseSubscription);

    expect(mockDeliverWebhook).toHaveBeenCalledTimes(1);
    expect(mockMarkDelivered).toHaveBeenCalledWith('notif-1');
    expect(mockMarkFailed).not.toHaveBeenCalled();
    expect(mockMarkRetrying).not.toHaveBeenCalled();
  });

  it('schedules retry on first failure (attempt < MAX_RETRIES)', async () => {
    mockDeliverWebhook.mockRejectedValue(new Error('connection refused'));

    await dispatchWebhook(baseNotification, baseSubscription);

    expect(mockMarkRetrying).toHaveBeenCalledTimes(1);
    expect(mockMarkFailed).not.toHaveBeenCalled();
    expect(mockMarkDelivered).not.toHaveBeenCalled();

    const [id, attempts] = mockMarkRetrying.mock.calls[0];
    expect(id).toBe('notif-1');
    expect(attempts).toBe(1);
  });

  it('marks permanently failed when attempts reach MAX_RETRIES', async () => {
    mockDeliverWebhook.mockRejectedValue(new Error('timeout'));

    const exhaustedNotification: NotificationRecord = {
      ...baseNotification,
      attempts: MAX_RETRIES - 1,
    };

    await dispatchWebhook(exhaustedNotification, baseSubscription);

    expect(mockMarkFailed).toHaveBeenCalledTimes(1);
    expect(mockMarkFailed).toHaveBeenCalledWith('notif-1', 'timeout');
    expect(mockMarkRetrying).not.toHaveBeenCalled();
  });

  it('marks failed immediately when no endpoint URL is configured', async () => {
    const noUrlSubscription: Subscription = { ...baseSubscription, endpointUrl: undefined };

    await dispatchWebhook(baseNotification, noUrlSubscription);

    expect(mockDeliverWebhook).not.toHaveBeenCalled();
    expect(mockMarkFailed).toHaveBeenCalledWith('notif-1', 'No endpoint URL configured');
  });
});
