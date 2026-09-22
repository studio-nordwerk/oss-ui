// Fails when an entry grows past its budget. Budgets live in each package's budgets.json as
// [{ "name", "entry", "max" }], max in bytes. Sizes are what a consumer ships: bundled, minified
// with esbuild, gzip level 9.
import { build } from 'esbuild';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { packages } from './packages.mjs';

export const gzipSize = async (entry) => {
  const result = await build({
    entryPoints: [entry],
    bundle: true,
    minify: true,
    format: 'esm',
    write: false,
    logLevel: 'silent',
  });
  return gzipSync(result.outputFiles[0].contents, { level: 9 }).length;
};

if (import.meta.main) {
  let failed = false;
  for (const { name, dir } of packages()) {
    const file = join(dir, 'budgets.json');
    if (!existsSync(file)) continue;
    console.log(name);
    for (const budget of JSON.parse(readFileSync(file, 'utf8'))) {
      const size = await gzipSize(join(dir, budget.entry));
      const ok = size <= budget.max;
      failed ||= !ok;
      console.log(
        `  ${ok ? 'ok  ' : 'OVER'} ${(size / 1024).toFixed(2)} kB of ${(budget.max / 1024).toFixed(2)} kB  ${budget.name}`,
      );
    }
  }
  process.exit(failed ? 1 : 0);
}
