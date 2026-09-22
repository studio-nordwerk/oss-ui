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
// The React entry holds hooks, so React Server Components (Next.js App Router) must treat it as
// a client module. esbuild drops module directives when bundling; put it back on the entry.
writeFileSync('dist/react.js', `'use client';\n${readFileSync('dist/react.js', 'utf8')}`);
copyFileSync('src/carousel.css', 'dist/carousel.css');
// The same rules in Tailwind's components layer, for projects whose utilities must be able to
// override them. The order statement matches Tailwind's, so load order does not matter: the
// base layer (preflight) never beats the layout, and utilities always win.
writeFileSync(
  'dist/carousel.layer.css',
  `@layer theme, base, components, utilities;\n\n@layer components {\n${readFileSync('src/carousel.css', 'utf8')}\n}\n`,
);
console.log('dist/ built');
