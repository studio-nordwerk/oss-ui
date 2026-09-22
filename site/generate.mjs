// Builds the documentation site into _site/: one static page with a live example per
// configuration, storefront patterns as wireframes, and the package itself from dist/.
// Run after the package build: pnpm site

import { build } from 'esbuild';
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import { PRE_POSITION } from '../dist/markup.js';
import { arrows, card, categories, days, esc, guide, guides, heroSlide, heroes, products, slug, sprite, status } from './content.mjs';
import { wireframeSection } from './wireframes.mjs';
import * as tailwind from './tailwind-example.mjs';
import { execFileSync } from 'node:child_process';

const here = dirname(fileURLToPath(import.meta.url));
// The page links everything relative to <base href>. GitHub Pages serves it under
// /scroll-carousel/; www.nordwerk.studio serves it under /oss/scroll-carousel/ and rewrites this
// one attribute on the way through, so the same files work in both places.
const BASE = process.env.SITE_BASE || '/scroll-carousel/';
const CANONICAL = 'https://www.nordwerk.studio/oss/scroll-carousel';
// Once nordwerk.studio serves the page, visitors of the GitHub Pages address are sent there.
const REDIRECT = process.env.SITE_REDIRECT == '1';
const root = join(here, '..');
const out = join(root, '_site');
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));

// --- Sizes: bundled, minified, gzip level 9 ---------------------------------------------------

async function gzipSize(entry) {
  const result = await build({ entryPoints: [join(root, entry)], bundle: true, minify: true, format: 'esm', write: false, logLevel: 'silent' });
  return gzipSync(result.outputFiles[0].contents, { level: 9 }).length;
}
const kb = (bytes) => `${(bytes / 1024).toFixed(1)} kB`;
const sizes = {
  core: kb(await gzipSize('dist/index.js')),
  drag: kb(await gzipSize('dist/drag.js')),
  autoplay: kb(await gzipSize('dist/autoplay.js')),
  css: kb(await gzipSize('dist/carousel.css')),
};

// --- Page pieces -----------------------------------------------------------------------------

const radios = (name, legend, options, checked) =>
  `<fieldset class="seg"><legend>${legend}</legend>${options
    .map(([value, label]) => `<label><input type="radio" name="${name}" value="${value}"${value === checked ? ' checked' : ''}>${label}</label>`)
    .join('')}</fieldset>`;

const PRESETS = [
  ['neutral', 'Neutral'],
  ['beauty', 'Beauty'],
  ['fashion', 'Fashion'],
  ['hardware', 'Hardware'],
  ['marketplace', 'Marketplace'],
  ['friendly', 'Friendly'],
];

const snippet = (parts) =>
  `<details class="code"><summary>How it is built</summary>${parts
    .map(([lang, text]) => `<pre data-lang="${lang}"><code>${esc(text.trim())}</code></pre>`)
    .join('')}</details>`;

const playButton = `<button class="sc-play" type="button" data-sc-play aria-label="Stop automatic scrolling"><svg class="sc-icon-play" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M8 5v14l11-7z"/></svg><svg class="sc-icon-pause" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z"/></svg></button>`;

// Same structure as the readout the script fills in, so filling it shifts nothing.
const readout = (id) =>
  `<p class="readout" data-readout="${id}"><span>index <b>0</b></span><span>page <b>1</b> of <b>1</b></span><span>isBeginning <b>true</b></span><span>isEnd <b>false</b></span><span>change events <b>0</b></span></p>`;

const IMPORTS = `import { attach } from '@nordwerk/scroll-carousel';
import '@nordwerk/scroll-carousel/carousel.css';`;

