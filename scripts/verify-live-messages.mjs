import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { makeCodeSamples } from '../apps/web/src/code-samples.ts';
import { assertAuthorizedWebhookUrl } from './live-verification-policy.mjs';

const TEST_CHANNEL_ID = '2096923994367201280';
const IMAGE = {
  fn: 'thumbnail_dog1.jpg',
  sz: 5620,
  url: 'https://cdn.mezon.vn/0/1843962578301095936/1829065039080853500/95_0thumbnail_dog1.jpg',
  ft: 'image/jpeg',
  w: 275,
  h: 183,
};
const marker = process.env.MEZON_AUDIT_MARKER || `MEZONHOOK-LIVE-${new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14)}`;
const mode = process.argv.find((value) => value.startsWith('--mode='))?.split('=')[1] || 'dry-run';
const results = [];

const range = (text, needle) => {
  const s = text.indexOf(needle);
  if (s < 0) throw new Error(`Cannot find range text: ${needle}`);
  return { s, e: s + needle.length };
};
const message = (t, overrides = {}) => ({ t, mk: [], mentions: [], images: [], hg: [], ...overrides });
const record = (transport, format, status, detail = '') => {
  const result = { transport, format, status, marker, detail };
  results.push(result);
  console.log(JSON.stringify(result));
};
const requireEnv = (...names) => {
  for (const name of names) if (!process.env[name]) throw new Error(`Missing required environment variable: ${name}`);
};

function webhookCases() {
  const preText = `${marker} pre: Việt Nam 🚀`;
  const linkText = `${marker} link: https://mezon.ai`;
  const mentionText = `${marker} mention: @audit-bot`;
  const hashtagText = `${marker} channel: #verification`;
  return [
    ['plain', message(`${marker} plain: Tiếng Việt ✓`)],
    ['pre', message(preText, { mk: [{ type: 'pre', ...range(preText, 'Việt Nam 🚀') }] })],
    ['link', message(linkText, { mk: [{ type: 'lk', ...range(linkText, 'https://mezon.ai') }] })],
    ['mention-bot-self', message(mentionText, { mentions: [{ user_id: process.env.MEZON_BOT_ID || 'dry-run-bot', ...range(mentionText, '@audit-bot') }] })],
    ['image', message(`${marker} image attachment`, { images: [IMAGE] })],
    ['channel-hashtag', message(hashtagText, { hg: [{ channelId: TEST_CHANNEL_ID, ...range(hashtagText, '#verification') }] })],
  ];
}

async function verifyWebhook() {
  requireEnv('MEZON_WEBHOOK_URL');
  for (const [format, payloadMessage] of webhookCases()) {
    const response = await fetch(process.env.MEZON_WEBHOOK_URL, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'hook', message: payloadMessage }),
    });
    if (!response.ok) throw new Error(`Webhook ${format} returned HTTP ${response.status}`);
    record('webhook', format, 'accepted', `HTTP ${response.status}`);
  }
}

async function runExactGeneratedBotSample() {
  requireEnv('MEZON_BOT_ID', 'MEZON_BOT_TOKEN', 'MEZON_CHANNEL_ID');
  const text = `${marker} generated sample @audit-bot #verification`;
  const envelope = { type: 'hook', message: message(text, {
    mk: [{ type: 'pre', ...range(text, 'generated sample') }],
    mentions: [{ user_id: process.env.MEZON_BOT_ID, ...range(text, '@audit-bot') }],
    images: [IMAGE],
    hg: [{ channelId: TEST_CHANNEL_ID, ...range(text, '#verification') }],
  }) };
  const sample = makeCodeSamples(envelope).bot;
  const directory = await mkdtemp(join(process.cwd(), '.mezonhook-sample-'));
  const filename = join(directory, 'generated-bot-sample.mjs');
  try {
    await writeFile(filename, sample, { mode: 0o600 });
    const execution = spawnSync(process.execPath, [filename], {
      cwd: process.cwd(), env: process.env, encoding: 'utf8', timeout: 45_000,
    });
    if (execution.error) throw new Error(`${execution.error.message}; sample stdout: ${execution.stdout.trim() || '(none)'}`);
    if (execution.status !== 0) throw new Error(`Generated sample failed with exit ${execution.status}: ${execution.stderr.trim()}`);
    record('bot', 'generated-web-sample', 'accepted', 'Exact generated JavaScript exited 0');
  } finally { await rm(directory, { recursive: true, force: true }); }
}

