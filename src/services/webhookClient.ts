import axios from 'axios';
import { WebhookPayload } from '../types';

const TIMEOUT_MS = parseInt(process.env.WEBHOOK_TIMEOUT_MS ?? '5000', 10);

/**
 * Delivers a webhook payload via HTTP POST to the given URL.
 * Throws if the response status is not in the 2xx range.
 */
export async function deliverWebhook(
  url: string,
  payload: WebhookPayload,
): Promise<void> {
  const response = await axios.post(url, payload, {
    timeout: TIMEOUT_MS,
    headers: { 'Content-Type': 'application/json' },
    validateStatus: (status) => status >= 200 && status < 300,
  });

  if (response.status < 200 || response.status >= 300) {
    throw new Error(`Unexpected HTTP status ${response.status}`);
  }
}