const cases = [
  {
    id: 'hero',
    title: 'Hero with dots and autoplay',
    text: 'One slide per view. It moves on every 5 seconds and pauses while the pointer is over a slide or the hero is off-screen. Keyboard focus entering the hero, a swipe, drag, arrow or dot stops it; only the button next to the dots starts it again. With reduced motion it starts stopped. After the last slide the first fades in again.',
    stage: 'stage stage--flush',
    body: `<section class="sc hero" data-case="hero" aria-roledescription="carousel" aria-label="Current offers">
          <div class="hero-bar"><div class="hero-pill">${playButton}<div class="sc-dots" data-sc-dots></div></div></div>
          <div class="sc-track" data-sc-track tabindex="0" role="group" aria-label="Offer slides">
${heroes.map(heroSlide).join('\n')}
          </div>
          ${arrows('offer')}
          ${status}
        </section>`,
    code: [
      ['html', `<section class="sc hero" aria-roledescription="carousel" aria-label="Current offers">
  <button class="sc-play" data-sc-play>…</button>
  <div class="sc-dots" data-sc-dots></div>
  <div class="sc-track" data-sc-track tabindex="0" role="group" aria-label="Offer slides">
    <div role="group" aria-roledescription="slide" aria-label="1 of 5">…</div>
    …
  </div>
  <button class="sc-nav sc-prev" data-sc-prev aria-label="Previous offer">…</button>
  <button class="sc-nav sc-next" data-sc-next aria-label="Next offer">…</button>
  <p class="sc-status" data-sc-status aria-live="polite"></p>
</section>`],
      ['css', `.hero { --sc-gap: 0px; } /* one per view is the default */`],
      ['js', `${IMPORTS}
import { autoplay } from '@nordwerk/scroll-carousel/autoplay';

attach(hero, { rewind: true, plugins: [autoplay({ delay: 5000 })] });`],
    ],
  },
  {
    id: 'bestsellers',
    title: 'Product row paged by group',
    text: 'Two, three or four products per view depending on the width of the row, set in container queries, and next or previous moves by the same number. Only page starts are snap points, so a swipe lands on a page too. Tab into the row to meet the skip link; arrow keys, Home and End work on the focused row. Adding a product at the front keeps the row where it is.',
    stage: 'stage',
    body: `<div class="shelf-head"><h3 id="bestsellers-title">Bestsellers this week</h3><a href="/c/bestsellers">View all 48</a></div>
        <div class="sc bestsellers" data-case="bestsellers">
          <a class="sc-skip" href="#after-bestsellers">Skip the bestseller row</a>
          <ul class="sc-track" data-sc-track tabindex="0" aria-labelledby="bestsellers-title">
${products.map(card).join('\n')}
          </ul>
          ${arrows('products')}
          <div class="sc-dots" data-sc-dots></div>
          ${status}
        </div>
        <span class="skip-target" id="after-bestsellers" tabindex="-1"></span>`,
    after: `<form class="api" data-api="bestsellers">
        <label for="api-index">slideTo(</label><input id="api-index" name="index" type="number" min="0" value="6"><label for="api-index">)</label>
        <button class="btn" type="submit">Run</button>
        <button class="btn" type="button" data-act="append">Add a product at the end</button>
        <button class="btn" type="button" data-act="prepend">Add one at the front</button>
        <button class="btn" type="button" data-act="remove">Remove the last one</button>
      </form>`,
    code: [
      ['css', `.bestsellers .sc-track { --sc-per-view: 2; --sc-group: 2; --sc-gap: 0.75rem; }
@container sc (min-width: 600px) { .bestsellers .sc-track { --sc-per-view: 3; --sc-group: 3; } }
@container sc (min-width: 900px) { .bestsellers .sc-track { --sc-per-view: 4; --sc-group: 4; } }`],
      ['js', `${IMPORTS}
import { drag } from '@nordwerk/scroll-carousel/drag';

const row = attach(bestsellers, { plugins: [drag()] });
row.slideTo(6);
bestsellers.addEventListener('sc:change', (event) => console.log(event.detail.page));`],
      ['jsx', `import { Carousel } from '@nordwerk/scroll-carousel/react';

<Carousel as="ul" label="Bestsellers" gap={12}
  perView={{ 0: 2, 600: 3, 900: 4 }} group={{ 0: 2, 600: 3, 900: 4 }}>
  {products.map((product) => <ProductCard key={product.id} {...product} />)}
</Carousel>`],
    ],
  },
  {
    id: 'phone',
    title: 'Free mode on a phone',
    text: 'A row at phone width with part of the third product showing and 16 px offsets at both ends. No arrows and no dots are rendered. Best judged on a real phone; with a mouse, drag the row.',
    custom: `<div class="phone-case">
        <div class="phone">
          <div class="shelf-head"><h3 id="phone-title">Picked for you</h3></div>
          <div class="sc phone-row" data-case="phone">
            <ul class="sc-track" data-sc-track tabindex="0" aria-labelledby="phone-title">
${products.slice(3, 11).map(card).join('\n')}
            </ul>
            ${status}
          </div>
        </div>
        <div class="phone-side">
          <fieldset data-snap-choice>
            <legend>After a swipe, the row</legend>
            <label><input type="radio" name="snap" value="mandatory" checked><span>comes to rest on the nearest product<small>scroll snap mandatory, like free mode with sticky</small></span></label>
            <label><input type="radio" name="snap" value="proximity"><span>rests on a product only when close to one<small>scroll snap proximity</small></span></label>
            <label><input type="radio" name="snap" value="none"><span>stops wherever momentum ends<small>no scroll snap, free mode without sticky</small></span></label>
          </fieldset>
          ${readout('phone')}
        </div>
      </div>`,
    code: [
      ['css', `.picks .sc-track {
  --sc-per-view: 2.3;
  --sc-gap: 0.75rem;
  --sc-offset-before: 1rem;
  --sc-offset-after: 1rem;
  --sc-snap: mandatory; /* or proximity, or none */
}
@media (max-width: 767px) { .picks { --sc-controls: none; } }`],
    ],
  },
  {
    id: 'guides',
    title: 'Centred slides',
    text: 'Each guide comes to rest in the centre, the first and last included, with the neighbours showing on both sides. One dot per guide.',
    stage: 'stage stage--bleed',
    body: `<div class="shelf-head"><h3 id="guides-title">Brewing guides</h3></div>
        <div class="sc guides" data-case="guides">
          <ul class="sc-track" data-sc-track tabindex="0" aria-labelledby="guides-title">
${guides.map(guide).join('\n')}
          </ul>
          ${arrows('guide')}
          <div class="sc-dots" data-sc-dots></div>
          ${status}
        </div>`,
    code: [
      ['css', `.guides .sc-track { --sc-per-view: 1.25; --sc-align: center; --sc-centered: 1; }
@container sc (min-width: 700px) { .guides .sc-track { --sc-per-view: 2.6; } }`],
    ],
  },
  {
    id: 'chips',
    title: 'Slides as wide as their content',
    text: 'Category links sized by their text. Proximity snap; the arrows move by one view of whole chips, and the edge fades only where there is more to scroll.',
    stage: 'stage',
    body: `<nav class="sc chips" data-case="chips" aria-label="Coffee categories">
          <ul class="sc-track" data-sc-track tabindex="0" aria-label="Categories">
${categories.map(([name, count], i) => `<li><a class="chip" href="/c/${slug(name)}"${i === 0 ? ' aria-current="page"' : ''}>${esc(name)} <span class="chip-count">${count}</span></a></li>`).join('\n')}
          </ul>
          ${arrows('categories')}
        </nav>`,
    code: [
      ['css', `.chips .sc-track { --sc-slide-size: auto; --sc-gap: 0.5rem; --sc-snap: proximity; --sc-group: page; }
/* The script marks the ends, so styles can react: */
.chips[data-sc-overflow]:not([data-sc-end]) .sc-track { mask-image: linear-gradient(to right, #000 85%, transparent); }`],
    ],
  },
  {
    id: 'dates',
    title: 'Date strip that opens on today',
    text: 'Opens on today, the 21st of 41 days. The script loads as a module, after the first paint, yet nothing jumps: a small inline snippet sets the start position while the page is parsed. Pages are counted from today, so on a wide row each step is a week starting on Monday. Adding a week before the first day keeps today where it is.',
    stage: 'stage pickup',
    body: `<div class="shelf-head"><h3 id="pickup-title">Choose a pick-up day</h3><p class="pickup-choice" aria-live="polite">Pick-up on Monday 21 September</p></div>
        <div class="sc dates" data-case="dates">
          <ul class="sc-track" data-sc-track tabindex="0" aria-labelledby="pickup-title">
${days}
          </ul>
          ${arrows('week')}
          ${status}
        </div>
<script>${PRE_POSITION}</script>`,
    after: `<div class="api" data-api="dates">
        <button class="btn" type="button" data-act="earlier">Add an earlier week</button>
        <button class="btn" type="button" data-act="later">Add a later week</button>
      </div>`,
    code: [
      ['html', `<div class="sc dates">
  <ul class="sc-track" data-sc-track tabindex="0" aria-label="Pick-up days">
    <li>…</li>
    <li data-sc-initial>…</li>
  </ul>
</div>
<script>/* PRE_POSITION from '@nordwerk/scroll-carousel/markup', inline */</script>`],
      ['css', `.dates .sc-track { --sc-per-view: 7; --sc-group: page; --sc-gap: 0.375rem; }
@container sc (max-width: 400px) { .dates .sc-track { --sc-per-view: 5; } }`],
    ],
  },
  {
    id: 'few',
    title: 'Too few slides to scroll',
    text: 'Two products in a row sized for three. No arrows, no dots, no dragging, and the row is no tab stop. Two ways to lay them out:',
    stage: 'stage',
    body: `<div class="shelf-head"><h3 id="few-title">Recently viewed</h3></div>
        <div class="few-grid">
          <figure>
            <div class="sc sc--center-few few" data-case="few">
              <ul class="sc-track" data-sc-track tabindex="0" aria-label="Recently viewed, centred">
${products.slice(0, 2).map(card).join('\n')}
              </ul>
              ${arrows('products')}
              <div class="sc-dots" data-sc-dots></div>
            </div>
            <figcaption>Centred, slide size kept: <code>.sc--center-few</code></figcaption>
          </figure>
          <figure>
            <div class="sc few few--clamped" data-case="fewClamped">
              <ul class="sc-track" data-sc-track tabindex="0" aria-label="Recently viewed, stretched">
${products.slice(0, 2).map(card).join('\n')}
              </ul>
              ${arrows('products')}
              <div class="sc-dots" data-sc-dots></div>
            </div>
            <figcaption>Per view clamped to the slide count: <code>--sc-count: 2</code></figcaption>
          </figure>
        </div>`,
    code: [['html', `<div class="sc sc--center-few">…</div>
<!-- or: <ul class="sc-track" style="--sc-count: 2"> -->`]],
  },
];

