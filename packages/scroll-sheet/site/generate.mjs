// The scroll-sheet documentation page: a live example per presentation and storefront use, the
// shadcn preview, and the package itself from dist/.
// Called by scripts/site.mjs at the repository root after the build: pnpm site

import { build } from 'esbuild';
import { execFileSync } from 'node:child_process';
import { cpSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import { copyFrame, page } from '../../../site/frame.mjs';
import { bag, brands, categories, closeButton, esc, shades, sizes, stores, tile } from './content.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const bin = (name) => join(root, '../../node_modules/.bin', name);
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));

// --- Sizes: bundled, minified, gzip level 9 ---------------------------------------------------

async function gzipSize(entry) {
  const result = await build({
    entryPoints: [join(root, entry)],
    bundle: true,
    minify: true,
    format: 'esm',
    write: false,
    logLevel: 'silent',
  });
  return gzipSync(result.outputFiles[0].contents, { level: 9 }).length;
}
const kb = (bytes) => `${(bytes / 1024).toFixed(1)} kB`;
const size = {
  core: kb(await gzipSize('dist/index.js')),
  history: kb(await gzipSize('dist/history.js')),
  keyboard: kb(await gzipSize('dist/keyboard.js')),
  css: kb(await gzipSize('dist/sheet.css')),
};

// --- Page pieces -----------------------------------------------------------------------------

const radios = (name, legend, options, checked) =>
  `<fieldset class="seg"><legend>${legend}</legend>${options
    .map(
      ([value, label]) =>
        `<label><input type="radio" name="${name}" value="${value}"${value === checked ? ' checked' : ''}>${label}</label>`,
    )
    .join('')}</fieldset>`;

const snippet = (parts) =>
  `<details class="code"><summary>How it is built</summary>${parts
    .map(([lang, text]) => `<pre data-lang="${lang}" tabindex="0"><code>${esc(text.trim())}</code></pre>`)
    .join('')}</details>`;

// Same structure as the readout the script fills in, so filling it shifts nothing.
const readout = (id) =>
  `<p class="readout" data-readout="${id}"><span>open <b>false</b></span><span>snap <b>–</b></span><span>closed by <b>–</b></span><span>page kept at <b>–</b></span></p>`;

const IMPORTS = `import { enhance } from '@nordwerk/scroll-sheet';
import '@nordwerk/scroll-sheet/sheet.css';`;

const sizesSheet = `<dialog class="ss" id="size-sheet" aria-labelledby="size-sheet-title" data-case-sheet="sizes">
          <div class="ss-panel">
            <i class="ss-snap" style="--ss-at: 50dvh" data-ss-initial></i>
            <span class="ss-handle" aria-hidden="true"></span>
            <header class="ss-header"><h2 id="size-sheet-title">Choose a size</h2>${closeButton('size-sheet')}</header>
            <div class="ss-body">
              <fieldset class="size-list">
                <legend class="visually-hidden">Size</legend>
${sizes.map(([label, price], i) => `                <label><input type="radio" name="size" value="${label}"${i == 1 ? ' checked' : ''}><span>${label}</span><span>${price} €</span></label>`).join('\n')}
              </fieldset>
              <p><label class="field">Engraving, up to 20 letters <input type="text" name="engraving" maxlength="20" autocomplete="off"></label></p>
              <p><button class="text-btn" type="button" commandfor="guide-sheet" command="show-modal">Size guide</button></p>
              <p class="muted">Free delivery from 25 €. Returns within 30 days.</p>
            </div>
            <footer class="ss-footer"><button class="nw-btn wide" type="button" commandfor="size-sheet" command="close">Add to bag</button></footer>
          </div>
          <div class="ss-rest"></div>
        </dialog>
        <dialog class="ss" id="guide-sheet" aria-labelledby="guide-sheet-title" data-case-sheet="guide">
          <div class="ss-panel">
            <span class="ss-handle" aria-hidden="true"></span>
            <header class="ss-header"><h2 id="guide-sheet-title">Size guide</h2>${closeButton('guide-sheet')}</header>
            <div class="ss-body">
              <p>30 ml lasts about six weeks with two sprays a day, 100 ml about five months. The travel sizes fit hand luggage.</p>
            </div>
          </div>
          <div class="ss-rest"></div>
        </dialog>`;

