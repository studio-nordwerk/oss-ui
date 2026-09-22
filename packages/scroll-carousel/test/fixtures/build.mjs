// Builds the adapter fixtures into _site/scroll-carousel/fixtures/ for the browser tests: React
// and Preact pages rendered on the server and hydrated on the client, and an Astro page built with
// Astro. Run by scripts/fixtures.mjs after the package and site builds. Not part of the published
// site.
import { build } from 'esbuild';
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { h } from 'preact';
import renderPreact from 'preact-render-to-string';
import { Carousel as ReactCarousel } from '../../dist/react.js';
import { Carousel as PreactCarousel } from '../../dist/preact.js';
import { App } from './app.mjs';

const here = import.meta.dirname;
const repo = join(here, '../../../..');
const out = join(repo, '_site/scroll-carousel/fixtures');
mkdirSync(out, { recursive: true });

const page = (framework, markup) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${framework} fixture</title>
<link rel="stylesheet" href="../lib/carousel.css">
<script type="module" src="${framework}-client.js"></script>
</head>
<body>
<div id="app">${markup}</div>
<script>
  // What the server sent, and where the track stands before any module script runs.
  window.__server = document.getElementById('app').innerHTML;
  window.__startLeft = document.querySelector('[data-sc-track]').scrollLeft;
</script>
</body>
</html>
`;

writeFileSync(
  join(out, 'react.html'),
  page('react', renderToString(createElement(App, { h: createElement, Carousel: ReactCarousel }))),
);
writeFileSync(join(out, 'preact.html'), page('preact', renderPreact(h(App, { h, Carousel: PreactCarousel }))));

await build({
  entryPoints: { 'react-client': join(here, 'react-client.mjs'), 'preact-client': join(here, 'preact-client.mjs') },
  outdir: out,
  bundle: true,
  format: 'esm',
  minify: true,
  define: { 'process.env.NODE_ENV': '"development"' },
  logLevel: 'warning',
});

execFileSync(join(here, '../../node_modules/.bin/astro'), ['build', '--root', join(here, 'astro')], {
  stdio: 'inherit',
});
console.log('fixtures built');
