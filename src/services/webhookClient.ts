import axios from 'axios';
import { WebhookPayload } from '../types';

const TIMEOUT_MS = parseInt(process.env.WEBHOOK_TIMEOUT_MS ?? '5000', 10);

/**
 * Delivers a webhook payload via HTTP POST to the target URL.
 *
 * Isolated from retry/dispatch logic so it can be mocked independently
 * in unit tests and reused by any future delivery adapter.
 *
 * @param url     - The subscriber's registered webhook endpoint.
 * @param payload - The structured notification payload to deliver.
 * @param signature - Optional HMAC-SHA256 signature for payload verification.
 * @throws        If the HTTP response status is outside the 2xx range,
 *                or if the request times out / network fails.
 */
export async function deliverWebhook(
  url: string,
  payload: WebhookPayload,
  signature?: string,
): Promise<void> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  
  if (signature) {
    headers['X-StellarNotify-Signature'] = signature;
  }

  await axios.post(url, payload, {
    timeout: TIMEOUT_MS,
    headers,
    validateStatus: (status) => status >= 200 && status < 300,
  });
}
