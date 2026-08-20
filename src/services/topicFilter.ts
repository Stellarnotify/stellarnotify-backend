import { SorobanEvent, Subscription } from '../types';

/**
 * Determines whether a Soroban event matches a subscription's topic filters.
 *
 * Matching rules:
 * - If the subscription has no filters (empty array), every event matches.
 * - Otherwise, every non-empty filter string must appear in the event's topics
 *   array (case-sensitive substring match against the XDR-encoded topic values).
 *
 * @param event        - The ingested Soroban event.
 * @param subscription - The subscription whose filters are being evaluated.
 * @returns true if the event should trigger a notification for this subscription.
 */
export function matchesTopicFilter(
  event: SorobanEvent,
  subscription: Subscription,
): boolean {
  const filters = subscription.topicFilters.filter((f) => f.length > 0);

  // No filters → accept all events for this contract
  if (filters.length === 0) {
    return true;
  }

  // Every filter must match at least one topic value
  return filters.every((filter) =>
    event.topics.some((topic) => topic.includes(filter)),
  );
}
