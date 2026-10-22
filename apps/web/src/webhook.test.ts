import { createAnnouncementDraft, createDraftFromTemplate, toMezonContent } from '@mezonhook/schema';
import { describe, expect, it, vi } from 'vitest';
import { parseChannelWebhookEnvelope, sendChannelWebhookPayload, sendWebhook, sendWebhookBatch, validateWebhookUrl } from './webhook';

describe('Mezon Channel Webhooks', () => {
  it('accepts and sends the live documented payload unchanged', async () => {
    const payload = parseChannelWebhookEnvelope('{"type":"hook","message":{"t":"Hello","mk":[],"mentions":[],"images":[],"hg":[]}}');
    const fetcher = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    await sendChannelWebhookPayload('https://webhook.mezon.ai/webhooks/123/token', payload, fetcher);
    expect(JSON.parse((fetcher.mock.calls[0][1] as RequestInit).body as string)).toEqual(payload);
    expect(() => parseChannelWebhookEnvelope('{')).toThrow('Payload JSON is invalid.');
    expect(() => parseChannelWebhookEnvelope('{"type":"hook","message":{}}')).toThrow('message.t must be a string.');
  });
  it('sends each message in order to each target and returns the delivery count', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    const count = await sendWebhookBatch(
      ['https://webhook.mezon.ai/webhooks/a/token', 'https://webhook.mezon.ai/webhooks/b/token'],
      [createAnnouncementDraft(), createDraftFromTemplate('Release note')],
      fetcher,
    );
    expect(count).toBe(4);
    expect(fetcher.mock.calls.map(([url]) => url)).toEqual([
      'https://webhook.mezon.ai/webhooks/a/token', 'https://webhook.mezon.ai/webhooks/b/token',
      'https://webhook.mezon.ai/webhooks/a/token', 'https://webhook.mezon.ai/webhooks/b/token',
    ]);
  });
  // Mutation caught: delivery no longer uses the documented Mezon envelope.
  it('sends the documented Mezon Channel Webhook envelope', async () => {
    const draft = createAnnouncementDraft();
    const fetcher = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    await sendWebhook('https://webhook.mezon.ai/webhooks/123/token', draft, fetcher);

    const [url, request] = fetcher.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://webhook.mezon.ai/webhooks/123/token');
    expect(request.method).toBe('POST');
    expect(request.headers).toEqual({ 'Content-Type': 'application/json' });
    expect(JSON.parse(request.body as string)).toEqual({ type: 'hook', message: toMezonContent(draft) });
  });

  // Mutation caught: untrusted card fields reach Mezon through the converter's object spread.
  it('strips untrusted properties from the Mezon request payload', async () => {
    const draft = createAnnouncementDraft() as ReturnType<typeof createAnnouncementDraft> & { webhookUrl?: string; card: ReturnType<typeof createAnnouncementDraft>['card'] & { webhookUrl?: string } };
    draft.webhookUrl = 'root-secret';
    draft.card.webhookUrl = 'card-secret';
    const fetcher = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));

    await sendWebhook('https://webhook.mezon.ai/webhooks/123/token', draft, fetcher);

    const [, request] = fetcher.mock.calls[0] as [string, RequestInit];
    const payload = JSON.parse(request.body as string);
    expect(payload).not.toHaveProperty('webhookUrl');
    expect(payload.message.embed[0]).not.toHaveProperty('webhookUrl');
  });

  // Mutation caught: a non-Mezon host can make a request with a supplied token.
  it('rejects a non-Mezon webhook URL before any request', async () => {
    const fetcher = vi.fn();
    await expect(sendWebhook('https://example.com/webhooks/123/token', createAnnouncementDraft(), fetcher)).rejects.toThrow('valid Mezon Channel Webhook URL');
    expect(fetcher).not.toHaveBeenCalled();
  });

  // Mutation caught: paths, credentials, or a different transport are treated as valid delivery URLs.
  it('accepts only the documented credential-free HTTPS webhook path', () => {
    expect(validateWebhookUrl('https://webhook.mezon.ai/webhooks/channel/token')).toBe(true);
    expect(validateWebhookUrl('http://webhook.mezon.ai/webhooks/channel/token')).toBe(false);
    expect(validateWebhookUrl('https://user:pass@webhook.mezon.ai/webhooks/channel/token')).toBe(false);
    expect(validateWebhookUrl('https://webhook.mezon.ai/webhooks/channel/token/extra')).toBe(false);
  });

  // Mutation caught: response and network errors either look successful or leak the secret URL.
  it('returns safe delivery errors without including the webhook URL', async () => {
    const webhookUrl = 'https://webhook.mezon.ai/webhooks/123/a-secret-token';

    await expect(sendWebhook(webhookUrl, createAnnouncementDraft(), vi.fn().mockResolvedValue(new Response('', { status: 403 })))).rejects.toThrow('Mezon could not accept the message');
    await expect(sendWebhook(webhookUrl, createAnnouncementDraft(), vi.fn().mockRejectedValue(new Error('network offline')))).rejects.toThrow('Could not reach Mezon');
  });
});
