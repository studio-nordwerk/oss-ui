// Fails when an entry grows past its budget. Sizes are what a consumer ships: bundled,
// minified with esbuild, gzip level 9. Budgets in bytes.
import { build } from 'esbuild';
import { gzipSync } from 'node:zlib';

const budgets = [
  ['core (attach, arrows, dots, keyboard, announcements)', 'dist/index.js', 3600],
  ['drag plugin, on top of the core', 'dist/drag.js', 1000],
  ['autoplay plugin, on top of the core', 'dist/autoplay.js', 850],
  ['stylesheet', 'dist/carousel.css', 1500],
];

const measure = async (entry) => {
  const result = await build({ entryPoints: [entry], bundle: true, minify: true, format: 'esm', write: false, logLevel: 'silent' });
  return gzipSync(result.outputFiles[0].contents, { level: 9 }).length;
};

let failed = false;
for (const [name, entry, budget] of budgets) {
  // Plugins import only types and two small helpers from the core, so their bundle is what
  // they add on top of it.
  const size = await measure(entry);
  const ok = size <= budget;
  failed ||= !ok;
  console.log(`${ok ? 'ok  ' : 'OVER'} ${(size / 1024).toFixed(2)} kB of ${(budget / 1024).toFixed(2)} kB  ${name}`);
}
process.exit(failed ? 1 : 0);
