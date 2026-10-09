import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const cli = require.resolve('@playwright/test/cli');
const files = readdirSync('tests/e2e').filter(name => name.endsWith('.spec.ts')).sort();
// Each process owns its CI web servers. Their shutdown isolates the real
// per-IP auth limits between unrelated stories without relaxing application limits.
for (const file of files) {
  console.log(`\nBrowser verification: ${file}`);
  const result = spawnSync(process.execPath, [cli, 'test', `tests/e2e/${file}`], { stdio: 'inherit', env: process.env });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
console.log(`\nAll ${files.length} browser test files passed in desktop and mobile.`);
