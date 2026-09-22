// Common storefront carousel patterns as wireframes, each next to the library options it usually
// takes and what the same thing is here. Option names in the left column are Swiper's, the most
// widely used carousel library; other libraries name the same things similarly.

import { arrows, esc, status } from './content.mjs';

const lines = (...widths) => widths.map((w) => `<span class="wf-line" style="width:${w}%"></span>`).join('');
const img = (ratio = '1') => `<span class="wf-img" style="aspect-ratio:${ratio}"></span>`;
const heart = '<span class="wf-heart" aria-hidden="true"></span>';

const teaser = (i) => `<li class="wf-teaser">
  ${img('1')}
  <span class="wf-logo">Logo</span>
  <span class="wf-panel">${lines(85, 70, i % 2 ? 40 : 60)}<span class="wf-gap"></span>${lines(90, 80, 55)}</span>
  <a class="wf-hit" href="/brand/${i + 1}"><span class="visually-hidden">Brand story ${i + 1}</span></a>
</li>`;

const tile = (i) => `<li class="wf-tile">
  <span class="wf-media">${img('1')}${i % 3 == 0 ? '<span class="wf-badge">Badge</span>' : ''}${heart}</span>
  ${lines(45, 90, i % 2 ? 60 : 75)}
  <span class="wf-price">${lines(30)}</span>
  <a class="wf-hit" href="/product/${i + 1}"><span class="visually-hidden">Product ${i + 1}</span></a>
</li>`;

const stage = (i) => `<div class="wf-stage" role="group" aria-roledescription="slide" aria-label="${i + 1} of 4">
  ${img('21 / 8')}
  <span class="wf-stage-copy">${lines(60, 45)}<span class="wf-button"></span></span>
</div>`;

const photo = (i) => `<li class="wf-photo">${img('4 / 5')}<span class="visually-hidden">Image ${i + 1}</span></li>`;

const logo = (width) =>
  `<li class="wf-brand" style="--w:${width}rem"><span class="wf-img" style="aspect-ratio:auto;height:2.5rem"></span></li>`;

const table = (rows) => `<table class="wf-table">
  <thead><tr><th scope="col">Need</th><th scope="col">Typical library setup</th><th scope="col">Here</th></tr></thead>
  <tbody>${rows.map(([need, library, here]) => `<tr><th scope="row">${need}</th><td>${library}</td><td>${here}</td></tr>`).join('')}</tbody>
</table>`;

const code = (text) => `<code>${esc(text)}</code>`;