const cases = [
  {
    id: 'sizes',
    title: 'Size picker: a bottom sheet with a snap point',
    text: 'Opens at half the screen; drag it up to the full height or down to close it, and the button stays at the bottom edge. Below the full height a drag on the list moves the sheet, at the full height the list scrolls. The page behind keeps its place, focus goes back to the button you pressed, and with the keyboard plugin the sheet stays above the on-screen keyboard while you type an engraving. The size guide opens a second sheet on top.',
    body: `<ul class="tiles">
${[0, 1, 2, 3].map(tile).join('\n')}
        </ul>
        ${sizesSheet}`,
    code: [
      [
        'html',
        `<button type="button" commandfor="size-sheet" command="show-modal">Choose size</button>

<dialog class="ss" id="size-sheet" aria-labelledby="size-sheet-title">
  <div class="ss-panel">
    <i class="ss-snap" style="--ss-at: 50dvh" data-ss-initial></i>
    <span class="ss-handle" aria-hidden="true"></span>
    <header class="ss-header">
      <h2 id="size-sheet-title">Choose a size</h2>
      <button class="ss-close" type="button" commandfor="size-sheet" command="close" aria-label="Close">…</button>
    </header>
    <div class="ss-body">…</div>
    <footer class="ss-footer"><button type="button">Add to bag</button></footer>
  </div>
  <div class="ss-rest"></div>
</dialog>`,
      ],
      [
        'js',
        `${IMPORTS}
import { history } from '@nordwerk/scroll-sheet/history';
import { keyboard } from '@nordwerk/scroll-sheet/keyboard';

enhance(document, { plugins: [history(), keyboard()] });`,
      ],
    ],
  },
  {
    id: 'filter',
    title: 'Filter: a bottom sheet on phones, a drawer from the end on wide screens',
    text: 'One element, two presentations: <code>data-ss="bottom md:end"</code> switches at 48rem in CSS, so the server sends the same markup to every device and rotating a tablet just changes the layout. Drag the drawer towards its edge to close it.',
    body: `<div class="toolbar"><span class="muted">128 products</span><button class="nw-btn nw-btn-line" type="button" commandfor="filter-sheet" command="show-modal">Filter and sort</button></div>
        <dialog class="ss" data-ss="bottom md:end" id="filter-sheet" aria-labelledby="filter-sheet-title" data-case-sheet="filter">
          <div class="ss-panel">
            <span class="ss-handle" aria-hidden="true"></span>
            <header class="ss-header"><h2 id="filter-sheet-title">Filter and sort</h2>${closeButton('filter-sheet')}</header>
            <div class="ss-body">
              <p><label class="field">Search brands <input type="search" name="brand-search" autocomplete="off"></label></p>
              <fieldset class="check-list"><legend>Brand</legend>
${brands.map((brand) => `                <label><input type="checkbox" name="brand" value="${brand}"> ${brand}</label>`).join('\n')}
              </fieldset>
            </div>
            <footer class="ss-footer"><button class="nw-btn wide" type="button" commandfor="filter-sheet" command="close">Show 128 products</button></footer>
          </div>
          <div class="ss-rest"></div>
        </dialog>`,
    code: [
      [
        'html',
        `<dialog class="ss" data-ss="bottom md:end" id="filter-sheet" aria-labelledby="filter-sheet-title">
  <div class="ss-panel">…</div>
  <div class="ss-rest"></div>
</dialog>`,
      ],
    ],
  },
  {
    id: 'menu',
    title: 'Menu: a drawer from the start edge',
    text: 'The mobile navigation. It slides in from the left, or from the right in a right-to-left page, and a swipe back towards the edge closes it. Links inside work as links.',
    body: `<div class="toolbar"><button class="nw-btn nw-btn-line" type="button" commandfor="menu-sheet" command="show-modal" aria-label="Open the menu">☰ Menu</button><span class="muted">Sample Store</span></div>
        <dialog class="ss" data-ss="start" id="menu-sheet" aria-labelledby="menu-sheet-title" data-case-sheet="menu">
          <div class="ss-panel">
            <header class="ss-header"><h2 id="menu-sheet-title">Menu</h2>${closeButton('menu-sheet')}</header>
            <nav class="ss-body" aria-label="Categories"><ul class="menu-list">
${categories.map((name) => `              <li><a href="#menu" data-demo-link>${name}</a></li>`).join('\n')}
            </ul></nav>
          </div>
          <div class="ss-rest"></div>
        </dialog>`,
    code: [
      ['html', `<dialog class="ss" data-ss="start" id="menu-sheet" aria-labelledby="menu-sheet-title">…</dialog>`],
    ],
  },
  {
    id: 'cart',
    title: 'Mini cart: a drawer from the end edge',
    text: 'After adding a product, the bag slides in from the end edge with its total and the way to checkout. <code>data-ss-replace</code> closes other open sheets first, so it can be opened from inside the size picker without stacking.',
    body: `<div class="toolbar"><span class="muted">3 items</span><button class="nw-btn nw-btn-line" type="button" commandfor="cart-sheet" command="show-modal">Bag (3)</button></div>
        <dialog class="ss" data-ss="end" data-ss-replace id="cart-sheet" aria-labelledby="cart-sheet-title" data-case-sheet="cart">
          <div class="ss-panel">
            <header class="ss-header"><h2 id="cart-sheet-title">Your bag</h2>${closeButton('cart-sheet')}</header>
            <div class="ss-body"><ul class="bag-list">
${bag.map(([name, detail, price]) => `              <li><span class="bag-img"></span><span><b>${name}</b><br><span class="muted">${detail}</span></span><span>${price} €</span></li>`).join('\n')}
            </ul></div>
            <footer class="ss-footer"><p class="total"><span>Total</span><b>76.45 €</b></p><button class="nw-btn wide" type="button" data-demo-link>Go to checkout</button></footer>
          </div>
          <div class="ss-rest"></div>
        </dialog>`,
    code: [
      [
        'html',
        `<dialog class="ss" data-ss="end" data-ss-replace id="cart-sheet" aria-labelledby="cart-sheet-title">…</dialog>`,
      ],
    ],
  },
  {
    id: 'contact',
    title: 'Contact form: a centred dialog',
    text: 'A dialog in the centre on every screen. <code>&lt;form method="dialog"&gt;</code> closes it with the pressed button as the return value; the sheet reports that close like any other. Fields are 16 pixels, so iOS does not zoom in.',
    body: `<div class="toolbar"><button class="nw-btn nw-btn-line" type="button" commandfor="contact-sheet" command="show-modal">Write to us</button></div>
        <dialog class="ss" data-ss="center" id="contact-sheet" aria-labelledby="contact-sheet-title" data-case-sheet="contact">
          <div class="ss-panel">
            <header class="ss-header"><h2 id="contact-sheet-title">Write to us</h2>${closeButton('contact-sheet')}</header>
            <form class="ss-body" method="dialog">
              <p><label class="field">Your email <input type="email" name="email" autocomplete="email"></label></p>
              <p><label class="field">Message <textarea name="message" rows="4"></textarea></label></p>
              <p class="actions-row"><button class="nw-btn" value="send">Send</button><button class="nw-btn nw-btn-line" value="cancel" formnovalidate>Cancel</button></p>
            </form>
          </div>
          <div class="ss-rest"></div>
        </dialog>`,
    code: [
      [
        'html',
        `<dialog class="ss" data-ss="center" id="contact-sheet" aria-labelledby="contact-sheet-title">
  <div class="ss-panel">
    <form class="ss-body" method="dialog">…<button value="send">Send</button></form>
  </div>
  <div class="ss-rest"></div>
</dialog>`,
      ],
    ],
  },
  {
    id: 'stores',
    title: 'Store finder: three resting heights',
    text: 'Opens low, so the map above stays visible, and rests at a third, two thirds or the full height. Snap points are markers in the panel: <code>--ss-at</code> is how much of the sheet shows.',
    body: `<div class="map" aria-hidden="true"><span class="pin" style="--x: 30%; --y: 40%"></span><span class="pin" style="--x: 55%; --y: 30%"></span><span class="pin" style="--x: 70%; --y: 60%"></span></div>
        <div class="toolbar"><button class="nw-btn nw-btn-line" type="button" commandfor="store-sheet" command="show-modal">Find a store</button></div>
        <dialog class="ss" id="store-sheet" aria-labelledby="store-sheet-title" data-case-sheet="stores">
          <div class="ss-panel">
            <i class="ss-snap" style="--ss-at: 32dvh" data-ss-initial></i>
            <i class="ss-snap" style="--ss-at: 66dvh"></i>
            <span class="ss-handle" aria-hidden="true"></span>
            <header class="ss-header"><h2 id="store-sheet-title">Stores near you</h2>${closeButton('store-sheet')}</header>
            <div class="ss-body"><ul class="store-list">
${stores.map(([street, town, distance, hours]) => `              <li><b>${street}</b>, ${town}<br><span class="muted">${distance} · ${hours}</span></li>`).join('\n')}
            </ul></div>
          </div>
          <div class="ss-rest"></div>
        </dialog>`,
    code: [
      [
        'html',
        `<div class="ss-panel">
  <i class="ss-snap" style="--ss-at: 32dvh" data-ss-initial></i>
  <i class="ss-snap" style="--ss-at: 66dvh"></i>
  …
</div>`,
      ],
    ],
  },
  {
    id: 'lightbox',
    title: 'Lightbox: a full-screen dialog with a native scroller',
    text: 'The centred presentation stretched to the whole screen, dark, with a horizontal scroll-snap strip of images inside. Escape or the close button end it; the page does not move.',
    body: `<ul class="thumbs">
${shades.map((name, i) => `          <li><button class="thumb" type="button" commandfor="lightbox-sheet" command="show-modal" style="--hue: ${i * 50 + 10}" aria-label="Open image of shade ${name}"></button></li>`).join('\n')}
        </ul>
        <dialog class="ss lightbox" data-ss="center" id="lightbox-sheet" aria-label="Shades" data-case-sheet="lightbox">
          <div class="ss-panel">
            <header class="ss-header"><p>Shades</p>${closeButton('lightbox-sheet')}</header>
            <ul class="strip" tabindex="0" aria-label="Shades, scroll sideways">
${shades.map((name, i) => `              <li><figure><span class="swatch" style="--hue: ${i * 50 + 10}"></span><figcaption>${name}</figcaption></figure></li>`).join('\n')}
            </ul>
          </div>
          <div class="ss-rest"></div>
        </dialog>`,
    code: [
      [
        'css',
        `.lightbox { --ss-dialog-size: 100vw; --ss-radius: 0; --ss-bg: #111; --ss-fg: #fff; }
.lightbox .ss-panel { block-size: 100dvh; max-block-size: none; }`,
      ],
    ],
  },
];

