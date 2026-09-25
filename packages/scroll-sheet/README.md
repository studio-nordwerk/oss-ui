# scroll-sheet

Bottom sheets, side drawers and dialogs on a native modal `<dialog>`. The dialog covers the page in
the top layer and is itself a scroller: the sheet's position is plain scrolling with CSS scroll
snap, so dragging, momentum and snap points come from the browser, and buttons with `commandfor`
open and close it before any script runs. A small script adds closing by dragging away, a tap on
the dimmed area, opening at a snap point, a handle that steps through the snap points and focus
return; the back button, the iOS on-screen keyboard and dragging with a mouse are opt-in plugins.
No runtime dependencies.

**Live examples:** https://www.nordwerk.studio/oss/scroll-sheet (size picker, filter, menu, mini
cart, contact form, store finder, lightbox, each with its code; switch the script off to see what
the browser does alone).

| Part | gzip, minified |
| --- | --- |
| Core: one close path, snap points, focus return, stacking, events, API | 2.8 kB |
| History plugin: back button and back swipe close the top sheet | +0.7 kB |
| Keyboard plugin: sheets above the iOS on-screen keyboard | +0.7 kB |
| Drag plugin: drag by the handle and header with a mouse | +1.1 kB |
| Swipe area plugin: swipe from the edge to open | +1.4 kB |
| Stylesheet: bottom and top sheets, drawers, dialog, breakpoints | 2.3 kB |
| Options stylesheet: non-modal, not dismissible, sequential snapping, handle only | +0.3 kB |
| Depth stylesheet: the page recedes, a covered sheet steps back | +0.6 kB |

Each plugin and each extra stylesheet is its own entry point: a page pays only for what it
imports. Types ship with every entry.

Adapters for React, Preact and Astro are included; they render the markup and attach the core.

## Install

```sh
pnpm add @nordwerk/scroll-sheet
```

React and Preact are optional peer dependencies; the Astro component compiles in your Astro build.

## Quick start

### Plain HTML

```html
<link rel="stylesheet" href="sheet.css" /> <!-- from the package -->

<button type="button" commandfor="sizes" command="show-modal">Choose a size</button>

<dialog class="ss" id="sizes" aria-labelledby="sizes-title">
  <div class="ss-panel">
    <i class="ss-snap" style="--ss-at: 50dvh" data-ss-initial></i>
    <button class="ss-handle" type="button" commandfor="sizes" command="--ss-cycle" aria-label="Change height"></button>
    <header class="ss-header">
      <h2 id="sizes-title">Choose a size</h2>
      <button class="ss-close" type="button" commandfor="sizes" command="close" aria-label="Close">×</button>
    </header>
    <div class="ss-body">…</div>
    <footer class="ss-footer"><button type="button">Add to bag</button></footer>
  </div>
  <div class="ss-rest"></div>
</dialog>

<script type="module">
  import { enhance } from '@nordwerk/scroll-sheet';
  import { history } from '@nordwerk/scroll-sheet/history';
  import { keyboard } from '@nordwerk/scroll-sheet/keyboard';
  enhance(document, { plugins: [history(), keyboard()] });
</script>
```

Without the script the sheet still opens, closes with its button and Escape, locks the page
behind it without moving it, and snaps while you drag; it just cannot be dragged away completely.

### React and Preact

```jsx
import { Sheet, SheetTrigger, SheetHandle, SheetHeader, SheetTitle, SheetClose, SheetBody, SheetFooter } from '@nordwerk/scroll-sheet/react'; // or '/preact'
import { keyboard } from '@nordwerk/scroll-sheet/keyboard';
import '@nordwerk/scroll-sheet/sheet.css';

const plugins = [keyboard()]; // made once, outside the component

<SheetTrigger sheet="sizes">Choose a size</SheetTrigger>
<Sheet id="sizes" snapPoints={['50dvh']} initialSnap={0} plugins={plugins} onOpenChange={(open, { reason }) => …}>
  <SheetHandle />
  <SheetHeader><SheetTitle>Choose a size</SheetTitle><SheetClose /></SheetHeader>
  <SheetBody>…</SheetBody>
  <SheetFooter>…</SheetFooter>
</Sheet>;
```

