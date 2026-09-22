# Testing

## Automated

| What | Where | Engines |
| --- | --- | --- |
| Positioning maths: snap positions for every alignment, offsets, gaps, `auto` widths, centred padding, pages by number and by view, anchored pages, a last page shorter than a group, visible range | `test/unit/math.test.ts` | Node |
| Server helpers: custom properties, container-query CSS, label templates | `test/unit/markup.test.ts` | Node |
| Arrows, dots, one change event per settled move, fast repeated clicks, rewind with and without fade, disabled arrows without rewind, keyboard (arrows, Home, End), live-region text, `slideTo`, initial slide, content added before the current slide, resize through container queries, mouse drag with click suppression, right to left, several carousels on one page, too few slides, autoplay (delay, hover, stop, focus), the page without script | `test/e2e/interaction.spec.ts` | Chromium, WebKit, Firefox |
| No layout shift when the script attaches | `test/e2e/interaction.spec.ts` | Chromium (only engine that reports layout shift) |
| React, Preact and Astro: server markup equals hydrated markup apart from what the core manages, no hydration errors, the initial slide is in place before any script runs and does not move, no layout shift, arrows work | `test/e2e/adapters.spec.ts` | Chromium, WebKit, Firefox |
| axe on every example and pattern, with and without script | `test/e2e/a11y.spec.ts` | Chromium |
| Screenshots of every example at 390, 768 and 1280 px | `test/e2e/visual.spec.ts` | Chromium, baselines per platform |
| Size budget per entry | `budgets.json`, checked by `scripts/size.mjs` at the repository root | CI |

Firefox is not run locally on the maintainer's machine (Playwright's Firefox does not start
there); it runs in CI. Visual baselines exist for macOS only so far, so CI on Linux skips them.

## By hand

Not yet done. Both lists below are to be worked through before the first release and recorded
here with dates, devices and versions.

### Screen reader pass

With VoiceOver on macOS Safari and iOS Safari, and NVDA on Windows with Firefox or Chrome:

- [ ] The track is announced with its name and, for `<ul>` tracks, as a list with its item count.
- [ ] Tabbing moves through links in slides; each one scrolls into view.
- [ ] Arrow buttons have their names; at the ends without rewind they are announced as dimmed.
- [ ] Dots are announced as "Page n of m", the current one as current.
- [ ] After an arrow press the live region says which items are visible, once.
- [ ] A swipe with VoiceOver on iOS (three fingers) moves the row and is announced once.
- [ ] Autoplay is never announced; the play button says whether it starts or stops.
- [ ] Without script, nothing is announced that cannot be used.

### Real devices

- [ ] iOS Safari (current and previous major): mandatory snap after a fling, `scrollend` or the
  timer fallback, the date strip opening on today, rewind fade, the phone row in all three snap
  modes.
- [ ] Android Chrome: the same.
- [ ] macOS Safari with a trackpad: horizontal two-finger scroll, back-swipe not triggered at the
  start of a row.
- [ ] Windows with a mouse wheel and with a touch screen.