const caseSection = (c) => `<section class="case" id="${c.id}" aria-labelledby="case-${c.id}">
      <div class="case-head">
        <h2 id="case-${c.id}">${c.title}</h2>
        <p>${c.text}</p>
      </div>
      <div class="stage">
        ${c.body}
      </div>
      ${readout(c.id)}
      ${snippet(c.code)}
    </section>`;

const copyBlock = (id, label, text) => `<div class="copy-block">
        <div class="copy-head"><span>${label}</span><button class="btn" type="button" data-copy="${id}">Copy</button></div>
        <pre tabindex="0"><code id="${id}">${esc(text)}</code></pre>
      </div>`;

const shadcnUsage = `import {
  ScrollSheet,
  ScrollSheetTrigger,
  ScrollSheetContent,
  ScrollSheetHeader,
  ScrollSheetTitle,
  ScrollSheetBody,
  ScrollSheetFooter,
  ScrollSheetClose,
} from "@/components/ui/scroll-sheet"

<ScrollSheet presentation="bottom md:end" snapPoints={["50dvh"]} initialSnap={0}>
  <ScrollSheetTrigger asChild><Button>Filter</Button></ScrollSheetTrigger>
  <ScrollSheetContent>
    <ScrollSheetHeader><ScrollSheetTitle>Filter</ScrollSheetTitle><ScrollSheetClose /></ScrollSheetHeader>
    <ScrollSheetBody>…</ScrollSheetBody>
    <ScrollSheetFooter><Button>Show 128 products</Button></ScrollSheetFooter>
  </ScrollSheetContent>
</ScrollSheet>`;