Uncontrolled by default: the dialog owns its state, triggers open it even before hydration, and
`onOpenChange` reports every change. Pass `open` to control it, and the prop wins: user closes
(button, Escape, dimmed area, swipe, back) are reported with `onOpenChange(false, { reason })`
instead of carried out, and the sheet opens and closes when `open` changes, also while a close is
still animating. What the browser does on its own and the owner does not follow (a trigger opening
a sheet held closed, a `<form method="dialog">` closing one held open) is reported and then undone.
`useSheet(options)` attaches the core to a dialog you render yourself; `sheetRef` hands you the API.

### Astro

```astro
---
import Sheet from '@nordwerk/scroll-sheet/astro';
---
<button type="button" commandfor="sizes" command="show-modal">Choose a size</button>
<Sheet id="sizes" snapPoints={['50dvh']} initialSnap={0} history keyboard drag>
  <header class="ss-header"><h2 id="sizes-title">Choose a size</h2>…</header>
  <div class="ss-body">…</div>
</Sheet>
```

The history, keyboard and drag plugins load only on pages whose sheets ask for them.

### Tailwind CSS

```css
@import "tailwindcss";
@import "@nordwerk/scroll-sheet/sheet.css" layer(components);
```

Utilities on your markup override the stylesheet, including its custom properties:
`class="ss [--ss-radius:1.5rem] [--ss-bg:var(--color-white)]"`.

### shadcn/ui

```sh
npx shadcn@latest add studio-nordwerk/oss-ui/scroll-sheet
npx shadcn@latest add studio-nordwerk/oss-ui/size-picker
```

`ScrollSheet`, `ScrollSheetTrigger`, `ScrollSheetContent`, `ScrollSheetHeader`, `ScrollSheetTitle`,
`ScrollSheetDescription`, `ScrollSheetBody`, `ScrollSheetFooter`, `ScrollSheetClose`,
`ScrollSheetHandle` and `useScrollSheet()`. Blocks: `size-picker`, `filter-drawer`, `mini-cart`,
`store-finder`, `mobile-menu`, `contact-dialog`, `lightbox`.

`ScrollSheetTrigger` takes your button with `asChild` or `render` and keeps its children, class
names and click handler. What ends up in the page must be a native `<button>`, since `commandfor`
works only there.

#### A drop-in for the shadcn/ui Drawer

```sh
npx shadcn@latest add studio-nordwerk/oss-ui/drawer --overwrite
```

This replaces `components/ui/drawer.tsx` with the same exports (`Drawer`, `DrawerTrigger`,
`DrawerContent`, `DrawerHeader`, `DrawerFooter`, `DrawerTitle`, `DrawerDescription`, `DrawerClose`,
`DrawerPortal`, `DrawerOverlay`, `DrawerSwipeHandle`, `DrawerSwipeArea`) and takes the props of both shadcn drawers:
Vaul's in the Radix styles and Base UI's in the Base UI styles. Call sites stay as they are.

| Vaul | Base UI | Here |
| --- | --- | --- |
| `open`, `defaultOpen`, `onOpenChange` | same | same; the second argument says why it closed |
| `direction` | `swipeDirection` | `bottom`, `top`, `left`, `right` |
| `snapPoints` (fractions or px) | `snapPoints` | same; CSS lengths work too |
| `activeSnapPoint`, `setActiveSnapPoint` | `snapPoint`, `defaultSnapPoint`, `onSnapPointChange` | same |
| `fadeFromIndex` | — | same: the dimmed area shows from that snap point on |
| `snapToSequentialPoint` | `snapToSequentialPoints` | same |
| `dismissible` | `disablePointerDismissal` | same |
| `modal` | `modal` | same |
| `shouldScaleBackground`, `setBackgroundColorOnScale` | `Drawer.Indent` | same; the page is `<body>` or `[data-ss-page]` |
| `handleOnly` | — | same |
| `repositionInputs` | `VirtualKeyboardProvider` | on by default (keyboard plugin) |
| — | `Drawer.SwipeArea` | `DrawerSwipeArea` (swipe area plugin, loaded only where it is used) |
| `onDrag`, `onRelease`, `onClose`, `onAnimationEnd` | `onOpenChangeComplete` | same |
| `nested` | nested drawers | automatic: a covered drawer steps back |

What stays different: the drawer is a native `<dialog>` in the top layer, so there is no portal
(`DrawerPortal` renders its children, `DrawerOverlay` nothing; style the dimmed area with
`backdrop:` utilities on `DrawerContent`) and no z-index. Vaul's `vaul-drawer-wrapper` becomes
`data-ss-page`. `closeThreshold` and `scrollLockTimeout` are accepted and have nothing to do:
closing and scrolling follow the browser's own scroll snapping. `drawer-demo` shows the calls.

