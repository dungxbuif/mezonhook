import { createChannelWebhookMessage } from '@mezonhook/schema';
import { describe, expect, it, vi } from 'vitest';
import { parseChannelWebhookEnvelope, sendChannelWebhookPayload, sendWebhookBatch, validateWebhookUrl } from './webhook';

describe('Mezon Channel Webhooks', () => {
  it('strictly parses all documented fields and rejects unknown or mistyped content', () => {
    const envelope = parseChannelWebhookEnvelope(JSON.stringify({
      type: 'hook',
      message: { t: 'Code link', mk: [{ type: 'pre', s: 0, e: 4 }], mentions: [], images: [], hg: [] },
    }));
    expect(envelope.message.t).toBe('Code link');
    expect(() => parseChannelWebhookEnvelope('{')).toThrow('Payload JSON is invalid.');
    expect(() => parseChannelWebhookEnvelope('{"type":"hook","message":{"t":"x","mk":"bad","mentions":[],"images":[],"hg":[]}}')).toThrow('message.mk');
    expect(() => parseChannelWebhookEnvelope('{"type":"hook","message":{"t":"x","mk":[],"mentions":[],"images":[],"hg":[],"secret":true}}')).toThrow('unsupported');
  });

  it('sends the inspected envelope unchanged', async () => {
    const payload = parseChannelWebhookEnvelope('{"type":"hook","message":{"t":"Hello","mk":[],"mentions":[],"images":[],"hg":[]}}');
    const fetcher = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    await sendChannelWebhookPayload('https://webhook.mezon.ai/webhooks/123/token', payload, fetcher);
    expect(JSON.parse((fetcher.mock.calls[0][1] as RequestInit).body as string)).toEqual(payload);
  });

  it('sends each canonical message in order to each target', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    const count = await sendWebhookBatch(
      ['https://webhook.mezon.ai/webhooks/a/token', 'https://webhook.mezon.ai/webhooks/b/token'],
      [createChannelWebhookMessage('First'), createChannelWebhookMessage('Second')],
      fetcher,
    );
    expect(count).toBe(4);
    expect(fetcher.mock.calls.map(([url, request]) => [url, JSON.parse((request as RequestInit).body as string).message.t])).toEqual([
      ['https://webhook.mezon.ai/webhooks/a/token', 'First'],
      ['https://webhook.mezon.ai/webhooks/b/token', 'First'],
      ['https://webhook.mezon.ai/webhooks/a/token', 'Second'],
      ['https://webhook.mezon.ai/webhooks/b/token', 'Second'],
    ]);
  });

  it('accepts only the documented credential-free HTTPS webhook path', () => {
    expect(validateWebhookUrl('https://webhook.mezon.ai/webhooks/channel/token')).toBe(true);
    expect(validateWebhookUrl('http://webhook.mezon.ai/webhooks/channel/token')).toBe(false);
    expect(validateWebhookUrl('https://user:pass@webhook.mezon.ai/webhooks/channel/token')).toBe(false);
    expect(validateWebhookUrl('https://webhook.mezon.ai/webhooks/channel/token/extra')).toBe(false);
  });

  it('returns safe delivery errors without including the webhook URL', async () => {
    const webhookUrl = 'https://webhook.mezon.ai/webhooks/123/a-secret-token';
    const payload = parseChannelWebhookEnvelope('{"type":"hook","message":{"t":"Hello","mk":[],"mentions":[],"images":[],"hg":[]}}');
    await expect(sendChannelWebhookPayload(webhookUrl, payload, vi.fn().mockResolvedValue(new Response('', { status: 403 })))).rejects.toThrow('Mezon could not accept the message');
    await expect(sendChannelWebhookPayload(webhookUrl, payload, vi.fn().mockRejectedValue(new Error('network offline')))).rejects.toThrow('Could not reach Mezon');
  });
});