const BLOCKS = [
  'size-picker',
  'filter-drawer',
  'mini-cart',
  'store-finder',
  'mobile-menu',
  'contact-dialog',
  'lightbox',
];

const shadcnSection = () => `<section class="case" id="shadcn" aria-labelledby="case-shadcn">
      <div class="case-head">
        <h2 id="case-shadcn">shadcn/ui: a component and seven blocks</h2>
        <p>The component follows the part names of shadcn's Sheet and Drawer with the <code>ScrollSheet</code> prefix: <code>ScrollSheet</code>, <code>ScrollSheetTrigger</code>, <code>ScrollSheetContent</code>, <code>ScrollSheetHeader</code>, <code>ScrollSheetTitle</code>, <code>ScrollSheetDescription</code>, <code>ScrollSheetBody</code>, <code>ScrollSheetFooter</code>, <code>ScrollSheetClose</code> and <code>ScrollSheetHandle</code>. It installs straight from the GitHub repository and uses your theme. Below are the blocks as <code>shadcn add</code> installs them.</p>
      </div>
      <iframe class="preview" src="shadcn-preview.html" title="Live preview of the shadcn blocks" loading="lazy"></iframe>
      ${copyBlock('shadcn-add', 'Add the component', 'npx shadcn@latest add studio-nordwerk/oss-ui/scroll-sheet')}
      ${copyBlock('shadcn-blocks', 'Or a block, which brings the component along', BLOCKS.map((name) => `npx shadcn@latest add studio-nordwerk/oss-ui/${name}`).join('\n'))}
      ${copyBlock('shadcn-usage', 'Use it', shadcnUsage)}
    </section>`;

