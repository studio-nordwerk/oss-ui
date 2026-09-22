// Builds dist/ of every package, or of the packages named on the command line:
//   node scripts/build.mjs [name ...]
// What goes in follows the package's exports. Each ./dist/<name>.js is built from src/<name>.ts
// with esbuild (shared code split into chunks), each ./dist/<name>.css is copied from src/, and
// ./dist/<name>.layer.css is src/<name>.css inside Tailwind's components layer. Declarations come
// from tsc. Output is readable, not minified: consumers minify in their own build.
import { build } from 'esbuild';
import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { bin, exportedFiles, packages } from './packages.mjs';

for (const { name, dir, manifest } of packages()) {
  const dist = join(dir, 'dist');
  rmSync(dist, { recursive: true, force: true });
  mkdirSync(dist);
  const files = exportedFiles(manifest).filter((file) => file.startsWith('./dist/'));
  const scripts = files.filter((file) => file.endsWith('.js')).map((file) => join(dir, 'src', `${basename(file, '.js')}.ts`));
  const peers = Object.keys(manifest.peerDependencies ?? {});

  await build({
    entryPoints: scripts,
    outdir: dist,
    bundle: true,
    splitting: true,
    format: 'esm',
    target: 'es2022',
    external: peers.flatMap((peer) => [peer, `${peer}/*`]),
    chunkNames: 'shared/[name]-[hash]',
    logLevel: 'warning',
  });

  execFileSync(bin('tsc'), ['-p', join(dir, 'tsconfig.json'), '--emitDeclarationOnly'], { stdio: 'inherit' });
  // Declarations keep the source's .ts import specifiers; point them at the emitted .js files.
  for (const file of readdirSync(dist).filter((file) => file.endsWith('.d.ts'))) {
    const path = join(dist, file);
    writeFileSync(path, readFileSync(path, 'utf8').replace(/(from '\.\/[\w-]+)\.ts'/g, "$1.js'"));
  }
  // A React entry holds hooks, so React Server Components (Next.js App Router) must treat it as a
  // client module. esbuild drops module directives when bundling; put it back on the entry.
  const react = join(dist, 'react.js');
  if (existsSync(react)) writeFileSync(react, `'use client';\n${readFileSync(react, 'utf8')}`);

  for (const file of files.filter((file) => file.endsWith('.css')).map((file) => basename(file))) {
    if (file.endsWith('.layer.css')) {
      // The same rules in Tailwind's components layer, for projects whose utilities must be able
      // to override them. The order statement matches Tailwind's, so load order does not matter:
      // the base layer (preflight) never beats the package, and utilities always win.
      const source = readFileSync(join(dir, 'src', file.replace('.layer.css', '.css')), 'utf8');
      writeFileSync(join(dist, file), `@layer theme, base, components, utilities;\n\n@layer components {\n${source}\n}\n`);
    } else {
      copyFileSync(join(dir, 'src', file), join(dist, file));
    }
  }
  console.log(`packages/${name}/dist built`);
}
