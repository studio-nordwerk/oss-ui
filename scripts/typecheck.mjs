// Type-checks every package: its sources, and its shadcn registry files where it has them.
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { bin, packages } from './packages.mjs';

for (const { dir } of packages()) {
  execFileSync(bin('tsc'), ['-p', join(dir, 'tsconfig.json'), '--noEmit'], { stdio: 'inherit' });
  const registry = join(dir, 'registry/tsconfig.json');
  if (existsSync(registry)) execFileSync(bin('tsc'), ['-p', registry], { stdio: 'inherit' });
}