### Next.js

The React entry is marked `'use client'`, so `<Sheet>` works in Server Components of the App
Router; it renders on the server and attaches in the browser.

## Markup

| Element | Required | Purpose |
| --- | --- | --- |
| `<dialog class="ss">` | yes | The sheet. Name it with `aria-labelledby` (a heading) or `aria-label` |
| `.ss-panel` | yes | What you see; header, body and footer go inside |
| `.ss-rest` | yes | Empty spacer after the panel: the room the panel moves into when dragged away |
| `.ss-snap` in the panel | no | A snap point of a bottom sheet; `--ss-at` is how much of the sheet shows, `data-ss-initial` opens there |
| `.ss-handle`, `.ss-header`, `.ss-body`, `.ss-footer` | no | Default layout: the body scrolls, the footer sticks to the bottom edge at every height |
| `button[commandfor][command]` | no | `show-modal` opens, `close` or `request-close` closes, anywhere on the page |
| `button.ss-handle` with `command="--ss-cycle"` | no | Each press moves the sheet up to its next snap point, from the full height back to the lowest (with the script). A `<span class="ss-handle" aria-hidden="true">` is only a bar to look at |
| `[data-ss-replace]` on the dialog | no | Close other open sheets when this one opens |
| `[data-ss-scroll-root]` anywhere | no | An element that scrolls instead of the document (an app shell); it is locked too. Give it `scrollbar-gutter: stable`, so locking it shifts nothing where scrollbars take space |

State attributes, for styling: `[open]`, `data-ss-ready` (script attached), `data-ss-expanded`
(at the full height), `data-ss-closing` (while leaving).

While a sheet is open the page keeps its scrollbar space (`scrollbar-gutter: stable`), so nothing
shifts; on a page too short to scroll the script leaves the gutter out, as there is no scrollbar
to replace. Where scrollbars take space (Windows, Linux) the sheet and its backdrop end at that
space, like any fixed element; `--ss-gutter: auto` on `:root` lets them reach the edge, and the
page then shifts when its scrollbar goes.

## Presentations

`data-ss` takes one presentation plus the same with a breakpoint prefix:

| Value | |
| --- | --- |
| `bottom` (default) | A sheet from the bottom edge, up to `--ss-sheet-max-size` wide, with snap points |
| `top` | A sheet from the top edge, dragged up to close |
| `end`, `start` | A drawer from the inline end or start edge (right or left, mirrored right to left) |
| `center` | A dialog in the middle |
| `sm:` `md:` `lg:` + any of them | From 40rem, 48rem, 64rem on |

`data-ss="bottom md:end"` is a bottom sheet on phones and a drawer on wider screens; the switch
is CSS, so the server sends one markup for every device. A sheet that is open while the
presentation changes (a rotated phone, a resized window) shows in full in the new one.

## Depth

`data-ss-depth` on a sheet (`depth` in the adapters) makes the page behind it recede while it is
open, like a sheet on iOS: the page shrinks towards the top of the screen, rounds its corners and
sits on a dark ground, and where scroll-driven animations exist it follows the sheet while it is
dragged. Load `@nordwerk/scroll-sheet/depth.css` after `sheet.css`. The receding page is
`<body>`, or the element marked `data-ss-page` in an app shell; give it a background of its own,
as the ground replaces the root element's. It needs the script, which records where the page
was scrolled.

**Fixed elements:** a transformed element becomes the containing block of its `position: fixed`
descendants, so a fixed header inside the receding page leaves the screen while the sheet is open.
Make it `position: sticky` (which keeps working), or wrap the page content in an element with
`data-ss-page` and keep fixed elements outside it (they then stay in place, above the ground).

**iOS:** Safari 26 keeps the strip behind the status bar in the page's own colour; like the
dimmed backdrop of every sheet, the dark ground starts below it.

With Tailwind, `depth.css` can go into the components layer like `sheet.css`; the ground is
`!important`, so a background utility on `<html>` does not hide it. The shadcn component loads it
and takes a `depth` prop. A depth sheet leaves a smaller gap at the top
by default, so a full-height sheet shows a sliver of the receded page; with
`--ss-sheet-max-size: none` it spans the whole width.

| Property | Default | |
| --- | --- | --- |
| `--ss-depth-bg` | `#000` | The ground around the receded page |
| `--ss-depth-inset` | `1rem` | Room at each side of the receded page |
| `--ss-depth-offset` | `safe-area-inset-top + 0.625rem` | How far the page moves down |
| `--ss-depth-radius` | `12px` | Corners of the receded page |

