# Replacing a sheet or modal library

Most overlay libraries put a portal at the end of `<body>`, position it with z-index and
transforms, lock the page by rewriting `<body>` styles, trap focus in script and animate with
springs. scroll-sheet leaves all of that to the platform: a modal `<dialog>` in the top layer, the
page behind inert, CSS scroll snap for dragging. This page maps the usual options and says what is
deliberately different.

## What to remove

- **Body scroll locks.** Classes or inline styles that set `overflow: hidden` or `position: fixed`
  on `<html>` or `<body>` while an overlay is open. The stylesheet locks the root with
  `:root:has(dialog.ss:modal)` and never moves it, so the scroll position stays. If an app shell
  scrolls an element instead of the document, give that element `data-ss-scroll-root`.
  A `position: fixed` lock without a saved offset is what makes a page jump to the top when a
  sheet opens and stay there after it closes.
- **z-index for overlays, backdrops and the header.** The top layer is above every z-index. Keep
  z-index for things that are not overlays.
- **Focus traps and saved focus.** `showModal()` makes the rest of the page inert and moves focus
  in; the core returns focus to the button that opened each sheet, also for nested sheets. One
  shared "last focused element" for all overlays breaks as soon as two are open.
- **Portals for the sheet.** The dialog can stay where it is in your component tree; the top layer
  lifts it out visually. Portals are still useful for things that must render inside an open sheet
  (see "Widgets and toasts").
- **Gesture and animation libraries used only for the sheet.** Dragging, momentum and snapping are
  native scrolling.
- **Keyboard adjustment hooks.** Use the `keyboard()` plugin; for Android set
  `interactive-widget=resizes-content` in the viewport meta.
- **Choosing the overlay component by user agent or device class on the server.** Use one element
  with `data-ss="bottom md:end"`; the switch is CSS.

## Option by option

| Typical option | scroll-sheet |
| --- | --- |
| `open` / `isOpen` | `open` (controlled, React/Preact) or the dialog's own state (uncontrolled) |
| `onDismiss`, `onClose`, `onOpenChange(false)` | `onOpenChange(false, { reason })` or `ss:close` (`detail.reason`) |
| Veto a close | cancel `ss:requestclose` (`event.preventDefault()`); a dragged sheet snaps back |
| `snapPoints` as functions of measured heights | `.ss-snap` markers with `--ss-at` as CSS lengths (`50dvh`, `320px`); the full height is always one |
| `defaultSnap` / `initialSnap` | `data-ss-initial` on a marker, `initialSnap` in the adapters |
| `snapTo(fn)` | `sheet.snapTo(index \| 'full')` |
| `header`, `footer` props | `.ss-header`, `.ss-footer` (the footer sticks to the bottom edge at every height) |
| `expandOnContentDrag` | built in: below the full height a drag on the content moves the sheet; at the full height the content scrolls and at its top the next drag moves the sheet down |
| `blocking: false` (page usable behind) | not supported: sheets are modal. For a non-modal panel use `popover` or `dialog.show()` |
| `scrollLocking` | automatic, in CSS |
| `initialFocusRef` | the `autofocus` attribute on the element inside the dialog |
| `onSpringStart` / `onSpringEnd` with OPEN/CLOSE | `ss:open` when it opens, `ss:close` after it has left; `requestClose()` resolves after the exit |
| `skipInitialTransition` | `prefers-reduced-motion`, or no transition in your CSS |
| `maxHeight`, full-screen variant | `--ss-top-gap: 0px` for a full-screen bottom sheet; `center` with `--ss-dialog-size: 100vw` for a full-screen dialog |
| Radix/Base UI `Root`, `Trigger`, `Portal`, `Content`, `Overlay`, `Title`, `Description`, `Close` | `Sheet` (or `ScrollSheet` in shadcn), `SheetTrigger`, —, the sheet itself, `::backdrop`, `SheetTitle`, `ScrollSheetDescription`, `SheetClose` |
| `modal={false}` | not supported (see `blocking: false`) |

## A central modal store

Apps often keep every modal in one store (a reducer or context) that components subscribe to in
order to open and close them. If every subscriber re-renders on every change, opening a sheet
re-renders every product tile that asked for a handle. With scroll-sheet a component that only
opens a sheet needs no subscription at all: render a trigger with `commandfor`, or call
`getSheet(dialog).open()`. Keep the store for what really is shared state, subscribe per sheet id,
and let each sheet report through its own events. A back handler in a native shell calls
`closeTop()`.

Steps inside one overlay (a list, then a detail with a back button) are content, not separate
sheets: render them inside one sheet and move between them there. Add a history entry per step
yourself if the back button should go back a step.

## History

The `history()` plugin adds one entry per open sheet and closes the top sheet on back. A router
that closes overlays on every navigation should stop doing that for these entries (they keep the
same URL). Sheets that must survive navigation keep their state outside the sheet and reopen.

## Widgets and toasts

Everything outside the open modal dialog is inert, however high its z-index. Toasts with buttons,
autocompletes, payment and review widgets that open from inside a sheet must render inside it:
`topSheet()?.dialog` is the place. Iframes inside a sheet work as usual.

## Not included on purpose

- Non-modal sheets over a page that stays usable (use `popover` or `dialog.show()`).
- Drag handles that resize without snap points, rubber-banding beyond native scrolling.
- Animations other than sliding and fading.
- Opening a start drawer with a swipe from the left edge (the system's back gesture).