const platformSection = () => `<section class="case" id="platform" aria-labelledby="case-platform">
      <div class="case-head">
        <h2 id="case-platform">What the browser does, what the script adds</h2>
        <p>Switch JavaScript off in the bar above: every sheet still opens and closes with its buttons and Escape, sits in the top layer above everything else, keeps the page behind inert and in place, snaps while you drag, and returns focus in Chrome and Firefox. The script adds the rest.</p>
      </div>
      <table class="layers">
        <thead><tr><th scope="col">Behaviour</th><th scope="col">Without script</th><th scope="col">With the script</th></tr></thead>
        <tbody>
          <tr><th scope="row">Open and close</th><td><code>commandfor</code>, Escape</td><td>Same, plus a fallback for browsers without invoker commands</td></tr>
          <tr><th scope="row">Page behind</th><td>Locked in CSS, never moved; inert</td><td>Back where it was after the iOS keyboard moved it (keyboard plugin)</td></tr>
          <tr><th scope="row">Drag and snap points</th><td>CSS scroll snap; the sheet cannot be dragged away completely</td><td>Dragged away, it closes; opens at a marked snap point</td></tr>
          <tr><th scope="row">Tap on the dimmed area</th><td>Nothing</td><td>Closes; nothing underneath is clicked</td></tr>
          <tr><th scope="row">Backdrop while dragging</th><td colspan="2">Follows the sheet where scroll-driven animations exist (Chrome, Safari 26 and later)</td></tr>
          <tr><th scope="row">Back button, back swipe</th><td>Chrome on Android closes the dialog</td><td>Closes the top sheet (history plugin)</td></tr>
          <tr><th scope="row">Focus back to the button</th><td>Chrome and Firefox</td><td>Also Safari, which does not focus tapped buttons</td></tr>
          <tr><th scope="row">On-screen keyboard</th><td>16 px fields avoid the iOS zoom</td><td>Sheet above the keyboard on iOS (keyboard plugin)</td></tr>
        </tbody>
      </table>
    </section>`;

const GITHUB = 'https://github.com/studio-nordwerk/oss-ui';
const SOURCE = `${GITHUB}/tree/main/packages/scroll-sheet`;
const FILES = `${GITHUB}/blob/main/packages/scroll-sheet`;
const NPM = 'https://www.npmjs.com/package/@nordwerk/scroll-sheet';