## Options

Attributes on the dialog; load `@nordwerk/scroll-sheet/options.css` after `sheet.css` for them.

| Attribute | |
| --- | --- |
| `data-ss-modal="false"` | Opens with `show()`: no dimmed area, no page lock, the page around the panel stays usable. Escape still closes it. Stacks with `--ss-z-index` (50) |
| `data-ss-dismissible="false"` | Dragging away, Escape, taps outside and the back button do not close it; its close button and `requestClose()` do |
| `data-ss-sequential` | A fast swipe stops at the next snap point instead of skipping it |
| `data-ss-handle-only` | Touch drags the sheet only by its handle; the body scrolls on its own at every height |

A sheet under a nested one gets `data-ss-covered` while the other is open; `depth.css` makes it
step back a little.

## Custom properties

Set them on the dialog or any ancestor, such as a theme on `:root`; the nearest value wins. The
stylesheet only reads them, so any value you set applies.

| Property | Default | |
| --- | --- | --- |
| `--ss-bg`, `--ss-fg` | `#fff`, inherit | Panel colours |
| `--ss-radius` | `16px` | Corner radius (only the corners away from the edge) |
| `--ss-shadow`, `--ss-backdrop` | soft, 40% black | |
| `--ss-padding` | `1rem` | Header, body and footer padding |
| `--ss-top-gap` | `max(safe-area-inset-top, 2.5rem)` | Space above a bottom sheet at its full height |
| `--ss-drawer-size`, `--ss-dialog-size`, `--ss-sheet-max-size` | `min(26rem, 100vw - 3rem)`, `min(34rem, 100vw - 2rem)`, `48rem` | |
| `--ss-peek` | `4.5rem` | Without script, how much of a dragged-down sheet stays |
| `--ss-duration`, `--ss-easing` | `0.36s`, iOS-like | Enter and exit where CSS runs them |

## API

```ts
import { attach, enhance, getSheet, topSheet, closeTop } from '@nordwerk/scroll-sheet';
const sheet = attach(dialog, { plugins, replace });
const sheets = enhance(root = document, options); // every dialog.ss, plus the commandfor fallback
```

| Member | |
| --- | --- |
| `open({ invoker, snap })` | Open; `snap` is an index into `snapPoints` or `'full'`. Calls off a close that is still animating; focus returns to `invoker` on close |
| `requestClose(reason)` | Close with the exit animation unless an `ss:requestclose` listener cancels. Resolves after `ss:close` with `true`, or with `false` when it was cancelled or called off |
| `close(reason)` | Close at once, also ending an animated close |
| `snapTo(index \| 'full', { instant })` | |
| `state` | `{ open, snapPoints, snap }`; `snapPoints` are visible heights in px, smallest first, the last is the full sheet |
| `destroy()` | Remove everything the script added; an open sheet stays open but leaves the stack |

Events on the dialog: `ss:open` (`detail.invoker`), `ss:snap` (`detail.snap`), `ss:requestclose`
(cancelable, `detail.reason`), `ss:close` (`detail.reason`). Reasons: `button`, `escape`,
`backdrop`, `swipe`, `history`, `replaced`, `api`, `native` (a `<form method="dialog">` or a
close from outside the script). `closeTop()` asks the most recent sheet to close and returns whether
there was one, for a native app's back button; `topSheet()` returns it, e.g. as the place to render
toasts and popovers that must stay usable while the sheet is open.

## Plugins

- **`history()`**: one history entry per open sheet, for the same URL. Back closes the top sheet;
  a sheet closed any other way steps back over its own entry while that entry is still the current
  one; forward onto an entry of a closed sheet does not reopen it (the entry is rewritten); if a
  listener cancels a close from back, the entry is pushed again. Chrome on Android also closes a
  modal dialog with its back gesture; that is handled like any close. The page's own entry does
  not restore a scroll position while a sheet's entry is above it (`history.scrollRestoration`),
  so closing never moves the page; it gets its mode back afterwards. A router that copies
  `history.state` into its own entries at the same URL should drop `ssSheets` and `ssEntry` in
  browsers without the Navigation API.
- **`keyboard()`**: while a sheet is open, places it on the visible part of the page when the iOS
  on-screen keyboard moves or shrinks it, puts it back on its snap point, scrolls the focused field
  into view inside the sheet, and puts the page behind back where it was. Android with
  `interactive-widget=resizes-content` needs no script.
