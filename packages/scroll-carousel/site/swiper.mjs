// The page for teams coming from Swiper (swiper.html, at /oss/scroll-carousel/swiper): the five
// storefront patterns as wireframes with their options side by side, then every option and API
// call from docs/migration.md, so the two never drift apart. The main page links here.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { esc, slug } from './content.mjs';
import { patterns, wireframeSection } from './wireframes.mjs';

const inline = (text) => esc(text).replace(/`([^`]+)`/g, '<code>$1</code>');

/**
 * Just enough Markdown for docs/migration.md: level-two headings open a section, tables, bullet
 * and numbered lists with indented continuation lines, and paragraphs. The table header "Library"
 * reads "Swiper" here, since this page names it.
 */
function sections(markdown) {
  const out = [];
  let section = null;
  const blocks = markdown
    .replace(/^# .*\n/, '')
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);
  for (const block of blocks) {
    const heading = block.match(/^## (.+)$/);
    if (heading) {
      section = { title: heading[1], html: [] };
      out.push(section);
      continue;
    }
    if (!section) continue;
    // A paragraph directly above a list ("Behaviour that differs:") shares its block.
    const lines = block.split('\n');
    const listAt = lines.findIndex((line) => /^(- |\d+\. )/.test(line));
    if (listAt > 0) section.html.push(`<p>${inline(lines.slice(0, listAt).join(' '))}</p>`);
    const rest = listAt > 0 ? lines.slice(listAt) : lines;
    if (rest[0].startsWith('|')) {
      const rows = rest
        .filter((line) => !/^\|\s*-/.test(line))
        .map((line) =>
          line
            .slice(1, -1)
            .split(' | ')
            .map((cell) => cell.trim()),
        );
      const [head, ...body] = rows;
      section.html.push(`<div class="wf-table-wrap"><table class="wf-table">
  <thead><tr>${head.map((cell) => `<th scope="col">${cell == 'Library' ? 'Swiper' : inline(cell)}</th>`).join('')}</tr></thead>
  <tbody>${body.map(([first, ...cells]) => `<tr><th scope="row">${inline(first)}</th>${cells.map((cell) => `<td>${inline(cell)}</td>`).join('')}</tr>`).join('\n')}</tbody>
</table></div>`);
    } else if (/^(- |\d+\. )/.test(rest[0])) {
      const tag = rest[0].startsWith('- ') ? 'ul' : 'ol';
      const items = rest
        .join('\n')
        .split(/\n(?=- |\d+\. )/)
        .map((item) => item.replace(/^(- |\d+\. )/, '').replace(/\s*\n\s*/g, ' '));
      section.html.push(`<${tag} class="steps">${items.map((item) => `<li>${inline(item)}</li>`).join('')}</${tag}>`);
    } else {
      section.html.push(`<p>${inline(rest.join(' '))}</p>`);
    }
  }
  return out;
}

/** The body of swiper.html; `closing` is the main page's closing section. */
export function swiperBody({ root, closing }) {
  const markdown = readFileSync(join(root, 'docs/migration.md'), 'utf8');
  const intro = markdown.match(/^# .*\n\n([\s\S]+?)\n\n## /)?.[1].replace(/\n/g, ' ') ?? '';
  const reference = sections(markdown);
  const toc = [
    ...patterns.map((pattern) => [`pattern-${pattern.id}`, pattern.title]),
    ...reference.map((section) => [slug(section.title), section.title]),
  ];
  return `<section class="intro" data-hero aria-labelledby="page-title">
    <span class="nw-badge">scroll-carousel</span>
    <h1 id="page-title">Coming from Swiper</h1>
    <p class="lede">Five carousels as they appear on large shops, each next to the Swiper options it usually takes and what does the same here. Below them, every option and API call side by side.</p>
    <div class="actions">
      <a class="nw-btn nw-btn-line" href="../scroll-carousel">Back to scroll-carousel</a>
    </div>
  </section>

  <nav class="toc" aria-label="On this page">
    <ul>${toc.map(([id, title]) => `<li><a href="#${id}">${esc(title)}</a></li>`).join('')}</ul>
  </nav>

  <main>
    ${wireframeSection()}
    <section class="patterns reference" aria-labelledby="reference-title">
      <div class="case-head">
        <h2 id="reference-title">Every option and API call</h2>
        <p>${inline(intro)}</p>
      </div>
      ${reference
        .map(
          (
            section,
          ) => `<article class="pattern" id="${slug(section.title)}" aria-labelledby="${slug(section.title)}-title">
        <h3 id="${slug(section.title)}-title">${esc(section.title)}</h3>
        ${section.html.join('\n        ')}
      </article>`,
        )
        .join('\n      ')}
    </section>
  </main>

  ${closing}`;
}

/** On the main page, in place of the wireframes: where to find them. */
export const swiperTeaser = () => `<section class="case" id="swiper" aria-labelledby="case-swiper">
      <div class="stage swiper-teaser">
        <div class="case-head">
          <h2 id="case-swiper">Coming from Swiper?</h2>
          <p>Five storefront carousels as wireframes, each next to the Swiper options it usually takes, and every option and API call side by side.</p>
        </div>
        <a class="nw-btn" href="swiper">Compare with Swiper</a>
      </div>
    </section>`;
