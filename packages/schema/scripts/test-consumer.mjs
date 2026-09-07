import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const packageDirectory = new URL('..', import.meta.url).pathname;
const tempDirectory = mkdtempSync(join(tmpdir(), 'mezonhook-schema-consumer-'));
let archive;

try {
  const packOutput = execFileSync('npm', ['pack', '--json'], {
    cwd: packageDirectory,
    encoding: 'utf8',
  });
  const [{ filename }] = JSON.parse(packOutput);
  archive = join(packageDirectory, filename);

  writeFileSync(join(tempDirectory, 'package.json'), JSON.stringify({
    private: true,
    type: 'module',
    dependencies: {
      '@mezonhook/schema': `file:${archive}`,
      vite: '^6.0.0',
    },
  }));
  writeFileSync(join(tempDirectory, 'index.html'), '<div id="app"></div><script type="module" src="/src/main.ts"></script>');
  execFileSync('mkdir', ['-p', join(tempDirectory, 'src')]);
  writeFileSync(join(tempDirectory, 'src/main.ts'), "import { createAnnouncementDraft } from '@mezonhook/schema';\nconsole.log(createAnnouncementDraft());\n");

  execFileSync('npm', ['install', '--ignore-scripts', '--no-audit', '--no-fund'], {
    cwd: tempDirectory,
    stdio: 'inherit',
  });
  execFileSync('npx', ['vite', 'build'], { cwd: tempDirectory, stdio: 'inherit' });
} finally {
  rmSync(tempDirectory, { recursive: true, force: true });
  if (archive) rmSync(archive, { force: true });
}
