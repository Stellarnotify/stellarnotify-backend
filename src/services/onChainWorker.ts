import axios from 'axios';
import { logger } from '../logger';
import { NotificationRecord } from '../types';
import { markDelivered, markFailed } from '../db/notificationRepo';

/**
 * Submits a Stellar transaction that re-emits the notification proof on-chain.
 *
 * In production this would build and sign a Soroban contract invocation
 * (e.g. calling a `record_notification` function on the registry contract).
 * The implementation below calls the configured RPC endpoint with a
 * placeholder XDR envelope and is intentionally left as a stub — the actual
 * XDR assembly requires the Stellar SDK and a funded signing key, both of
 * which are wired up outside this service.
 *
 * @param notification - The notification record to prove on-chain.
 * @returns Resolves when the transaction is submitted or marked failed — never throws.
 */
export async function reEmitOnChain(
  notification: NotificationRecord,
): Promise<void> {
  const rpcUrl = process.env.STELLAR_RPC_URL;

  if (!rpcUrl) {
    const msg = 'STELLAR_RPC_URL not configured — skipping on-chain re-emit';
    logger.warn(msg, { notificationId: notification.id });
    await markFailed(notification.id, msg);
    return;
  }

  try {
    // Placeholder: in a full implementation, `xdr` would be a signed
    // TransactionEnvelope built with @stellar/stellar-sdk.
    const xdr = buildPlaceholderXdr(notification);

    const payload = {
      jsonrpc: '2.0',
      id: 1,
      method: 'sendTransaction',
      params: { transaction: xdr },
    };

    const response = await axios.post<{
      result?: { status: string; hash: string };
      error?: { code: number; message: string };
    }>(rpcUrl, payload, {
      timeout: 15_000,
      headers: { 'Content-Type': 'application/json' },
    });

    if (response.data.error) {
      throw new Error(
        `RPC error ${response.data.error.code}: ${response.data.error.message}`,
      );
    }

    const status = response.data.result?.status;
    if (status !== 'PENDING' && status !== 'SUCCESS') {
      throw new Error(`Unexpected transaction status: ${status}`);
    }

    await markDelivered(notification.id);
    logger.info('On-chain re-emit submitted', {
      notificationId: notification.id,
      txHash: response.data.result?.hash,
    });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    logger.error('On-chain re-emit failed', {
      notificationId: notification.id,
      error: errorMsg,
    });
    await markFailed(notification.id, errorMsg);
  }
}

/**
 * Builds a deterministic placeholder XDR string for the notification.
 * Replace with a real Stellar SDK transaction envelope in production.
 */
function buildPlaceholderXdr(notification: NotificationRecord): string {
  const payload = {
    notificationId: notification.id,
    subscriptionId: notification.subscriptionId,
    eventId: notification.eventPayload.id,
  };
  return Buffer.from(JSON.stringify(payload)).toString('base64');
}
