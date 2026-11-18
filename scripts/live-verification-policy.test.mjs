import assert from 'node:assert/strict';
import test from 'node:test';
import { assertAuthorizedWebhookUrl } from './live-verification-policy.mjs';

const channelId = '2096923994367201280';

test('accepts the authorized Mezon webhook channel', () => {
  assert.doesNotThrow(() => assertAuthorizedWebhookUrl(`https://webhook.mezon.ai/webhooks/${channelId}/secret`, channelId));
});

test('rejects a different webhook channel without exposing its token', () => {
  assert.throws(
    () => assertAuthorizedWebhookUrl('https://webhook.mezon.ai/webhooks/1111111111111111111/test-token', channelId),
    new RegExp(`authorized channel ${channelId}`),
  );
});

test('rejects a non-Mezon or malformed webhook URL', () => {
  assert.throws(() => assertAuthorizedWebhookUrl('https://example.com/webhooks/2096923994367201280/token', channelId));
  assert.throws(() => assertAuthorizedWebhookUrl('not-a-url', channelId));
});
