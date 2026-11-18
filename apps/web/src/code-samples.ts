import type { ChannelWebhookEnvelope, ChannelWebhookMessage } from '@mezonhook/schema';

export type BotDelivery = {
  content: Pick<ChannelWebhookMessage, 't' | 'mk' | 'hg'>;
  mentions: Array<{ username?: string; user_id?: string; s: number; e: number }>;
  attachments: Array<{ filename: string; size: number; url: string; filetype: string; width: number; height: number }>;
};

export function toBotDelivery(message: ChannelWebhookMessage): BotDelivery {
  return {
    content: {
      t: message.t,
      mk: message.mk.map((entry) => ({ ...entry })),
      hg: message.hg.map((entry) => ({ ...entry })),
    },
    mentions: message.mentions.map((entry) => ({ ...entry })),
    attachments: message.images.map((image) => ({
      filename: image.fn,
      size: image.sz,
      url: image.url,
      filetype: image.ft,
      width: image.w,
      height: image.h,
    })),
  };
}

export function makeCodeSamples(envelope: ChannelWebhookEnvelope, webhookUrl?: string): { curl: string; bot: string } {
  const payload = JSON.stringify(envelope, null, 2);
  const shellPayload = payload.replace(/'/g, "'\\''");
  const target = webhookUrl || 'https://webhook.mezon.ai/webhooks/{channelId}/{token}';
  const delivery = toBotDelivery(envelope.message);
  const content = JSON.stringify(delivery.content, null, 2);
  const mentions = JSON.stringify(delivery.mentions, null, 2);
  const attachments = JSON.stringify(delivery.attachments, null, 2);
  return {
    curl: [
      `curl --location '${target}' \\`,
      "  --header 'Content-Type: application/json' \\",
      `  --data-raw '${shellPayload}'`,
    ].join('\n'),
    bot: `import { MezonClient } from 'mezon-sdk';

const required = ['MEZON_BOT_ID', 'MEZON_BOT_TOKEN', 'MEZON_CHANNEL_ID', 'MEZON_HOST', 'MEZON_PORT'];
for (const name of required) {
  if (!process.env[name]) throw new Error(\`Missing required environment variable: \${name}\`);
}

const content = ${content};
const mentions = ${mentions};
const attachments = ${attachments};
const client = new MezonClient({
  botId: process.env.MEZON_BOT_ID,
  token: process.env.MEZON_BOT_TOKEN,
  host: process.env.MEZON_HOST,
  port: process.env.MEZON_PORT,
  useSSL: true,
  timeout: Number(process.env.MEZON_CLIENT_TIMEOUT || 10) * 1000,
});
console.log('Connecting Mezon Bot SDK…');
await client.login();
console.log('Authenticated. Resolving channel…');
const channel = await client.channels.fetch(process.env.MEZON_CHANNEL_ID);
console.log('Channel resolved. Sending message…');
await channel.send(content, mentions, attachments);
console.log('Message sent by Mezon Bot SDK.');
process.exit(0);`,
  };
}
