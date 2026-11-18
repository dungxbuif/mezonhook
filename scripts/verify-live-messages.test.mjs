import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

test('dry-run catalogs the generated full Bot project without credentials', () => {
  const result = spawnSync(process.execPath, ['--import', 'tsx', 'scripts/verify-live-messages.mjs', '--mode=dry-run'], {
    cwd: process.cwd(),
    encoding: 'utf8',
    env: { ...process.env, MEZON_BOT_ID: '', MEZON_BOT_TOKEN: '', MEZON_CHANNEL_ID: '', MEZON_WEBHOOK_URL: '' },
  });

  assert.equal(result.status, 0, result.stderr);
  const records = result.stdout.trim().split('\n').map((line) => JSON.parse(line));
  assert.ok(records.some(({ transport, format, status }) =>
    transport === 'bot' && format === 'generated-full-project' && status === 'planned'));
});
