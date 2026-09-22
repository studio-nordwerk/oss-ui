// The shared frame of the package documentation pages. A package's site/generate.mjs writes its
// page with page() and calls copyFrame() for the files the frame needs next to it.
//
// Contract with www.nordwerk.studio, which serves every page at /oss/<name> through a proxy:
// - Everything is linked relative to <base href>; the proxy rewrites that one attribute.
// - The proxy puts the studio's header at <!--nw:header--> (first child of .sheet) and its footer
//   at <!--nw:footer--> (right after .sheet). Keep one of each, <html lang="en"> and a <body>
//   without attributes, and data-hero on the page's introduction.
// Locally and on GitHub Pages the pages have no header or footer.
import { cpSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const here = import.meta.dirname;
const root = join(here, '..');

export const esc = (value) =>
  String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

/**
 * A complete page. `styles` load before the frame's stylesheet (the package's own stylesheet, so
 * the page can override it), `head` after it (the page stylesheet and scripts). `before` goes
 * ahead of the sheet, e.g. an SVG sprite; `body` is the page content inside it.
 */
export const page = ({ title, description, base, canonical, redirect, styles = [], head = '', before = '', body }) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<base href="${base}">
${redirect ? `<script>if (location.hostname.endsWith('github.io')) location.replace('${canonical}' + location.search + location.hash);</script>\n<link rel="canonical" href="${canonical}">` : ''}
<meta name="description" content="${esc(description)}">
<link rel="preload" href="fonts/geist-latin-wght-normal.woff2" as="font" type="font/woff2" crossorigin>
${styles.map((href) => `<link rel="stylesheet" href="${href}">`).join('\n')}
<link rel="stylesheet" href="frame.css">
<script type="module" src="frame.js"></script>
${head}
</head>
<body>
${before}
<div class="sheet">
<!--nw:header-->
<div class="page">
${body}
</div>
</div>
<!--nw:footer-->
<p class="toast" role="status"></p>
</body>
</html>
`;

/** Copies the frame's stylesheet, script and fonts into a page's output folder. */
export function copyFrame(out) {
  mkdirSync(join(out, 'fonts'), { recursive: true });
  cpSync(join(here, 'frame.css'), join(out, 'frame.css'));
  cpSync(join(here, 'frame.js'), join(out, 'frame.js'));
  for (const subset of ['latin', 'latin-ext']) {
    const file = `geist-${subset}-wght-normal.woff2`;
    cpSync(join(root, 'node_modules/@fontsource-variable/geist/files', file), join(out, 'fonts', file));
  }
}
