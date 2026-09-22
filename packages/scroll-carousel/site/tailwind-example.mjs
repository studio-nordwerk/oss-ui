// A copy-and-paste example with Tailwind CSS v4. The same markup is shown as code and, compiled
// by Tailwind, as a live preview in an iframe, so the preview is exactly what the code produces.

const products = [
  ['Linnea', 'Linen overshirt', '€89.00', 'bg-stone-200'],
  ['Arken', 'Merino crew neck, undyed', '€119.00', 'bg-sky-100'],
  ['Linnea', 'Wide trousers in washed cotton', '€79.00', 'bg-rose-100'],
  ['Holm & Co.', 'Canvas tote, 20 l', '€45.00', 'bg-amber-100'],
  ['Arken', 'Waxed field jacket', '€229.00', 'bg-emerald-100'],
  ['Holm & Co.', 'Leather card holder', '€35.00', 'bg-violet-100'],
  ['Linnea', 'Organic cotton tee, set of two', '€49.00', 'bg-orange-100'],
  ['Arken', 'Wool beanie', '€29.00', 'bg-teal-100'],
];

const chevron = (path) =>
  `<svg viewBox="0 0 24 24" class="size-5 rtl:-scale-x-100" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${path}"/></svg>`;

const arrow = (side, label, path) =>
  `  <button type="button" data-sc-${side} aria-label="${label}"
    class="absolute ${side == 'prev' ? 'start-3' : 'end-3'} top-[38%] z-10 hidden size-11 -translate-y-1/2 place-items-center rounded-full bg-white text-neutral-900 shadow-lg ring-1 ring-neutral-200 transition group-data-[sc-overflow]/row:grid hover:bg-neutral-900 hover:text-white aria-disabled:pointer-events-none aria-disabled:opacity-30">
    ${chevron(path)}
  </button>`;

/** The carousel markup: this is what goes into a page. */
export const markup = `<div class="sc group/row relative [--sc-gap:1rem] [--sc-dot:var(--color-neutral-900)]">
  <ul data-sc-track tabindex="0" aria-label="New arrivals"
    class="sc-track [--sc-group:page] [--sc-per-view:1.3] @md:[--sc-per-view:2] @3xl:[--sc-per-view:3] @5xl:[--sc-per-view:4] pb-1 focus-visible:outline-2 focus-visible:outline-neutral-900">
${products
  .map(
    ([brand, name, price, tint]) => `    <li>
      <a href="#" class="block h-full rounded-2xl bg-white p-3 ring-1 ring-neutral-200 transition hover:ring-neutral-400">
        <div class="aspect-square rounded-xl ${tint}"></div>
        <p class="mt-3 text-sm text-neutral-500">${brand}</p>
        <p class="font-medium text-balance text-neutral-900">${name}</p>
        <p class="mt-1 font-semibold text-neutral-900">${price}</p>
      </a>
    </li>`,
  )
  .join('\n')}
  </ul>
${arrow('prev', 'Previous products', 'm15 18-6-6 6-6')}
${arrow('next', 'Next products', 'm9 6 6 6-6 6')}
  <div data-sc-dots class="sc-dots mt-4"></div>
  <p data-sc-status aria-live="polite" class="sr-only"></p>
</div>`;

/** The stylesheet lines for a Tailwind project. */
export const css = `@import "tailwindcss";
/* In the components layer, so utilities on the markup can override the package's defaults. */
@import "@nordwerk/scroll-carousel/carousel.css" layer(components);`;

/** The script. */
export const script = `import { attach } from '@nordwerk/scroll-carousel';
import { drag } from '@nordwerk/scroll-carousel/drag';

for (const root of document.querySelectorAll('.sc')) attach(root, { plugins: [drag()] });`;

/** The preview page: the markup on a plain Tailwind page, with the package from the site. */
export const previewPage = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Tailwind example</title>
<link rel="stylesheet" href="tailwind-example.css">
<script type="module">
  import { attach } from './lib/index.js';
  import { drag } from './lib/drag.js';
  for (const root of document.querySelectorAll('.sc')) attach(root, { plugins: [drag()] });
  // Tell the page around the iframe how tall this is, so it never needs its own scrollbar.
  // The body's own height: the document's scroll height never drops below the iframe's.
  const report = () => parent.postMessage({ frameHeight: document.body.getBoundingClientRect().height }, '*');
  new ResizeObserver(report).observe(document.body);
  document.addEventListener('click', (event) => event.target.closest('a[href="#"]') && event.preventDefault());
</script>
</head>
<body class="bg-neutral-50 p-4 font-sans text-neutral-900 antialiased sm:p-6">
${markup}
</body>
</html>
`;