const copyBlock = (id, label, text) => `<div class="copy-block">
        <div class="copy-head"><span>${label}</span><button class="btn" type="button" data-copy="${id}">Copy</button></div>
        <pre><code id="${id}">${esc(text)}</code></pre>
      </div>`;

const tailwindSection = () => `<section class="case" id="tailwind" aria-labelledby="case-tailwind">
      <div class="case-head">
        <h2 id="case-tailwind">Tailwind CSS, copy and paste</h2>
        <p>The product row with Tailwind CSS v4: layout values as arbitrary properties, container-query variants for the breakpoints, and your own arrow buttons styled from the carousel's state, <code>group-data-[sc-overflow]/row:grid</code> and <code>aria-disabled:opacity-30</code>. Import the stylesheet into the components layer, so utilities can override it. The preview is this exact code, compiled by Tailwind.</p>
      </div>
      <iframe class="tw-preview" src="tailwind-example.html" title="Live preview of the Tailwind example" loading="lazy"></iframe>
      ${copyBlock('tw-css', 'CSS', tailwind.css)}
      ${copyBlock('tw-html', 'HTML', tailwind.markup)}
      ${copyBlock('tw-js', 'JavaScript', tailwind.script)}
    </section>`;

const shadcnUsage = `import {
  ScrollCarousel,
  ScrollCarouselContent,
  ScrollCarouselItem,
  ScrollCarouselPrevious,
  ScrollCarouselNext,
  ScrollCarouselDots,
} from "@/components/ui/scroll-carousel"

<ScrollCarousel aria-label="Bestsellers">
  <ScrollCarouselContent className="[--sc-group:page] [--sc-per-view:1.4] @md:[--sc-per-view:3] @4xl:[--sc-per-view:4]">
    {products.map((product) => (
      <ScrollCarouselItem key={product.id}>
        <ProductCard {...product} />
      </ScrollCarouselItem>
    ))}
  </ScrollCarouselContent>
  <ScrollCarouselPrevious />
  <ScrollCarouselNext />
  <ScrollCarouselDots />
</ScrollCarousel>`;

