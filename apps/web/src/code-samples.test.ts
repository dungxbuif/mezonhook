import { createChannelWebhookMessage, toChannelWebhookEnvelope } from '@mezonhook/schema';
import { describe, expect, it } from 'vitest';
import { makeCodeSamples, toBotDelivery } from './code-samples';

describe('executable delivery samples', () => {
  const message = {
    ...createChannelWebhookMessage('Code @bot #channel'),
    mk: [{ type: 'pre' as const, s: 0, e: 4 }],
    mentions: [{ user_id: 'bot-1', s: 5, e: 9 }],
    images: [{ fn: 'audit.png', sz: 123, url: 'https://cdn.mezon.ai/audit.png', ft: 'image/png', w: 320, h: 180 }],
    hg: [{ channelId: 'channel-1', s: 10, e: 18 }],
  };

  it('maps webhook-only fields to the documented Bot SDK send arguments', () => {
    expect(toBotDelivery(message)).toEqual({
      content: {
        t: 'Code @bot #channel',
        mk: [{ type: 'pre', s: 0, e: 4 }],
        hg: [{ channelId: 'channel-1', s: 10, e: 18 }],
      },
      mentions: [{ user_id: 'bot-1', s: 5, e: 9 }],
      attachments: [{ filename: 'audit.png', size: 123, url: 'https://cdn.mezon.ai/audit.png', filetype: 'image/png', width: 320, height: 180 }],
    });
  });

  it('generates a valid cURL command without audited literal plus prefixes', () => {
    const { curl } = makeCodeSamples(toChannelWebhookEnvelope(message), 'https://webhook.mezon.ai/webhooks/channel/token');
    expect(curl).toContain("--header 'Content-Type: application/json'");
    expect(curl).toContain("--data-raw '");
    expect(curl).not.toContain('\n+  --');
  });

  it('generates syntactically parseable one-shot Bot SDK code with full client setup', () => {
    const { bot } = makeCodeSamples(toChannelWebhookEnvelope(message));
    expect(bot).toContain('botId: process.env.MEZON_BOT_ID');
    expect(bot).toContain('token: process.env.MEZON_BOT_TOKEN');
    expect(bot).toContain('host: process.env.MEZON_HOST');
    expect(bot).toContain('port: process.env.MEZON_PORT');
    expect(bot).toContain('useSSL: true');
    expect(bot).toContain('timeout: Number(process.env.MEZON_CLIENT_TIMEOUT || 10) * 1000');
    expect(bot).toContain('await client.login()');
    expect(bot).toContain('await client.channels.fetch(process.env.MEZON_CHANNEL_ID)');
    expect(bot).toContain('await channel.send(content, mentions, attachments)');
    expect(bot).not.toContain('await channel.send({\n  "mentions"');
    const body = bot.replace("import { MezonClient } from 'mezon-sdk';", '');
    const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor as new (source: string) => (...args: unknown[]) => Promise<unknown>;
    expect(() => new AsyncFunction(body)).not.toThrow();
  });

  it('refuses to generate runnable samples from an invalid message', () => {
    expect(() => makeCodeSamples({ type: 'hook', message: createChannelWebhookMessage('') })).toThrow(/message\.t/);
  });
});
