// Builds each package's test fixtures (its test/fixtures/build.mjs) into _site/<name>/fixtures/,
// for the browser tests. Run after pnpm site; the fixtures are not part of the published site.
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { packages } from './packages.mjs';

for (const { dir } of packages()) {
  const script = join(dir, 'test/fixtures/build.mjs');
  if (existsSync(script)) execFileSync(process.execPath, [script], { stdio: 'inherit' });
}