const shadcnSection = () => `<section class="case" id="shadcn" aria-labelledby="case-shadcn">
      <div class="case-head">
        <h2 id="case-shadcn">shadcn/ui: a component and five blocks</h2>
        <p>The component has the structure of shadcn's Carousel, on native scrolling: <code>ScrollCarousel</code>, <code>ScrollCarouselContent</code>, <code>ScrollCarouselItem</code>, <code>ScrollCarouselPrevious</code> and <code>ScrollCarouselNext</code>, plus <code>ScrollCarouselDots</code>, <code>ScrollCarouselPlay</code> and <code>useScrollCarousel()</code>. It uses your theme and shadcn's Button, and installs straight from the GitHub repository. Below are the five blocks as <code>shadcn add</code> installs them, with shadcn's default theme; the storefront patterns further down are the same five as wireframes.</p>
      </div>
      <iframe class="tw-preview sh-preview" src="shadcn-preview.html" title="Live preview of the shadcn blocks" loading="lazy"></iframe>
      ${copyBlock('shadcn-add', 'Add the component', 'npx shadcn@latest add studio-nordwerk/scroll-carousel/scroll-carousel')}
      ${copyBlock('shadcn-blocks', 'Or a block, which brings the component along', ['product-row', 'brand-teasers', 'hero-autoplay', 'image-gallery', 'logo-belt'].map((name) => `npx shadcn@latest add studio-nordwerk/scroll-carousel/${name}`).join('\n'))}
      ${copyBlock('shadcn-usage', 'Use it', shadcnUsage)}
    </section>`;

