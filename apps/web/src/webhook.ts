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

export async function sendWebhookBatch(
  urls: string[],
  drafts: MessageDraft[],
  fetcher: typeof fetch = fetch,
): Promise<number> {
  if (urls.length === 0) throw new Error('Select at least one Mezon webhook target.');
  if (drafts.length === 0 || drafts.some((draft) => !validateDraft(draft).valid)) {
    throw new Error('Every message must be valid before sending.');
  }
  if (urls.some((url) => !validateWebhookUrl(url))) throw new Error('Enter valid Mezon Channel Webhook URLs.');

  let deliveries = 0;
  for (const draft of drafts) {
    for (const url of urls) {
      await sendWebhook(url, draft, fetcher);
      deliveries += 1;
    }
  }
  return deliveries;
}