export const patterns = [
  {
    id: 'teasers',
    block: 'brand-teasers',
    title: 'Brand teasers',
    text: 'Three teasers per view with an image, a logo tile over its corner and a dark text panel; all the same height, dots on top of the panels. On phones one teaser and part of the next.',
    carousel: `<div class="sc wf-teasers" data-wire="teasers">
  <ul class="sc-track" data-sc-track tabindex="0" aria-label="Brand teasers">${Array.from({ length: 6 }, (_, i) => teaser(i)).join('')}</ul>
  <div class="sc-dots" data-sc-dots></div>
  ${status}
</div>`,
    rows: [
      [
        'Three per view, 1.2 on phones',
        `${code('slidesPerView')} and ${code('breakpoints')}, applied by script after load`,
        `${code('--sc-per-view')} in a container query, final in the server markup`,
      ],
      ['2 px between teasers', code('spaceBetween: 2'), code('--sc-gap: 2px')],
      ['Page by three', code('slidesPerGroup: 3'), code('--sc-group: 3')],
      ['Same height', 'wrapper CSS on top of the library', 'default: slides stretch'],
      [
        'Square dots over the panels',
        `${code('pagination')} with custom bullets`,
        `${code('[data-sc-dots]')} placed by the host; ${code('--sc-dot-radius: 0')}`,
      ],
    ],
  },
  {
    id: 'products',
    block: 'product-row',
    title: 'Product recommendations',
    text: 'Product tiles two pixels apart with a badge and a wish-list heart. Square arrows at the edges, centred on the images; no dots.',
    carousel: `<div class="sc wf-products" data-wire="products">
  <ul class="sc-track" data-sc-track tabindex="0" aria-label="Recommended products">${Array.from({ length: 12 }, (_, i) => tile(i)).join('')}</ul>
  ${arrows('products')}
  ${status}
</div>`,
    rows: [
      [
        'Arrows at the edges',
        `${code('navigation')} with the shop's own arrow components`,
        `any element with ${code('data-sc-prev')} / ${code('data-sc-next')}, or the defaults with ${code('--sc-control-radius: 0')}`,
      ],
      [
        'Next shows the next full view',
        `${code('slidesPerGroup')} equal to ${code('slidesPerView')}`,
        code('--sc-group: page'),
      ],
      ['No arrows when nothing scrolls', code('watchOverflow'), `automatic: ${code('[data-sc-overflow]')}`],
      ['Dragging with a mouse', `${code('simulateTouch')}, on by default`, `${code('drag()')} plugin, opt-in`],
    ],
  },
  {
    id: 'stage',
    block: 'hero-autoplay',
    title: 'Stage with autoplay',
    text: 'Full-width banners that move on every 5 seconds. After the last banner the first one fades in again instead of an endless loop of cloned slides.',
    carousel: `<section class="sc wf-stages" data-wire="stage" aria-roledescription="carousel" aria-label="Stage">
  <div class="sc-track" data-sc-track tabindex="0" role="group" aria-label="Stage slides">${Array.from({ length: 4 }, (_, i) => stage(i)).join('')}</div>
  ${arrows('banner')}
  <div class="wf-stage-bar"><button class="sc-play" type="button" data-sc-play aria-label="Stop automatic scrolling"><svg class="sc-icon-play" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M8 5v14l11-7z"/></svg><svg class="sc-icon-pause" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z"/></svg></button><div class="sc-dots" data-sc-dots></div></div>
  ${status}
</section>`,
    rows: [
      [
        'Endless',
        `${code('loop: true')}: cloned slides, a teleported position and clones hidden from assistive technology`,
        `${code('rewind: true')}: the first banner fades in again`,
      ],
      ['Every 5 seconds', code('autoplay: { delay: 5000 }'), `${code('autoplay({ delay: 5000 })')} plugin`],
      [
        'A way to stop it (WCAG 2.2.2)',
        'not built in',
        `${code('[data-sc-play]')} button; focus entering the stage stops it`,
      ],
      ['Pause on hover', code('pauseOnMouseEnter'), 'built in, also while off-screen or in a hidden tab'],
    ],
  },
  {
    id: 'gallery',
    block: 'image-gallery',
    title: 'Image gallery with a peek',
    text: 'One image at a time in the centre, the neighbours showing at both sides, a dot per image, opening on the third one.',
    carousel: `<div class="sc wf-gallery" data-wire="gallery">
  <ul class="sc-track" data-sc-track tabindex="0" aria-label="Product images">${Array.from({ length: 6 }, (_, i) => photo(i).replace('<li class="wf-photo">', i == 2 ? '<li class="wf-photo" data-sc-initial>' : '<li class="wf-photo">')).join('')}</ul>
  ${arrows('image')}
  <div class="sc-dots" data-sc-dots></div>
  ${status}
</div>`,
    rows: [
      [
        'Centred with neighbours showing',
        `${code('centeredSlides: true')}, ${code('slidesPerView: 1.4')}`,
        `${code('--sc-align: center')}, ${code('--sc-centered: 1')}, ${code('--sc-per-view: 1.4')}`,
      ],
      [
        'Open on the third image',
        code('initialSlide: 2'),
        `${code('data-sc-initial')} on the slide; the inline snippet avoids a jump`,
      ],
      [
        'Know the current image',
        `${code('realIndex')} in ${code('slideChange')}`,
        `${code('carousel.index')} in the ${code('sc:change')} event, once per settled move`,
      ],
    ],
  },
  {
    id: 'belt',
    block: 'logo-belt',
    title: 'Logo belt in free mode',
    text: 'Logos as wide as they are, scrolled freely without snapping. No controls on narrow rows.',
    carousel: `<div class="sc wf-belt" data-wire="belt">
  <ul class="sc-track" data-sc-track tabindex="0" aria-label="Brands">${[7, 5, 9, 6, 8, 5.5, 7.5, 6.5, 9.5, 5, 8, 6].map(logo).join('')}</ul>
  ${arrows('brands')}
  ${status}
</div>`,
    rows: [
      ['Content widths', code("slidesPerView: 'auto'"), code('--sc-slide-size: auto')],
      ['Free scrolling', code('freeMode: true'), code('--sc-snap: none')],
      [
        'Free, but coming to rest on an item',
        code('freeMode: { sticky: true }'),
        `${code('--sc-snap: mandatory')}: momentum still carries across items`,
      ],
      [
        'No controls on narrow rows',
        'navigation switched off per breakpoint',
        `${code('--sc-controls: none')} in a container query`,
      ],
    ],
  },
];

export const wireframeSection = () => `<section class="patterns" aria-labelledby="patterns-title">
  <div class="case-head">
    <h2 id="patterns-title">Five storefront patterns</h2>
    <p>Drawn as wireframes and built with this package. Each table puts the options Swiper usually takes next to what does the same here.</p>
  </div>
  ${patterns
    .map(
      (pattern) => `<article class="pattern" id="pattern-${pattern.id}" aria-labelledby="pattern-${pattern.id}-title">
    <h3 id="pattern-${pattern.id}-title">${pattern.title}</h3>
    <p>${pattern.text}</p>
    <div class="stage wf">${pattern.carousel}</div>
    <div class="wf-table-wrap">${table(pattern.rows)}</div>
    <p class="block-install">As a shadcn block: <code>npx shadcn@latest add studio-nordwerk/oss-ui/${pattern.block}</code></p>
  </article>`,
    )
    .join('\n')}
</section>`;
