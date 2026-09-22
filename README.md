# scroll-carousel

A carousel that is a native horizontal scroller first. The layout is plain CSS with scroll snap,
so the markup your server sends is already the final layout: no layout shift, no hidden slides,
no device detection on the server. A small script adds arrows, dots, paging by group, an API and
change events. Drag and autoplay are opt-in plugins. No runtime dependencies.

**Live examples:** https://www.nordwerk.studio/oss/scroll-carousel (every configuration, with
its code, plus common storefront patterns as wireframes next to the library options they replace).

| Part | gzip, minified |
| --- | --- |
| Core: attach, arrows, dots, keyboard, announcements | 3.4 kB |
| Drag plugin | +0.9 kB |
| Autoplay plugin | +0.8 kB |
| Stylesheet | 1.4 kB |

Adapters for React, Preact and Astro are included; they render the markup and attach the core.

## Install

```sh
pnpm add @nordwerk/scroll-carousel
```

React and Preact are optional peer dependencies; the Astro component compiles in your Astro build.

## Quick start

### Plain HTML

```html
<!-- carousel.css from the package, through your bundler or copied next to the page -->
<link rel="stylesheet" href="carousel.css" />

<div class="sc products">
  <ul class="sc-track" data-sc-track tabindex="0" aria-label="Bestsellers">
    <li>…</li>
    <li>…</li>
  </ul>
  <button class="sc-nav sc-prev" type="button" data-sc-prev aria-label="Previous products">‹</button>
  <button class="sc-nav sc-next" type="button" data-sc-next aria-label="Next products">›</button>
  <div class="sc-dots" data-sc-dots></div>
  <p class="sc-status" data-sc-status aria-live="polite"></p>
</div>

<style>
  .products .sc-track { --sc-per-view: 2; --sc-group: 2; --sc-gap: 12px; }
  @container sc (min-width: 800px) { .products .sc-track { --sc-per-view: 4; --sc-group: 4; } }
</style>

<script type="module">
  import { attach } from '@nordwerk/scroll-carousel';
  attach(document.querySelector('.products'));
</script>
```

Without the script the row still scrolls and snaps; arrows and dots stay hidden until it runs.

### React and Preact

```jsx
import { Carousel } from '@nordwerk/scroll-carousel/react'; // or '/preact'
import { drag } from '@nordwerk/scroll-carousel/drag';
import '@nordwerk/scroll-carousel/carousel.css';

<Carousel
  as="ul"
  label="Bestsellers"
  perView={{ 0: 2, 600: 3, 900: 4 }}
  group={{ 0: 2, 600: 3, 900: 4 }}
  gap={12}
  plugins={[drag()]}
  onChange={(state) => console.log(state.index)}
  carouselRef={(carousel) => (window.row = carousel)}
>
  {products.map((product) => <ProductCard key={product.id} {...product} />)}
</Carousel>;
```

Each child becomes a slide (`<li>` with `as="ul"`). Responsive values are keyed by the minimum
width of the carousel itself, not the viewport, and are rendered as container queries in the
server markup. For your own arrows and dots, render the markup yourself and use the hook:

```jsx
const { ref, carousel, state } = useCarousel({ rewind: true });
// <div className="sc" ref={ref}><ul className="sc-track" data-sc-track …>…</ul></div>
// <MyDots count={state?.pageCount} current={state?.page} onPick={(p) => carousel.goToPage(p)} />
```

### Astro

```astro
---
import Carousel from '@nordwerk/scroll-carousel/astro';
---
<Carousel as="ul" label="Bestsellers" perView={{ 0: 2, 600: 3, 900: 4 }} group="page" gap={12} drag>
  {products.map((product) => <li><ProductCard {...product} /></li>)}
</Carousel>
```

Slides go in the default slot, one element each. Drag and autoplay are loaded only on pages that
use them. Labels take templates: `labels={{ page: 'Slide {n} of {count}' }}`.

### Tailwind CSS

Import the stylesheet into the components layer, so utilities on your markup can override it, and
set the layout with arbitrary properties and container-query variants:

```css
@import "tailwindcss";
@import "@nordwerk/scroll-carousel/carousel.css" layer(components);
```

```html
<div class="sc group/row relative [--sc-gap:1rem]">
  <ul data-sc-track tabindex="0" aria-label="New arrivals"
    class="sc-track [--sc-group:page] [--sc-per-view:1.3] @md:[--sc-per-view:2] @3xl:[--sc-per-view:4]">
    <li>…</li>
  </ul>
  <button data-sc-next aria-label="Next products"
    class="absolute end-3 top-1/3 hidden group-data-[sc-overflow]/row:grid aria-disabled:opacity-30">›</button>
</div>
```

