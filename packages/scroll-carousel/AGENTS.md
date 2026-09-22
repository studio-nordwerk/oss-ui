# scroll-carousel: guide for coding agents

How to build a carousel with this package in a project. Human documentation is in README.md; live
examples with code are at https://www.nordwerk.studio/oss/scroll-carousel. Working on the package
itself: see AGENTS.md at the root of https://github.com/studio-nordwerk/oss-ui.

## Using the package

### The model in one paragraph

The carousel is a native horizontal scroller. CSS alone lays it out (slides per view, gaps,
offsets, snapping, centring), so server markup is final and nothing shifts. The script
(`attach`) only adds arrows, dots, paging, an API, events and announcements. Configure layout in
CSS custom properties, behaviour in `attach` options. Never compute slide widths or positions in
JavaScript, never move slides with transforms, never clone slides.

### Rules

1. Markup contract: a root with class `sc`, a track with `data-sc-track`, class `sc-track`,
   `tabindex="0"` and an accessible name (`aria-label` or `aria-labelledby`), one element per
   slide as direct children. Controls are optional: `data-sc-prev`, `data-sc-next`,
   `data-sc-dots` (leave it empty), `data-sc-status` (with `aria-live="polite"`), `data-sc-play`.
2. Import the stylesheet once: `@nordwerk/scroll-carousel/carousel.css`.
3. Responsive layout goes in CSS: media queries, or container queries on the root
   (`@container sc (min-width: …)`, then set the properties on `.sc-track`). Do not re-attach on
   resize; the script measures on its own.
4. Keep the group equal to what is visible: `--sc-group: page`, or the same number as
   `--sc-per-view` per breakpoint.
5. Opening on a later slide: `data-sc-initial` on that slide, plus the `PRE_POSITION` inline
   script right after the root when rendering on the server (the adapters do this).
6. Drag and autoplay are plugins: `import { drag } from '@nordwerk/scroll-carousel/drag'`,
   `import { autoplay } from '@nordwerk/scroll-carousel/autoplay'`, passed in `plugins`. Autoplay
   needs a visible `[data-sc-play]` button (WCAG 2.2.2).
7. An "infinite" or looping carousel is `rewind: true` (fades back to the start). A true loop with
   cloned slides is not supported; do not build one around the package.
8. Host-owned arrows or dots: render them yourself and call `carousel.next()`, `prev()`,
   `goToPage(n)`; read `carousel.state` or listen for `sc:change` on the root. In React or
   Preact use `useCarousel()` or the `carouselRef` prop.
9. Text: pass `labels` for dots and the live region in the page's language, and give the arrow
   buttons their own `aria-label`s ("Previous products", "Next products").
10. Do not add `disabled` to the arrows yourself; the script manages `aria-disabled`.
11. Tailwind CSS: `@import "@nordwerk/scroll-carousel/carousel.css" layer(components);`, layout as
    arbitrary properties (`[--sc-per-view:2]`, `@3xl:[--sc-per-view:4]` on `.sc-track`), own
    controls styled from the state attributes (`group-data-[sc-overflow]/row:grid`,
    `aria-disabled:opacity-30`). Copyable example: the `#tailwind` section of the docs site.
12. Next.js App Router: import `<Carousel>` from `@nordwerk/scroll-carousel/react` in a Server
    Component as is; the entry carries `'use client'`.
13. shadcn/ui projects: `npx shadcn@latest add studio-nordwerk/oss-ui/scroll-carousel`, or a
    block (`product-row`, `brand-teasers`, `hero-autoplay`, `image-gallery`, `logo-belt`). Compose
    `ScrollCarousel` > `ScrollCarouselContent` > `ScrollCarouselItem`, with `ScrollCarouselPrevious`,
    `ScrollCarouselNext`, `ScrollCarouselDots` and `ScrollCarouselPlay` inside `ScrollCarousel`;
    layout as custom properties on the content. Pass plugins made outside the component, and mark
    the file `"use client"` when it creates them.

### Recipes (CSS on the root or track, options in attach)

| Want | CSS | attach options |
| --- | --- | --- |
| Hero, one per view, dots, autoplay | `--sc-gap: 0px` | `{ rewind: true, plugins: [autoplay({ delay: 5000 })] }` |
| Product row, 2 / 3 / 4 per view, page by view | `--sc-per-view` per container width, `--sc-group: page` | `{}` or `{ plugins: [drag()] }` |
| Free mode on phones | `--sc-snap: none` (or `mandatory` for "sticky"), `--sc-controls: none` in a small-width query | `{}` |
| Peek of the next slide | `--sc-per-view: 2.3`, `--sc-offset-before/after: 1rem` | `{}` |
| Centred slides | `--sc-align: center; --sc-centered: 1; --sc-per-view: 1.4` | `{}` |
| Chips or logos as wide as their content | `--sc-slide-size: auto; --sc-snap: proximity; --sc-group: page` | `{}` |
| Date strip opening on today | `--sc-per-view: 7; --sc-group: page` + `data-sc-initial` | `{}` |
| Too few slides | class `sc--center-few`, or `--sc-count: <n>` | `{}` |

### Adapters

- React / Preact: `<Carousel as="ul" label="…" perView={{ 0: 2, 600: 3 }} gap={12} group="page"
  rewind plugins={[drag()]} initial={3} onChange={…} carouselRef={…}>` with slides as children.
  Props: `arrows`, `dots`, `playButton`, `centerFew`, `slideRoles`, `labels` (`prev`, `next`,
  `page`, `status`), `className`, `style`, `slideClassName`. Options are read once on mount; change
  `key` to re-attach.
- Astro: `<Carousel as="ul" label="…" perView={…} group="page" gap={12} drag autoplay={5000}
  rewind initial={3} labels={{ page: 'Slide {n} of {count}' }}>` with slide elements in the slot;
  mark the initial slide with `data-sc-initial` yourself.
- Anything else on the server: `baseStyle(props)`, `responsiveCss(id, props)` and `PRE_POSITION`
  from `@nordwerk/scroll-carousel/markup`.
