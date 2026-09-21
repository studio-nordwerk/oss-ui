# Replacing a library carousel

Option and API names on the left are those of Swiper, the most widely used carousel library;
other libraries name the same things similarly. The main change of mindset: layout moves from
JavaScript options into CSS, so breakpoints become media or container queries instead of
options that the script re-applies after load.

## Options

| Library | Here | Notes |
| --- | --- | --- |
| `slidesPerView: 3` | `--sc-per-view: 3` | Fractions work the same way |
| `slidesPerView: 'auto'` | `--sc-slide-size: auto` | Or any length, e.g. `18rem` |
| `spaceBetween: 16` | `--sc-gap: 16px` | |
| `slidesOffsetBefore` / `After` | `--sc-offset-before` / `--sc-offset-after` | Snapped slides line up after the offset |
| `breakpoints: { … }` | `@media` or `@container sc (min-width: …)` | Container queries follow the carousel's own width |
| `slidesPerGroup: 3` | `--sc-group: 3` | Only group starts are snap points |
| `slidesPerGroupAuto` | `--sc-group: page` | As many whole slides as fit |
| `centeredSlides: true` | `--sc-align: center; --sc-centered: 1` | |
| `centeredSlidesBounds` | `--sc-align: center` without `--sc-centered` | |
| `centerInsufficientSlides` | class `sc--center-few` | |
| clamping slides per view to the slide count | `--sc-count: <n>` | |
| `initialSlide: 4` | `data-sc-initial` on the slide, or `initial: 4` | Plus the inline `PRE_POSITION` snippet for server rendering |
| `freeMode: true` | `--sc-snap: none` | |
| `freeMode: { sticky: true }` | `--sc-snap: mandatory` | Native momentum still carries across several slides |
| `loop: true` | `rewind: true` | Fades back to the start instead of cloning slides |
| `rewind: true` | `rewind: 'scroll'` | Scrolls back across all slides |
| `autoplay: { delay }` | `autoplay({ delay })` plugin | Adds a required pause button; focus stops it |
| `simulateTouch` (mouse drag) | `drag()` plugin | Opt-in |
| `navigation` | `[data-sc-prev]`, `[data-sc-next]` on any element | Or call `next()` / `prev()` from your own components |
| `pagination` (bullets) | `[data-sc-dots]` | Or render your own from `state.page` / `state.pageCount` |
| `watchOverflow` | automatic | `data-sc-overflow` on the root; controls hide without it |
| `a11y` module | built in | Live region, `aria-disabled`, keyboard |
| `lazy` | native `loading="lazy"` on images | |
| `speed` | not configurable | Native smooth scrolling; instant with reduced motion |
| `allowTouchMove: false` | `overflow-x: hidden` on the track | Arrows and the API still work |

## API

| Library | Here |
| --- | --- |
| `new Swiper(el, options)` | `attach(root, options)` |
| `swiper.slideTo(i)` | `carousel.slideTo(i)` (shows the page that contains slide i) |
| `swiper.slideToLoop(i)` | `carousel.slideTo(i)` |
| `swiper.slideNext()` / `slidePrev()` | `carousel.next()` / `prev()` |
| `swiper.activeIndex`, `realIndex` | `carousel.index` |
| `swiper.snapIndex` | `carousel.page` |
| `swiper.isBeginning` / `isEnd` | the same names |
| `swiper.slides` | `carousel.slides` |
| `swiper.el`, `wrapperEl` | `carousel.root`, `carousel.track` |
| `swiper.update()` | `carousel.update()`, rarely needed: it measures on resize and content changes |
| `swiper.destroy()` | `carousel.destroy()` |
| `on('slideChange')` | `sc:change` event on the root, or `onChange`, once per settled move |
| `onSwiper(swiper)` | `carousel` returned by `attach`, or `carouselRef` in React and Preact |

Behaviour that differs:

- No change event on attach. A wrapper that promised one should call its handler once with
  `carousel.state` after attaching.
- `index` is the slide at the snap position. At the end of a row it is the first slide of the
  last full view, not the last slide.
- Arrows at the ends are disabled only without `rewind`; with `rewind` they stay enabled.
- There are no duplicate slides, so code that skips `.swiper-slide-duplicate` or reads
  `data-swiper-slide-index` goes away, as do workarounds that reset a container's scroll
  position after focus moved into a slide.

## Deliberately not supported

- A true infinite loop (cloned slides and a teleported scroll position). It is fragile on native
  scrolling and confusing for assistive technology; use `rewind`.
- Vertical carousels, zoom, a draggable scrollbar, slide effects (fade, cube, flip), virtual
  slides, parallax, and syncing thumbnails with a second carousel. Thumbnails can call
  `slideTo()` and listen to `sc:change`.
- Changing the transition speed or easing of moves.

## Migrating step by step

1. Keep your component's public props and imperative handle; swap its internals.
2. Move per-device options into CSS: one media or container query per former breakpoint.
3. Replace loop with rewind; check with product owners where an endless loop was visible.
4. Keep your own arrows and dots, bound to `next()`, `prev()`, `goToPage()` and `sc:change`.
5. Remove layout workarounds made for script-computed layout, such as first-image fixes for
   server rendering.
6. Behind a flag, migrate one call site at a time and compare with visual tests.
