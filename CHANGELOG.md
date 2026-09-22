# Changelog

## 0.1.3 (2026-09-22)

- `carousel.layer.css`: the stylesheet inside Tailwind's components layer, with Tailwind's layer
  order declared, so utilities override it and preflight never does, whatever the load order.
- shadcn/ui registry in the repository: the `scroll-carousel` component (the structure of shadcn's
  Carousel, on native scrolling) and five blocks, `product-row`, `brand-teasers`,
  `hero-autoplay`, `image-gallery` and `logo-belt`. Install with
  `npx shadcn@latest add studio-nordwerk/scroll-carousel/<item>`.

## 0.1.2 (2026-09-22)

- React entry marked `'use client'`: `<Carousel>` now works in Next.js App Router Server
  Components (it failed to prerender before, as the hooks are not available on the server).
- Documentation: a copy-and-paste Tailwind CSS v4 example with a live preview compiled by
  Tailwind, and notes for Tailwind and Next.js.

## 0.1.1 (2026-09-21)

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
