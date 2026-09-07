import { createAnnouncementDraft } from '@mezonhook/schema';
import { describe, expect, it, vi } from 'vitest';
import { sendWebhook, validateWebhookUrl } from './webhook';

describe('Mezon Channel Webhooks', () => {
  // Mutation caught: delivery no longer uses the documented Mezon envelope.
  it('sends the documented Mezon Channel Webhook envelope', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    await sendWebhook('https://webhook.mezon.ai/webhooks/123/token', createAnnouncementDraft(), fetcher);

    expect(fetcher).toHaveBeenCalledWith(
      'https://webhook.mezon.ai/webhooks/123/token',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: expect.stringContaining('"type":"hook"'),
      }),
    );
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
