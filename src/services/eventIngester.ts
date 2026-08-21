import axios from 'axios';
import { logger } from '../logger';
import { SorobanEvent } from '../types';

/** Shape of a single event entry from the Stellar RPC getEvents response. */
interface RpcEventEntry {
  id: string;
  contractId: string;
  ledger: number;
  ledgerClosedAt: string;
  topic: string[];
  value: string;
  txHash: string;
}

interface RpcGetEventsResult {
  events: RpcEventEntry[];
  latestLedger: number;
}

interface RpcResponse {
  result: RpcGetEventsResult;
  error?: { code: number; message: string };
}

/**
 * Fetches Soroban contract events from the Stellar RPC node for a given
 * ledger range, optionally scoped to specific contract IDs.
 *
 * @param rpcUrl      - Stellar RPC endpoint URL (e.g. https://soroban-testnet.stellar.org)
 * @param startLedger - First ledger sequence number to fetch events from (inclusive)
 * @param contractIds - Optional list of contract IDs to filter; omit to fetch all contracts
 * @returns Parsed SorobanEvent array and the latest ledger seen by the RPC node
 * @throws  On network failure or non-zero RPC error code
 */
export async function fetchEvents(
  rpcUrl: string,
  startLedger: number,
  contractIds: string[] = [],
): Promise<{ events: SorobanEvent[]; latestLedger: number }> {
  const filters =
    contractIds.length > 0
      ? contractIds.map((id) => ({ type: 'contract', contractIds: [id] }))
      : [{ type: 'contract' }];

  const payload = {
    jsonrpc: '2.0',
    id: 1,
    method: 'getEvents',
    params: {
      startLedger,
      filters,
      pagination: { limit: 100 },
    },
  };

  const response = await axios.post<RpcResponse>(rpcUrl, payload, {
    timeout: 10_000,
    headers: { 'Content-Type': 'application/json' },
  });

  if (response.data.error) {
    throw new Error(
      `Stellar RPC error ${response.data.error.code}: ${response.data.error.message}`,
    );
  }

  const result = response.data.result;

  const events: SorobanEvent[] = (result.events ?? []).map((e) => ({
    id: e.id,
    contractId: e.contractId,
    ledger: e.ledger,
    ledgerClosedAt: e.ledgerClosedAt,
    topics: e.topic,
    data: e.value,
    txHash: e.txHash,
  }));

  logger.info('Fetched events from Stellar RPC', {
    startLedger,
    eventCount: events.length,
    latestLedger: result.latestLedger,
  });

  return { events, latestLedger: result.latestLedger };
}

/**
 * Parses a raw RPC event entry into a typed SorobanEvent.
 * Exported for unit testing of parsing logic in isolation.
 */
export function parseEvent(raw: RpcEventEntry): SorobanEvent {
  return {
    id: raw.id,
    contractId: raw.contractId,
    ledger: raw.ledger,
    ledgerClosedAt: raw.ledgerClosedAt,
    topics: raw.topic,
    data: raw.value,
    txHash: raw.txHash,
  };
}