const caseSection = (c) => `<section class="case" id="${c.id}" aria-labelledby="case-${c.id}">
      <div class="case-head">
        <h2 id="case-${c.id}">${c.title}</h2>
        <p>${c.text}</p>
      </div>
      ${c.custom ?? `<div class="${c.stage}">
        ${c.body}
      </div>`}
      ${c.id == 'phone' ? '' : readout(c.id)}
      ${c.after ?? ''}
      ${snippet(c.code)}
    </section>`;

const GITHUB = 'https://github.com/studio-nordwerk/scroll-carousel';
const NPM = 'https://www.npmjs.com/package/@nordwerk/scroll-carousel';

const body = `${sprite}
<div class="sheet">
<!--nw:header-->
<div class="page">
  <section class="intro" data-hero aria-labelledby="page-title">
    <span class="nw-badge">Open source, MIT</span>
    <h1 id="page-title">scroll-carousel</h1>
    <p class="lede">A carousel that is a native horizontal scroller first. The layout is plain CSS with scroll snap, so the server markup is already the final layout. A small script adds arrows, dots, paging and an API; drag and autoplay are opt-in. No runtime dependencies.</p>
    <div class="actions">
      <a class="nw-btn" href="${GITHUB}#readme">Read the documentation</a>
      <a class="nw-btn nw-btn-line" href="${GITHUB}/blob/main/AGENTS.md">Guide for coding agents</a>
    </div>
    <p class="install"><code>pnpm add @nordwerk/scroll-carousel</code></p>
    <p class="sizes">Core <b>${sizes.core}</b>, drag <b>+${sizes.drag}</b>, autoplay <b>+${sizes.autoplay}</b>, stylesheet <b>${sizes.css}</b>, gzip and minified. React, Preact and Astro adapters included.</p>
    <p class="note">Every example below is live. Its readout shows the carousel's state; the change counter goes up by exactly one per settled move, however long the swipe. Switch the script off in the bar to see what ships before any JavaScript runs. All products and names are made up.</p>
  </section>

  <div class="bench-bar">
    <label class="preset">Style <select id="preset">${PRESETS.map(([value, label]) => `<option value="${value}">${label}</option>`).join('')}</select></label>
    ${radios('dir', 'Direction', [['ltr', 'Left to right'], ['rtl', 'Right to left']], 'ltr')}
    ${radios('drag', 'Mouse drag', [['on', 'On'], ['off', 'Off']], 'on')}
    ${radios('rewind', 'Rewind', [['off', 'Off'], ['scroll', 'Scroll back'], ['fade', 'Fade']], 'fade')}
    ${radios('script', 'Script', [['on', 'Attached'], ['off', 'Detached']], 'on')}
    <p class="metrics"><span>Layout shift <b id="cls">0.000</b></span><span>scrollend <b id="scrollend">…</b></span></p>
  </div>

  <main>
    <script>if (/[?&]dir=rtl/.test(location.search)) document.currentScript.parentElement.dir = 'rtl';</script>
    ${cases.map(caseSection).join('\n    ')}
    ${tailwindSection()}
    ${shadcnSection()}
    ${wireframeSection()}
  </main>

  <section class="closing" aria-labelledby="closing-title">
    <h2 id="closing-title">scroll-carousel ${pkg.version}</h2>
    <p>MIT licence. Not included on purpose: vertical carousels, zoom, a draggable scrollbar, slide effects, virtual slides, synced thumbnails and a true infinite loop.</p>
    <ul class="closing-links">
      <li><a href="${GITHUB}">Source on GitHub</a></li>
      <li><a href="${NPM}">Package on npm</a></li>
      <li><a href="${GITHUB}/blob/main/CHANGELOG.md">Changelog</a></li>
      <li><a href="${GITHUB}/blob/main/docs/migration.md">Replacing a library carousel</a></li>
    </ul>
  </section>
</div>
</div>
<!--nw:footer-->
<p class="toast" role="status"></p>`;

