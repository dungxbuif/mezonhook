import { type MessageDraft, toMezonContent, validateDraft } from '@mezonhook/schema';
import { normalizeDraft } from './draft-storage';

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

export async function sendWebhook(url: string, draft: MessageDraft, fetcher: typeof fetch = fetch): Promise<void> {
  if (!validateWebhookUrl(url)) throw new Error('Enter a valid Mezon Channel Webhook URL.');
  if (!validateDraft(draft).valid) throw new Error('This message draft is invalid. Please correct it before sending.');
  const sanitizedDraft = normalizeDraft(draft);

  let response: Response;
  try {
    response = await fetcher(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'hook', message: toMezonContent(sanitizedDraft) }),
    });
  } catch {
    throw new Error('Could not reach Mezon. Check your connection or browser CORS settings and try again.');
  }

  if (!response.ok) throw new Error('Mezon could not accept the message. Please check the channel webhook and try again.');
}
