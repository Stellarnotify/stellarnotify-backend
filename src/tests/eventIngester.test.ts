import { matchesTopicFilter } from '../services/topicFilter';
import { SorobanEvent, Subscription } from '../types';

const baseEvent: SorobanEvent = {
  id: 'evt-1',
  contractId: 'CABC',
  ledger: 100,
  ledgerClosedAt: '2024-01-01T00:00:00Z',
  topics: ['transfer', 'GABC', 'GXYZ'],
  data: 'AAAAAA==',
  txHash: 'txhash123',
};

const baseSub: Subscription = {
  id: 'sub-1',
  owner: 'GABC',
  contractId: 'CABC',
  topicFilters: [],
  channel: 'Webhook',
  active: true,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

describe('matchesTopicFilter', () => {
  it('matches all events when topicFilters is empty', () => {
    expect(matchesTopicFilter(baseEvent, { ...baseSub, topicFilters: [] })).toBe(true);
  });

  it('matches when a single filter is present in event topics', () => {
    expect(matchesTopicFilter(baseEvent, { ...baseSub, topicFilters: ['transfer'] })).toBe(true);
  });

  it('matches when all filters are present in event topics', () => {
    expect(
      matchesTopicFilter(baseEvent, { ...baseSub, topicFilters: ['transfer', 'GABC'] }),
    ).toBe(true);
  });

  it('does not match when a required filter is missing from event topics', () => {
    expect(
      matchesTopicFilter(baseEvent, { ...baseSub, topicFilters: ['mint'] }),
    ).toBe(false);
  });

  it('does not match when one of multiple filters is missing', () => {
    expect(
      matchesTopicFilter(baseEvent, { ...baseSub, topicFilters: ['transfer', 'mint'] }),
    ).toBe(false);
  });

  it('matches using substring — partial topic value match', () => {
    // 'GABC' is a substring of 'GABC' (exact), should match
    expect(
      matchesTopicFilter(baseEvent, { ...baseSub, topicFilters: ['GABC'] }),
    ).toBe(true);
  });

  it('does not match on empty string filters (they are stripped)', () => {
    // empty filter strings should be ignored → behaves like no filters → matches all
    expect(
      matchesTopicFilter(baseEvent, { ...baseSub, topicFilters: ['', ''] }),
    ).toBe(true);
  });

  it('handles an event with no topics when subscription has no filters', () => {
    const noTopicsEvent = { ...baseEvent, topics: [] };
    expect(matchesTopicFilter(noTopicsEvent, { ...baseSub, topicFilters: [] })).toBe(true);
  });

  it('does not match when event has no topics but subscription requires one', () => {
    const noTopicsEvent = { ...baseEvent, topics: [] };
    expect(
      matchesTopicFilter(noTopicsEvent, { ...baseSub, topicFilters: ['transfer'] }),
    ).toBe(false);
  });
});
