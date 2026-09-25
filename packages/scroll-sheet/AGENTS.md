# scroll-sheet: guide for coding agents

Two parts: how to build sheets, drawers and dialogs with this package in a project, and how to
work on the package itself. Human documentation is in README.md; live examples with code are at
https://www.nordwerk.studio/oss/scroll-sheet.

## Part 1: using the package

### The model in one paragraph

Every sheet is a native modal `<dialog>` in the top layer. The dialog covers the viewport and is
itself a scroller holding the panel and an empty spacer (`.ss-rest`); scrolling the dialog moves the
panel, CSS scroll snap gives its resting positions. Buttons with `commandfor` open and close it
without script; the page behind is locked in CSS and never moved. The script (`enhance`/`attach`)
adds one cancelable close path (close button, Escape, a tap on the dimmed area, dragging away),
opening at a snap point, focus return, events and an API. Never position the panel with
transforms or script, never add `position: fixed` or `overflow` styles to `<body>` for a sheet,
never give a sheet a z-index: the top layer is above everything.

### Rules

1. Markup contract: `<dialog class="ss">` > `.ss-panel` (content) + `.ss-rest` (empty, after the
   panel). Name the dialog with `aria-labelledby` pointing at a heading, or `aria-label`.
2. Import the stylesheet once: `@nordwerk/scroll-sheet/sheet.css` (Tailwind:
   `@import "@nordwerk/scroll-sheet/sheet.css" layer(components);`).
3. Open and close with buttons: `<button type="button" commandfor="ID" command="show-modal">`, and
   `command="close"` inside. They work before the script loads; do not replace them with onclick
   handlers.
4. Presentation in the markup, per breakpoint: `data-ss="bottom"` (default), `"end"`, `"start"`,
   `"center"`, with `sm:`, `md:`, `lg:` prefixes: `data-ss="bottom md:end"`. Do not switch
   presentations with script or by user agent.
5. Snap points of a bottom sheet: `<i class="ss-snap" style="--ss-at: 50dvh"></i>` inside the panel;
   `--ss-at` is how much of the sheet shows. `data-ss-initial` on one of them opens there. The full
   height is always a snap point.
6. Use `.ss-header`, `.ss-body` (scrolls) and `.ss-footer` (sticks to the bottom edge at every
   height) for the default layout. The grab bar is `<button class="ss-handle" type="button"
   commandfor="ID" command="--ss-cycle" aria-label="…">`: each press moves the sheet to its next
   snap point. For dragging with a mouse add the `drag()` plugin (`@nordwerk/scroll-sheet/drag`).
7. Attach once: `enhance(document, { plugins })` or `attach(dialog, options)`; the sheet reads
   layout from CSS and needs no re-attach on resize.
8. Back button: add the `history()` plugin for sheets on phones. Native app shells call
   `closeTop()` from their back handler; it returns whether a sheet was open.
9. Forms in sheets: fields at 16px or more (iOS zoom), and the `keyboard()` plugin so the sheet stays
   above the iOS keyboard. `<form method="dialog">` closes the sheet with the button's value.
10. One sheet replacing another: `data-ss-replace` on the dialog (or `replace: true`). Stacking is
    the default: a sheet opened from a sheet goes on top, Escape and back close the top one.
11. React state: uncontrolled by default (report changes with `onOpenChange`); pass `open` only when
    a store must own the state, and then set it false in `onOpenChange` to let a user close happen.
    The prop wins: native opens and closes the owner does not follow are reported and undone.
12. Toasts, popovers and third-party widgets that must stay usable while a sheet is open render
    inside the open dialog (`topSheet()?.dialog`); anything outside is inert.
13. Next.js App Router: import from `@nordwerk/scroll-sheet/react` in a Server Component as is; the
    entry carries `'use client'`.
14. shadcn/ui: `npx shadcn@latest add studio-nordwerk/oss-ui/scroll-sheet`, or a block
    (`size-picker`, `filter-drawer`, `mini-cart`, `store-finder`, `mobile-menu`, `contact-dialog`,
    `lightbox`). Compose `ScrollSheet` > `ScrollSheetTrigger` + `ScrollSheetContent` >
    `ScrollSheetHeader`/`Title`/`Close`, `ScrollSheetBody`, `ScrollSheetFooter`. Pass plugins made
    outside the component. `ScrollSheetTrigger asChild`/`render` must end in a native `<button>`;
    buttons in a `<form method="dialog">` need `type="submit"` (Base UI buttons default to
    `type="button"`).

### Recipes

| Want | Markup | Script |
| --- | --- | --- |
| Size or variant picker on phones | bottom sheet, `.ss-snap --ss-at: 50dvh data-ss-initial`, footer with the action | `plugins: [keyboard()]` if it has fields |
| Filters: sheet on phones, drawer on desktop | `data-ss="bottom md:end"` | — |
| Mobile navigation | `data-ss="start"` | `plugins: [history()]` |
| Mini cart after adding | `data-ss="end" data-ss-replace` | open with `getSheet(dialog).open()` |
| Confirmation or form | `data-ss="center"`, `<form method="dialog">` | read `dialog.returnValue` on `ss:close` |
| Store finder over a map | bottom sheet with `--ss-at: 32dvh` (initial) and `66dvh` | — |
| Product details over the page, iOS-style | bottom sheet with `data-ss-depth`, `--ss-sheet-max-size: none`, `depth.css` after `sheet.css` | — |
| Full-screen gallery | `data-ss="center"` with `--ss-dialog-size: 100vw` and a full-height panel | — |

### Adapters

