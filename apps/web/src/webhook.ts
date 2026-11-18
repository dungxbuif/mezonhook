import {
  toChannelWebhookEnvelope,
  validateChannelWebhookMessage,
  type ChannelWebhookEnvelope,
  type ChannelWebhookMessage,
} from '@mezonhook/schema';

export function validateWebhookUrl(value: string): boolean {
  try {
    const url = new URL(value);
    const pathSegments = url.pathname.split('/');
    return url.protocol === 'https:'
      && url.hostname === 'webhook.mezon.ai'
      && url.port === ''
      && url.username === ''
      && url.password === ''
      && pathSegments.length === 4
      && pathSegments[0] === ''
      && pathSegments[1] === 'webhooks'
      && pathSegments[2].length > 0
      && pathSegments[3].length > 0;
  } catch {
    return false;
  }
}

export function parseChannelWebhookEnvelope(text: string): ChannelWebhookEnvelope {
  let value: unknown;
  try { value = JSON.parse(text); } catch { throw new Error('Payload JSON is invalid.'); }
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Payload must be a JSON object.');
  const payload = value as Record<string, unknown>;
  if (Object.keys(payload).sort().join(',') !== 'message,type' || payload.type !== 'hook') {
    throw new Error('Payload must contain only type "hook" and message.');
  }
  const validation = validateChannelWebhookMessage(payload.message);
  if (!validation.valid) throw new Error(validation.errors.join(' '));
  return toChannelWebhookEnvelope(payload.message as ChannelWebhookMessage);
}

export async function sendChannelWebhookPayload(
  url: string,
  payload: ChannelWebhookEnvelope,
  fetcher: typeof fetch = fetch,
): Promise<void> {
  if (!validateWebhookUrl(url)) throw new Error('Enter a valid Mezon Channel Webhook URL.');
  let response: Response;
  try {
    response = await fetcher(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new Error('Could not reach Mezon. Check your connection or browser CORS settings and try again.');
  }
  if (!response.ok) throw new Error('Mezon could not accept the message. Please check the channel webhook and try again.');
}

export async function sendWebhookBatch(
  urls: string[],
  messages: ChannelWebhookMessage[],
  fetcher: typeof fetch = fetch,
): Promise<number> {
  if (urls.length === 0) throw new Error('Select at least one Mezon webhook target.');
  if (messages.length === 0 || messages.some((message) => !validateChannelWebhookMessage(message).valid)) {
    throw new Error('Every message must be valid before sending.');
  }
  if (urls.some((url) => !validateWebhookUrl(url))) throw new Error('Enter valid Mezon Channel Webhook URLs.');
  let deliveries = 0;
  for (const message of messages) {
    const envelope = toChannelWebhookEnvelope(message);
    for (const url of urls) {
      await sendChannelWebhookPayload(url, envelope, fetcher);
      deliveries += 1;
    }
  }
  return deliveries;
}
