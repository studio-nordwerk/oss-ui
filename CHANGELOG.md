# Changelog

## Unreleased

- Astro and `templateLabels`: `statusSingle` template for when only one slide is visible, so a
  status like "Items {first} to {last}" does not read "Items 2 to 2".
- Documentation moved to https://www.nordwerk.studio/oss/scroll-carousel; the GitHub Pages
  address forwards there.

## 0.1.0 (2026-09-21)

First version.

- Core `attach()`: layout in CSS custom properties with scroll snap; arrows, dots, paging by a
  number of slides or by view, pages counted from the initial slide, keyboard, live-region
  announcements after settled moves, `sc:change` events, rewind by fading or scrolling back,
  slides added or removed after attach, right to left.
- Plugins: `drag()` for mouse dragging (snapping rows move by one page per drag, free rows keep
  the throw's momentum), `autoplay()` with a pause button and WCAG-conform stops.
- Adapters: React and Preact (`<Carousel>`, `useCarousel`), Astro (`Carousel.astro`), and server
  helpers in `markup` (responsive container-query CSS, the pre-position snippet).
- Documentation site with a live example per configuration and storefront patterns as wireframes.