The complete example to copy, with a live preview compiled by Tailwind, is on the
[documentation site](https://www.nordwerk.studio/oss/scroll-carousel#tailwind).

### Next.js

The React entry is marked `'use client'`, so `<Carousel>` can be used directly in Server
Components of the App Router; it renders on the server and attaches in the browser.

## Markup

| Element | Required | Purpose |
| --- | --- | --- |
| `.sc` root | yes | Query container named `sc`; gets the state attributes below |
| `[data-sc-track]` with class `sc-track` | yes | The scroller. Give it `tabindex="0"` and an accessible name |
| its children | yes | The slides, one element each |
| `[data-sc-prev]`, `[data-sc-next]` | no | Any buttons. Class `sc-nav sc-prev` / `sc-next` for the default look |
| `[data-sc-dots]` | no | Empty container; the script fills it with one button per page |
| `[data-sc-status]` | no | Live region for "Items 5 to 8 of 12" after a settled move |
| `[data-sc-play]` | no | Play and pause button for the autoplay plugin |
| `[data-sc-initial]` on a slide | no | Open on this slide (see below) |

State attributes on the root, for styling: `data-sc-ready`, `data-sc-overflow`,
`data-sc-start`, `data-sc-end`, and with the plugins `data-sc-drag`, `data-sc-playing`,
`data-sc-paused`.

## Layout: custom properties

Set them anywhere above the track, in media queries or in container queries. The root is the
query container, so inside `@container sc (…)` set them on `.sc-track` (or on `.sc > *`).

| Property | Default | |
| --- | --- | --- |
| `--sc-per-view` | `1` | Slides per view; fractions show part of the next slide |
| `--sc-slide-size` | from per-view | A fixed size, or `auto` for the content width |
| `--sc-gap` | `1rem` | Space between slides |
| `--sc-offset-before`, `--sc-offset-after` | `0px` | Space before the first and after the last slide; snapped slides line up with it |
| `--sc-snap` | `mandatory` | `mandatory`, `proximity` or `none` (free mode) |
| `--sc-align` | `start` | `start` or `center` |
| `--sc-centered` | `0` | `1` pads both ends so the first and last slide can reach the centre |
| `--sc-count` | none | The slide count; per-view never exceeds it |
| `--sc-group` | `1` | Slides per step of next and previous: a number or `page` |
| `--sc-controls` | shown | `none` hides arrows, dots and the play button |

Class `sc--center-few` keeps a row that does not overflow in the middle. Slides stretch to the
same height unless you set `align-items` on the track.

Theme for the default controls: `--sc-control-bg`, `--sc-control-fg`, `--sc-control-border`,
`--sc-control-size`, `--sc-control-radius`, `--sc-control-shadow`, `--sc-nav-top`,
`--sc-nav-inset`, `--sc-dot`, `--sc-dot-size`, `--sc-dot-height`, `--sc-dot-active-size`,
`--sc-dot-radius`, `--sc-dot-idle`, `--sc-focus`. The defaults are neutral system colours.

## API

```ts
const carousel = attach(root, options);
```

| Option | |
| --- | --- |
| `group` | Overrides `--sc-group` |
| `initial` | Initial slide; overrides `[data-sc-initial]` |
| `rewind` | `true` fades back to the start after the end (and the reverse); `'scroll'` scrolls back |
| `labels` | `{ page(n, count), status(first, last, count, slides) }` for dots and the live region |
| `onChange` | Called after every settled move that changed the state |
| `prev`, `next`, `dots`, `status` | Elements elsewhere in the page, instead of the ones inside the root |
| `plugins` | `[drag(), autoplay({ delay: 5000 })]` |

| Member | |
| --- | --- |
| `index`, `page`, `pageCount`, `isBeginning`, `isEnd`, `state` | Current state; `state` is a copy of all of it plus `overflow` |
| `next()`, `prev()` | One page on; with `rewind`, wraps around |
| `slideTo(index, { instant })` | Show the page that contains the slide |
| `goToPage(page, { instant })` | |
| `update()` | Measure again after changing direction or a custom property from script |
| `destroy()` | Remove everything the script added |
| `play()`, `pause()` | With the autoplay plugin |

The root dispatches `sc:change` with the state as `detail`, once per settled move (on
`scrollend`, with a timer where that event is missing), and after resizes or content changes that
alter the state. `getCarousel(root)` returns the carousel attached to a root.

Pages are counted from the initial slide, so it always starts a page; the first page may be
shorter. At the end, the last page shows the last full view. With a group larger than one, only
page starts are snap points, so a swipe also comes to rest on a page.

## Opening on a later slide without a jump

Mark the slide with `data-sc-initial`. If the script runs after the first paint (as module and
deferred scripts do), render the snippet from `@nordwerk/scroll-carousel/markup` right after the
root: `<script>${PRE_POSITION}</script>`. It sets the start position while the page is parsed.
The React, Preact and Astro adapters do this for you when `initial` is set.

## Accessibility

- Keyboard: the track is a tab stop; arrow keys move by a page, Home and End go to the ends.
  Links and buttons in slides are reachable with Tab and scroll into view natively.
- Without the script, or when nothing overflows, arrows and dots are not rendered at all, and a
  row that cannot scroll is no tab stop.
- Arrows at the ends get `aria-disabled` instead of `disabled`, so focus stays on them.
- Settled moves are announced in the live region, never on every frame of a swipe, and never
  for autoplay.
- Autoplay pauses on hover, off-screen and in hidden tabs; keyboard focus entering the carousel
  or any control stops it for good, only the play button restarts it; with reduced motion it
  starts stopped. Moves are instant with reduced motion.
- A skip link is plain markup: `<a class="sc-skip" href="#after-row">Skip …</a>` before the track.

## Browser support

Current Chromium, Firefox and Safari (container queries and container units, `:dir()`,
`color-mix()`). Where `scrollend` is missing, a short timer stands in for it.

## Replacing a library carousel

See [docs/migration.md](docs/migration.md) for option-by-option mapping and what is deliberately
not supported (true infinite loop, vertical, effects, virtual slides, synced thumbnails).

## Development

```sh
pnpm install
pnpm check      # typecheck, unit tests, build, size budget, site, fixtures, browser tests
pnpm serve      # the site on http://localhost:4173 after pnpm site
```

See [AGENTS.md](AGENTS.md) for the repository layout and conventions, and
[docs/testing.md](docs/testing.md) for what is tested automatically and by hand.

## Licence

MIT
