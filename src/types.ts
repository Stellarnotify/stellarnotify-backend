/** Delivery channels supported by StellarNotify. */
export type NotificationChannel = 'Webhook' | 'InApp' | 'OnChain';

/** Delivery status of a notification record. */
export type NotificationStatus = 'Pending' | 'Delivered' | 'Failed' | 'Retrying';

/**
 * A subscription registered by a wallet owner to watch
 * a specific Soroban contract for matching events.
 */
export interface Subscription {
  id: string;
  /** Stellar wallet address of the subscriber. */
  owner: string;
  /** Soroban contract ID being watched. */
  contractId: string;
  /** Optional list of topic strings to filter events (empty = all events). */
  topicFilters: string[];
  /** Delivery channel for matched events. */
  channel: NotificationChannel;
  /** Webhook URL (required when channel is 'Webhook'). */
  endpointUrl?: string;
  /** Hash of the registered endpoint URL. */
  endpointHash?: string;
  /** Whether the subscription is currently active. */
  active: boolean;
  /** Optional expiry timestamp (ISO-8601). */
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * A persisted record of a single notification delivery attempt.
 */
export interface NotificationRecord {
  id: string;
  subscriptionId: string;
  /** Raw Soroban event payload that triggered this notification. */
  eventPayload: SorobanEvent;
  channel: NotificationChannel;
  status: NotificationStatus;
  /** Number of delivery attempts made so far. */
  attempts: number;
  /** Timestamp of the next scheduled retry (ISO-8601). */
  nextRetryAt?: string;
  /** Error message from the last failed attempt. */
  lastError?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * A Soroban contract event as returned by the Stellar RPC getEvents call.
 */
export interface SorobanEvent {
  /** Unique event ID returned by the RPC (ledger_seq-tx_idx-event_idx). */
  id: string;
  /** Contract that emitted the event. */
  contractId: string;
  /** Ledger sequence number in which the event was recorded. */
  ledger: number;
  /** Ledger close time (Unix timestamp). */
  ledgerClosedAt: string;
  /** Array of XDR-encoded topic values. */
  topics: string[];
  /** XDR-encoded event data value. */
  data: string;
  /** Transaction hash that produced this event. */
  txHash: string;
}

/**
 * The payload delivered to a subscriber's webhook endpoint.
 */
export interface WebhookPayload {
  /** StellarNotify notification ID. */
  notificationId: string;
  subscriptionId: string;
  contractId: string;
  /** ISO-8601 timestamp of when the event occurred on-chain. */
  eventTimestamp: string;
  topics: string[];
  data: string;
  txHash: string;
  /** ISO-8601 timestamp of when this payload was dispatched. */
  deliveredAt: string;
}
