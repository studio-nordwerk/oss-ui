# Changelog

## 0.3.0 (2026-09-25)

- Depth: `data-ss-depth` on a sheet (`depth` in the React, Preact and Astro adapters) makes the
  page behind it recede while it is open. The page shrinks towards the top of the screen, rounds
  its corners and sits on a dark ground, and follows the drag where scroll-driven animations
  exist. The styles are the new opt-in `@nordwerk/scroll-sheet/depth.css`; the receding page is
  `<body>` or the element marked `data-ss-page`. The shadcn `ScrollSheet` takes `depth` too.

## 0.2.0 (2026-09-22)

- The handle can be a button: `<button class="ss-handle" commandfor="ID" command="--ss-cycle">`
  moves the sheet up to its next snap point on each press, from the full height back to the lowest,
  by mouse, touch and keyboard. `SheetHandle` (React, Preact) and `ScrollSheetHandle` (shadcn)
  render it. A `<span>` handle stays a bar to look at.
- New `drag()` plugin (`@nordwerk/scroll-sheet/drag`, Astro: `drag`): a mouse drags a sheet or
  drawer by its handle and header, with a throw to the next snap point or away to close.
- Fix, without script: while a sheet slid out, the dialog lost its flex direction, so a bottom
  sheet jumped to the top and a drawer to the other edge before sliding out.

## 0.1.1 (2026-09-22)

- Fix: in Chromium a sheet or drawer closed with its exit animation showed in full once more and
  slid out a second time. The stylesheet's exit transition for pages without the script now only
  applies there; with the script the exit has already run when the dialog closes.

## 0.1.0 (2026-09-22)

First release.

- Bottom sheet, side drawer (start and end) and centred dialog on one native modal `<dialog>`,
  switchable per breakpoint in CSS (`data-ss="bottom md:end"`).
- Opens and closes with `commandfor` before any script runs; the page behind is locked in CSS
  without moving.
- Core: one cancelable close path (button, Escape, dimmed area, drag away), snap points with an
  initial one, focus return, stacking and replace, `closeTop()`, events and API.
- Plugins: `history` (back button and back swipe close the top sheet), `keyboard` (iOS on-screen
  keyboard).
- React and Preact adapters (controlled or uncontrolled; in controlled mode the prop wins), an
  Astro component, a shadcn component and seven blocks.