const page = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>scroll-carousel</title>
<base href="${BASE}">
${REDIRECT ? `<script>if (location.hostname.endsWith('github.io')) location.replace('${CANONICAL}' + location.search + location.hash);</script>\n<link rel="canonical" href="${CANONICAL}">` : ''}
<meta name="description" content="${esc(pkg.description)}">
<link rel="preload" href="fonts/geist-latin-wght-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="lib/carousel.css">
<link rel="stylesheet" href="demo.css">
<script type="module" src="demo.js"></script>
</head>
<body>
${body}
</body>
</html>
`;

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
cpSync(join(root, 'dist'), join(out, 'lib'), { recursive: true, filter: (src) => !src.endsWith('.d.ts') });
cpSync(join(here, 'demo.css'), join(out, 'demo.css'));
mkdirSync(join(out, 'fonts'));
for (const subset of ['latin', 'latin-ext']) {
  const file = `geist-${subset}-wght-normal.woff2`;
  cpSync(join(root, 'node_modules/@fontsource-variable/geist/files', file), join(out, 'fonts', file));
}
cpSync(join(here, 'demo.js'), join(out, 'demo.js'));
cpSync(join(root, 'AGENTS.md'), join(out, 'llms.txt'));
writeFileSync(join(out, 'index.html'), page);
// The shadcn blocks as a live preview: the registry files with shadcn's own Button, Badge and
// theme (site/shadcn-preview), bundled by esbuild and compiled by Tailwind.
const preview = join(here, 'shadcn-preview');
await build({
  entryPoints: { 'shadcn-preview': join(preview, 'main.tsx') },
  outdir: out,
  bundle: true,
  format: 'esm',
  minify: true,
  jsx: 'automatic',
  define: { 'process.env.NODE_ENV': '"production"' },
  alias: {
    '@/components/ui/scroll-carousel': join(root, 'registry/ui/scroll-carousel.tsx'),
    '@/components/ui/button': join(preview, 'components/ui/button.tsx'),
    '@/components/ui/badge': join(preview, 'components/ui/badge.tsx'),
    '@/lib/utils': join(preview, 'lib/utils.ts'),
  },
  logLevel: 'warning',
});
execFileSync(join(root, 'node_modules/.bin/tailwindcss'), ['-i', join(preview, 'index.css'), '-o', join(out, 'shadcn-preview.tailwind.css'), '--minify'], { stdio: 'pipe' });
writeFileSync(
  join(out, 'shadcn-preview.html'),
  `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>shadcn blocks</title>
<link rel="stylesheet" href="shadcn-preview.tailwind.css">
<link rel="stylesheet" href="shadcn-preview.css">
<script type="module" src="shadcn-preview.js"></script>
</head>
<body>
<div id="root"></div>
</body>
</html>
`,
);
// The shadcn registry as built JSON, installable by URL as well as by GitHub address.
execFileSync(join(root, 'node_modules/.bin/shadcn'), ['build', join(root, 'registry.json'), '--output', join(out, 'r'), '--cwd', root], { stdio: 'pipe' });
// The Tailwind preview: write the page, then let Tailwind compile exactly the classes it uses.
writeFileSync(join(out, 'tailwind-example.html'), tailwind.previewPage);
execFileSync(join(root, 'node_modules/.bin/tailwindcss'), ['-i', join(here, 'tailwind.css'), '-o', join(out, 'tailwind-example.css'), '--minify'], { stdio: 'pipe' });
writeFileSync(join(out, '.nojekyll'), '');
console.log(`_site/ written. Core ${sizes.core}, drag +${sizes.drag}, autoplay +${sizes.autoplay}, CSS ${sizes.css}`);