- **`drag({ area, threshold })`**: a mouse drags the sheet by its handle and header (`area`, a
  selector), as touch and pen already do natively. It follows the pointer; on release it goes to the
  snap point the drag and its speed point at, or closes when it ends below half of the lowest one.
  The click after a drag is swallowed. The mouse wheel and trackpad still move a sheet as they
  scroll any scroller.
- **`swipeArea({ element, size, threshold })`**: a strip at the edge the sheet comes from; a swipe
  away from that edge opens the sheet, which follows the finger, and on release goes to the snap
  point the swipe and its speed point at, or closes again when it ends below half of the lowest
  one. Without `element` the plugin adds an invisible strip (`size`, default `1.5rem`) and keeps it
  at the edge of the current presentation, also across breakpoints; the centred dialog gets none.
  Touch, pen and mouse. The strip takes the taps on the page beneath it, and at the left edge it
  competes with the browser's back swipe, so keep it narrow there. Astro: `swipeArea`.

## iOS notes

- Nothing is ever `position: fixed` on the page, so the scroll position stays and Safari's
  toolbar does not expand when a sheet opens.
- Safari 26 and 27 colour their status bar and the area under their floating toolbar from the
  page background (`<body>`, `<html>`) while a modal sheet is open, not from the sheet. On a light
  page that matches a light sheet. A page with a dark body behind light content sets it for that
  time: `:root:has(dialog.ss:modal) body { background: #fff; }` (checked in the iOS 27 simulator).
  Do not extend the backdrop beyond the viewport.
- With the history plugin, closing a sheet keeps the page where it is, also after scrolling between
  two sheets: Safari would otherwise restore a position it saved earlier.
- Safe areas: panels pad with `env(safe-area-inset-*)` where they touch an edge. Use
  `viewport-fit=cover` in the viewport meta.
- Form fields at 16px or more: Safari zooms into smaller ones on focus.
- Never open a start drawer with a swipe from the left edge: that is the system's back gesture.

## Accessibility

- One modal `<dialog>` with a name; the page behind is inert, Tab stays in the sheet, Escape
  closes the top one. Focus moves in on open and back to the button that opened it on close, also
  in Safari and also for nested sheets.
- Nothing is announced as a second dialog; the handle is decorative (`aria-hidden`).
- With `prefers-reduced-motion`, sheets open and close without animation.

## Browser support

Current Chrome, Firefox and Safari (invoker commands: Chrome 135, Firefox 144, Safari 26.2; `:has()`,
`dvh`, `@starting-style`). Older browsers get the invoker-command fallback from the script. Where
scroll-driven animations exist (Chrome, Safari 26 and later), the backdrop follows the sheet.

## Replacing a sheet or modal library

See [docs/migration.md](docs/migration.md) for the usual options mapped to this package and what is
deliberately not supported.

## Prior art

scroll-sheet stands on work that set the bar for sheets on the web:

- [Vaul](https://github.com/emilkowalski/vaul) by Emil Kowalski made drag-to-dismiss drawers feel
  native in React and is the Drawer in shadcn/ui's Radix styles. Its API is the one the drop-in
  follows.
- [Base UI's Drawer](https://base-ui.com/react/components/drawer) is the Drawer in shadcn/ui's Base
  UI styles, with snap points, nested drawers, swipe areas and a virtual keyboard provider.
- [Silk](https://silkhq.com) shows how far native-feeling sheets can go; its sheet with depth is
  where the depth stylesheet took its cue.

They move the sheet with script. scroll-sheet takes the other road, native scrolling on a native
dialog, and is smaller for it. Measured bundled, minified and gzip, React and `cn` not counted
(September 2026), each shadcn `drawer.tsx` with its library: 5.8 kB for the drop-in on scroll-sheet
0.4.0, 22.1 kB on Vaul 1.1.2, 39.3 kB on Base UI 1.8.0 (+14.4 kB in an app that already has Base UI's
Dialog). The drop-in adds 3.2 kB of stylesheets; Vaul injects its styles from script, Base UI's are
Tailwind classes. The package's own React component is 3.8 kB with the core.

## Development

See [AGENTS.md](AGENTS.md) for the layout and conventions and [docs/testing.md](docs/testing.md) for
what is tested automatically and by hand. From the repository root:

```sh
pnpm install
pnpm check
pnpm serve   # the pages on http://localhost:4173/scroll-sheet/ after pnpm site
```

## Licence

MIT