- React / Preact: `<Sheet id presentation snapPoints initialSnap open defaultOpen onOpenChange
  onSnap replace plugins className panelClassName sheetRef>` with `SheetTrigger sheet="ID"`,
  `SheetHandle`, `SheetHeader`, `SheetTitle`, `SheetClose`, `SheetBody`, `SheetFooter`; or
  `useSheet(options)` with `ref` on your own dialog.
- Astro: `<Sheet id presentation snapPoints initialSnap replace history keyboard class>`, content in
  the default slot; give the title the id `${id}-title`.

## Part 2: working on this package

### Layout

- `src/index.ts`: the core, `attach()` and `enhance()`. Framework-free.
- `src/history.ts`, `src/keyboard.ts`, `src/drag.ts`: plugins; a plugin gets the sheet and returns
  its cleanup.
- `src/adapter.ts`: the React and Preact adapter against a small `Framework` interface;
  `src/react.ts` and `src/preact.ts` only bind it.
- `src/astro/Sheet.astro`: shipped as source.
- `src/sheet.css`: all layout. Presentations are sets of private custom properties (`--_*`),
  repeated inside the breakpoint media queries. The public ones (`--ss-*`) are only read, resolved
  with their defaults into `--_*` on `.ss`, so they inherit from any ancestor.
  The build also writes `sheet.layer.css`.
- `registry/`: shadcn component, blocks, shims for the type check; items listed in the root
  `registry.json`.
- `site/`: the documentation page on the shared frame, `content.mjs` holds its fictional content.
- `test/e2e/`: Playwright against `_site/scroll-sheet/`; `test/fixtures/` builds the adapter
  fixtures; `test/shadcn.mjs` adds this package's checks to the shadcn smoke test.

### Things that look odd and are on purpose

- With the script attached (`data-ss-ready`) the flex layout runs in normal direction with the
  spacer first; without it, reversed, so the browser's own start position shows the panel. Scroll
  offsets and scroll timelines only agree between engines in normal direction.
- Snap markers are 1px high: WebKit ignores empty snap areas once a scroller has several.
- Sheets move in and out by scrolling when the script runs (a transform would move their snap
  points); only the centred dialog uses a CSS transition.
- Before `close()` the scroller is put back at its open position in the same task: WebKit returns to
  the last snap target when the dialog shows again.
- Adopting a dialog the browser opened before the script: snapping is off for one frame and a
  running enter transition is finished first; it stays at the snap point nearest to where it was.
- `requestClose()` resolves in the native `close` handler, after `ss:close`, not when
  `dialog.close()` is called: that event is queued, and code awaiting the promise must see the
  sheet fully closed. One pending close per sheet; `open()`, `close()` and `destroy()` settle it.
- A breakpoint that changes the drag axis of an open sheet snaps it to full: a scroll offset on
  one axis means nothing on the other.
- The history plugin steps back only over its own entry: its token in `ssEntry`, the same URL and,
  where the Navigation API exists, the same entry key. A sheet opened while such a step back is
  under way pushes its entry after the step arrived.
- `scrollbar-gutter: stable` only while the page overflows; on a short page the core sets
  `--ss-gutter: auto` on the root, as a reserved gutter would shift it.
- The history plugin sets `scrollRestoration = 'manual'` on the entry below a sheet's entry and
  gives it its mode back (`ssMode` in its state) after it was reached again: Safari on iOS keeps
  the scroll position it saved the first time an entry was left, so stepping back over a second
  sheet's entry jumped the page. Only visible in the iOS simulator or on a device.
- The exit transition of `display` and `overlay` applies only without the script. With it the
  exit has run before `close()`, and the scroller is back at its open position: kept in the top
  layer, the panel would show in full once more (Chromium).
- The flex direction sits on `.ss`, not `.ss[open]`: without script the exit transition keeps the
  dialog on screen after `[open]` is gone.
- The drag plugin turns snapping off while the mouse drags and back on at the next `scrollend`
  after the release, listened for from the next frame on (the drag's own last step sends one).
- `open()` right after a close whose `close` event is still queued ends that close first
  (`ss:close`, promise settled), so a sheet reopened in the same task never waits on a dead close.
- The core keeps page-wide listeners for its lifetime (the input kind, the `commandfor` fallback
  and the history plugin's popstate check); they hold no sheet and are installed once.
- Opened by a tap or click, the core focuses the dialog itself (`tabindex="-1"`), not its first
  control: Chrome and Safari draw the keyboard focus ring on a control focused after a tap that
  focused nothing. Opened by a key, the browser's own choice stays; so does an `[autofocus]` one.

### Commands (from the repository root)

```sh
pnpm install
node scripts/typecheck.mjs scroll-sheet
pnpm build                         # vp pack, publint and arethetypeswrong
node scripts/size.mjs scroll-sheet
pnpm site && node packages/scroll-sheet/test/fixtures/build.mjs
npx playwright test packages/scroll-sheet --project chromium --project webkit   # Firefox runs in CI
pnpm test:shadcn
```

### Conventions

- No runtime dependencies; optional behaviour is a plugin.
- The script reads layout (computed styles, geometry, scroll offsets) and scrolls; it never writes
  layout styles, apart from the one-frame snap switch when adopting an open dialog and the keyboard
  plugin's viewport variables.
- Every must-have behaviour has a browser test in all engines, including the page without script.
  iOS behaviour (touch drag, toolbar, keyboard, back swipe) is checked in the iOS simulator by hand;
  see docs/testing.md.
- Descriptive names, English in code, comments and docs, no project code names.
- Examples, fixtures and docs use fictional content. Never name or describe a client, its code, its
  paths or its numbers in this repository, including commit messages.
