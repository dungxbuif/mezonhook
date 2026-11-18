export function assertAuthorizedWebhookUrl(rawUrl, authorizedChannelId) {
  let url;
  try { url = new URL(rawUrl); }
  catch { throw new Error('MEZON_WEBHOOK_URL must be a valid HTTPS Mezon webhook URL.'); }

  const segments = url.pathname.split('/').filter(Boolean);
  const validShape = url.protocol === 'https:'
    && url.hostname === 'webhook.mezon.ai'
    && segments[0] === 'webhooks'
    && Boolean(segments[1])
    && Boolean(segments[2]);
  if (!validShape) throw new Error('MEZON_WEBHOOK_URL must be a valid HTTPS Mezon webhook URL.');
  if (segments[1] !== authorizedChannelId) {
    throw new Error(`Refusing to test a webhook outside the authorized channel ${authorizedChannelId}.`);
  }
}