async function verifyBotOnlyFormats() {
  requireEnv('MEZON_BOT_ID', 'MEZON_BOT_TOKEN', 'MEZON_CHANNEL_ID');
  const { MezonClient, InteractiveBuilder, ButtonBuilder, EButtonMessageStyle } = await import('mezon-sdk');
  const client = new MezonClient({ botId: process.env.MEZON_BOT_ID, token: process.env.MEZON_BOT_TOKEN });
  await client.login();
  const channel = await client.channels.fetch(process.env.MEZON_CHANNEL_ID);
  const selectedFormats = new Set((process.env.MEZON_AUDIT_FORMATS || '').split(',').filter(Boolean));
  const send = async (format, content) => {
    if (selectedFormats.size > 0 && !selectedFormats.has(format)) return;
    await channel.send(content);
    record('bot', format, 'accepted', 'channel.send resolved');
  };

  await send('embed', { t: `${marker} embed`, embed: [new InteractiveBuilder('Verified embed').setDescription('Authenticated Bot SDK embed').addField('Status', 'accepted', true).build()] });
  await send('buttons', { t: `${marker} buttons`, components: [{ components: new ButtonBuilder().addButton(`${marker}-primary`, 'Primary', EButtonMessageStyle.PRIMARY).addButton(`${marker}-success`, 'Success', EButtonMessageStyle.SUCCESS).build() }] });
  await send('input', { t: `${marker} input`, embed: [new InteractiveBuilder('Input field').addInputField(`${marker}-input`, 'Response', 'Type a response', { type: 'text', textarea: false }, 'Bot-only input').build()] });
  await send('select', { t: `${marker} select`, embed: [new InteractiveBuilder('Select field').addSelectField(`${marker}-select`, 'Select one', [{ label: 'Alpha', value: 'alpha' }, { label: 'Beta', value: 'beta' }], undefined, 'Bot-only select').build()] });
  await send('radio', { t: `${marker} radio`, embed: [new InteractiveBuilder('Radio field').addRadioField(`${marker}-radio`, 'Choose one', [{ label: 'Yes', value: 'yes' }, { label: 'No', value: 'no' }], 'Bot-only radio', 1).build()] });
  await send('date-picker', { t: `${marker} date`, embed: [new InteractiveBuilder('Date picker').addDatePickerField(`${marker}-date`, 'Choose a date', 'Bot-only date picker').build()] });
  await send('animation', { t: `${marker} animation`, embed: [new InteractiveBuilder('Animation').addAnimation(`${marker}-animation`, { url_image: IMAGE.url, url_position: IMAGE.url, pool: ['audit'], repeat: 1, duration: 500 }, 'Animation', 'SDK animation payload').build()] });
  process.exit(0);
}

if (process.env.MEZON_CHANNEL_ID && process.env.MEZON_CHANNEL_ID !== TEST_CHANNEL_ID) {
  throw new Error(`Refusing to test outside the authorized channel ${TEST_CHANNEL_ID}.`);
}
if (process.env.MEZON_WEBHOOK_URL) assertAuthorizedWebhookUrl(process.env.MEZON_WEBHOOK_URL, TEST_CHANNEL_ID);

if (mode === 'dry-run') {
  for (const [format] of webhookCases()) record('webhook', format, 'planned');
  for (const format of ['generated-web-sample', 'embed', 'buttons', 'input', 'select', 'radio', 'date-picker', 'animation']) record('bot', format, 'planned');
} else {
  if (mode === 'webhook' || mode === 'all') await verifyWebhook();
  if (mode === 'bot' || mode === 'all') { await runExactGeneratedBotSample(); await verifyBotOnlyFormats(); }
}

