// Builds dist/: ES modules with esbuild (shared code split into chunks), declarations with tsc,
// and the stylesheet. Output is readable, not minified: consumers minify in their own build.
import { build } from 'esbuild';
import { execFileSync } from 'node:child_process';
import { copyFileSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';

rmSync('dist', { recursive: true, force: true });

await build({
  entryPoints: ['src/index.ts', 'src/drag.ts', 'src/autoplay.ts', 'src/markup.ts', 'src/react.ts', 'src/preact.ts'],
  outdir: 'dist',
  bundle: true,
  splitting: true,
  format: 'esm',
  target: 'es2022',
  external: ['react', 'preact', 'preact/hooks'],
  chunkNames: 'shared/[name]-[hash]',
  logLevel: 'warning',
});

execFileSync('node_modules/.bin/tsc', ['-p', 'tsconfig.json', '--emitDeclarationOnly'], { stdio: 'inherit' });
// Declarations keep the source's .ts import specifiers; point them at the emitted .js files.
for (const file of readdirSync('dist').filter((name) => name.endsWith('.d.ts'))) {
  const path = `dist/${file}`;
  writeFileSync(path, readFileSync(path, 'utf8').replace(/(from '\.\/[\w-]+)\.ts'/g, "$1.js'"));
}
copyFileSync('src/carousel.css', 'dist/carousel.css');
console.log('dist/ built');
