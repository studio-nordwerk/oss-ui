# scroll-carousel: guide for coding agents

Two parts: how to build a carousel with this package in a project, and how to work on the package
itself. Human documentation is in README.md; live examples with code are at
https://studio-nordwerk.github.io/scroll-carousel/.

## Part 1: using the package

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

## Part 2: working on this repository

### Layout

- `src/math.ts`: pure positioning maths (snap positions, pages, visible range). Unit tested.
- `src/index.ts`: the controller, `attach()`. Keep it free of framework code.
- `src/drag.ts`, `src/autoplay.ts`: plugins against the `PluginContext` in index.ts.
- `src/markup.ts`: server helpers shared by the adapters.
- `src/adapter.ts`: the React and Preact adapter, written once against a small `Framework`
  interface; `src/react.ts` and `src/preact.ts` only bind it.
- `src/astro/Carousel.astro`: shipped as source.
- `src/carousel.css`: all layout and the default controls.
- `site/`: the documentation site (`generate.mjs` writes `_site/`), including the wireframe
  patterns in `wireframes.mjs`. Content there is fictional.
- `test/unit/`: node's test runner on the TypeScript sources.
- `test/e2e/`: Playwright against `_site/` and the adapter fixtures from `scripts/fixtures.mjs`.

### Commands

```sh
pnpm install
pnpm typecheck
pnpm test                 # unit tests, no build needed
pnpm build                # dist/: esbuild modules plus tsc declarations
pnpm size                 # fails when an entry exceeds its gzip budget
pnpm site                 # build, then _site/
node scripts/fixtures.mjs # React, Preact and Astro fixtures into _site/fixtures/
pnpm test:e2e             # Chromium, WebKit and Firefox
pnpm check                # all of the above in order
```

Visual baselines exist per platform in `test/e2e/__screenshots__/<platform>`; update them with
`UPDATE_VISUAL=1 pnpm test:e2e --project=chromium visual --update-snapshots=all`.

### Conventions

- No runtime dependencies. Anything a consumer does not use must tree-shake away; new optional
  behaviour becomes a plugin.
- Size budgets live in `scripts/size.mjs`. Raising one needs a reason in the commit message.
- Layout stays in CSS. The script reads layout (custom properties, computed styles, geometry)
  and never writes it.
- Every must-have behaviour has a browser test that passes in all three engines. Fix flaky tests
  instead of retrying them.
- Descriptive names, English in code, comments and docs, no project code names.
- Examples, fixtures and docs use fictional content. Never name or describe a client, its code,
  its paths or its numbers in this repository, including commit messages.
