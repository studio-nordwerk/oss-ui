// publint and arethetypeswrong on each package's packed tarball, after a build:
// exports, types and files as they will be published. Exports without types (stylesheets, the
// Astro component) are left out of the type check; packages are ESM only on purpose.
import { execFileSync } from 'node:child_process';
import { bin, packages } from './packages.mjs';

for (const { name, dir, manifest } of packages()) {
  console.log(`\n${name}`);
  execFileSync(bin('publint'), ['--strict', dir], { stdio: 'inherit' });
  const untyped = Object.entries(manifest.exports ?? {})
    .filter(([key, target]) => typeof target === 'string' && key !== './package.json')
    .map(([key]) => key.slice(2));
  const exclude = untyped.length ? ['--exclude-entrypoints', ...untyped] : [];
  execFileSync(bin('attw'), ['--pack', dir, ...exclude, '--ignore-rules', 'cjs-resolves-to-esm'], { stdio: 'inherit' });
}