const body = `<section class="intro" data-hero aria-labelledby="page-title">
    <span class="nw-badge">Open source, MIT</span>
    <h1 id="page-title">scroll-sheet</h1>
    <p class="lede">Bottom sheets, side drawers and dialogs on a native modal dialog. Dragging, momentum and snap points are plain CSS scroll snap, and buttons open and close a sheet before any script runs; a small script adds the rest. No runtime dependencies.</p>
    <div class="actions">
      <a class="nw-btn" href="${SOURCE}#readme">Read the documentation</a>
      <a class="nw-btn nw-btn-line" href="${FILES}/AGENTS.md">Guide for coding agents</a>
    </div>
    <p class="install"><code>pnpm add @nordwerk/scroll-sheet</code></p>
    <p class="sizes">Core <b>${size.core}</b>, history <b>+${size.history}</b>, keyboard <b>+${size.keyboard}</b>, stylesheet <b>${size.css}</b>, gzip and minified. React, Preact and Astro adapters included.</p>
    <p class="note">Every example below is live. Switch JavaScript off in the bar to see what works before any JavaScript runs. All products, stores and names are made up.</p>
  </section>

  <div class="bench-bar">
    ${radios(
      'script',
      'JavaScript',
      [
        ['on', 'On'],
        ['off', 'Off, HTML and CSS only'],
      ],
      'on',
    )}
    ${radios(
      'history',
      'Back button',
      [
        ['on', 'Closes sheets'],
        ['off', 'Leaves the page'],
      ],
      'on',
    )}
    ${radios(
      'dir',
      'Direction',
      [
        ['ltr', 'Left to right'],
        ['rtl', 'Right to left'],
      ],
      'ltr',
    )}
  </div>

  <main>
    <script>if (/[?&]dir=rtl/.test(location.search)) document.documentElement.dir = 'rtl';</script>
    ${cases.map(caseSection).join('\n    ')}
    ${platformSection()}
    ${shadcnSection()}
  </main>

  <section class="closing" aria-labelledby="closing-title">
    <h2 id="closing-title">scroll-sheet ${pkg.version}</h2>
    <p>MIT licence. Not included on purpose: non-modal sheets over a usable page, horizontal drag handles without snap points, and animations other than slide and fade.</p>
    <ul class="closing-links">
      <li><a href="${SOURCE}">Source on GitHub</a></li>
      <li><a href="${NPM}">Package on npm</a></li>
      <li><a href="${FILES}/CHANGELOG.md">Changelog</a></li>
      <li><a href="${FILES}/docs/migration.md">Replacing a sheet or modal library</a></li>
    </ul>
  </section>`;

/** Writes the page into `out`; `base` is its <base href>, `canonical` its address on nordwerk.studio. */
export default async function generate({ out, base, canonical, redirect }) {
  mkdirSync(out, { recursive: true });
  copyFrame(out);
  cpSync(join(root, 'dist'), join(out, 'lib'), { recursive: true, filter: (src) => !src.endsWith('.d.ts') });
  cpSync(join(here, 'demo.css'), join(out, 'demo.css'));
  cpSync(join(here, 'demo.js'), join(out, 'demo.js'));
  cpSync(join(root, 'AGENTS.md'), join(out, 'llms.txt'));
  writeFileSync(
    join(out, 'index.html'),
    page({
      title: 'scroll-sheet',
      description: pkg.description,
      base,
      canonical,
      redirect,
      styles: ['lib/sheet.css'],
      head: '<link rel="stylesheet" href="demo.css">\n<script type="module" src="demo.js"></script>',
      body,
    }),
  );
  // The shadcn blocks as a live preview: the registry files with shadcn's own Button and theme
  // (site/shadcn-preview), bundled by esbuild and compiled by Tailwind.
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
      '@/components/ui/scroll-sheet': join(root, 'registry/ui/scroll-sheet.tsx'),
      '@/components/ui/button': join(preview, 'components/ui/button.tsx'),
      '@/lib/utils': join(preview, 'lib/utils.ts'),
    },
    logLevel: 'warning',
  });
  execFileSync(
    bin('tailwindcss'),
    ['-i', join(preview, 'index.css'), '-o', join(out, 'shadcn-preview.tailwind.css'), '--minify'],
    { stdio: 'pipe' },
  );
  writeFileSync(
    join(out, 'shadcn-preview.html'),
    `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
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
  console.log(
    `${out} written. Core ${size.core}, history +${size.history}, keyboard +${size.keyboard}, CSS ${size.css}`,
  );
}
