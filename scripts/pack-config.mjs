// The `vp pack` (tsdown) settings every package shares, read from the package's exports:
// each ./dist/<name>.js is built from src/<name>.ts, each ./dist/<name>.css is copied from src/,
// and ./dist/<name>.layer.css is src/<name>.css inside Tailwind's components layer. Peer
// dependencies stay external. Output is readable, not minified: consumers minify in their own
// build. Use in a package's vite.config.ts: defineConfig({ pack: packConfig(import.meta.dirname) })
import { readFileSync } from 'node:fs';
import { basename, join } from 'node:path';

export function packConfig(dir) {
  const manifest = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
  const files = Object.values(manifest.exports ?? {})
    .map((target) => (typeof target === 'string' ? target : target.default))
    .filter((file) => file.startsWith('./dist/'));
  const scripts = files.filter((file) => file.endsWith('.js')).map((file) => basename(file, '.js'));
  const styles = files.filter((file) => file.endsWith('.css')).map((file) => basename(file));
  return {
    entry: Object.fromEntries(scripts.map((name) => [name, `src/${name}.ts`])),
    format: 'esm',
    platform: 'neutral',
    target: 'es2022',
    fixedExtension: false,
    dts: true,
    report: false,
    // Exports, types and files as they will be published. Exports without types (stylesheets, an
    // Astro component) are left out of the type check; packages are ESM only on purpose.
    publint: { level: 'error', strict: true },
    attw: {
      level: 'error',
      ignoreRules: ['cjs-resolves-to-esm'],
      excludeEntrypoints: Object.entries(manifest.exports ?? {})
        .filter(([key, target]) => typeof target === 'string' && key !== './package.json')
        .map(([key]) => key),
    },
    outputOptions: {
      chunkFileNames: 'shared/[name]-[hash].js',
      // A React entry holds hooks, so React Server Components (Next.js App Router) must treat it
      // as a client module.
      banner: (chunk) => (chunk.isEntry && chunk.name === 'react' ? "'use client';" : ''),
    },
    plugins: [
      {
        name: 'stylesheets',
        generateBundle() {
          for (const file of styles) {
            const layer = file.endsWith('.layer.css');
            const source = readFileSync(join(dir, 'src', layer ? file.replace('.layer.css', '.css') : file), 'utf8');
            // The .layer.css file holds the same rules in Tailwind's components layer, for projects
            // whose utilities must be able to override them. The order statement matches
            // Tailwind's, so load order does not matter: the base layer (preflight) never beats the
            // package, and utilities always win.
            const content = layer
              ? `@layer theme, base, components, utilities;\n\n@layer components {\n${source}\n}\n`
              : source;
            this.emitFile({ type: 'asset', fileName: file, source: content });
          }
        },
      },
    ],
  };
}
