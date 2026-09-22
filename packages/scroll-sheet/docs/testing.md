# Testing

## Automated

| What | Where | Engines |
| --- | --- | --- |
| Opening at a marked snap point, moving between snap points, the expanded state | `test/e2e/interaction.spec.ts` | Chromium, WebKit, Firefox |
| The page keeps its scroll position while a sheet is open and after it closes; nothing becomes `position: fixed` | `interaction.spec.ts` | all |
| Focus moves in, Escape closes, focus returns to the trigger | `interaction.spec.ts` | all |
| Tab stays in the open sheet | `interaction.spec.ts` | Chromium, Firefox (WebKit tabs only between fields by default) |
| A click on the dimmed area closes and reaches nothing underneath; a press that starts on the panel does not close | `interaction.spec.ts` | all |
| Dragged away it closes; a cancelled close snaps back | `interaction.spec.ts` | all |
| Nested sheets return focus step by step without errors | `interaction.spec.ts` | all |
| The sheet is above any z-index | `interaction.spec.ts` | all |
| Presentations: bottom on phones, drawer from the end on wide screens; drawers from both edges, left to right and right to left; replace; `<form method="dialog">` | `interaction.spec.ts` | all |
| History plugin: back closes the top sheet and keeps the address; a sheet closed by its button removes its entry; closing after the app navigated on keeps the navigation; a sheet reopened right after closing keeps its entry | `interaction.spec.ts` | all |
| `closeTop()` | `interaction.spec.ts` | all |
| Lifecycle: `open()` during an animated close, an immediate close ending an animated one, `requestClose()` resolving after `ss:close`, `destroy()` leaving the stack, focus return to the `invoker` given to `open()` | `interaction.spec.ts` | all |
| A breakpoint crossed while open (bottom sheet ↔ drawer) shows the sheet in full with the right expanded state; a centred dialog scrolls long content; `--ss-*` tokens inherit from an ancestor | `interaction.spec.ts` | all |
| The page with scripts off: buttons open and close sheets, Escape closes them, the page does not move, a sheet cannot be dragged away completely | `test/e2e/nojs.spec.ts` | all |
| React, Preact and Astro: server markup equals hydrated markup, no hydration errors; a sheet opened before hydration is taken over where it is (position, focus, snap point); a controlled sheet reports user closes, follows quick prop changes and undoes native opens and closes its owner refuses | `test/e2e/adapters.spec.ts` | all |
| axe on the page (script on and off) and in five open sheets; one named modal dialog, no nested dialog roles | `test/e2e/a11y.spec.ts` | Chromium |
| The shadcn component and seven blocks install, build and work in a fresh shadcn project | `test/shadcn.mjs` via `pnpm test:shadcn` | Chromium |
| Size budget per entry | `budgets.json` via `pnpm size` | CI |

Firefox does not start locally on the maintainer's machine; it runs in CI.

## By hand

### iOS simulator (done 22.09.2026, iPhone 18 Pro, iOS 27.0, Safari 27.0)

- [x] Opens from a scrolled page at the marked snap point; the page stays where it was and the
  floating toolbar stays collapsed.
- [x] Touch drag on the header expands to the full height; a drag on the content below the full
  height expands the sheet; at the full height the content scrolls, and at its top the next drag
  moves the sheet down and closes it.
- [x] The sticky footer stays at the bottom edge at every snap point.
- [x] A tap on the dimmed area closes the sheet and nothing underneath is activated.
- [x] Keyboard plugin: focusing a field puts the sheet above the keyboard with its header and the
  field in view; the page behind does not move; after the keyboard closes the sheet is back on its
  snap point.
- [x] History plugin: the back swipe from the left edge closes the open sheet and keeps the page.
- [x] History plugin: a second sheet opened further down the page and closed with its button or
  the back swipe keeps the page where it is now. Before the fix Safari jumped back to the position
  of the first opening, as it keeps the scroll position it saved the first time the page entry
  was left (a desktop engine test cannot reproduce it).
- [x] Centred dialog with the keyboard up: its body scrolls, the buttons below the field stay
  reachable; `<form method="dialog">` Cancel closes it and the page stays.
- [x] Without the keyboard plugin iOS moves the page behind the sheet when a field is focused (why
  the plugin exists).
- [x] While a sheet is open, Safari colours its status bar and the area under the toolbar from the
  page background: dark with a dark body, light with a light one (so the page sets its body
  background for that time).

### Still to do on real devices before 1.0

- [ ] iPhone with iOS 27 and one with iOS 26: toolbar fill under a sheet in light and dark pages,
  portrait and landscape, with the toolbar collapsed and expanded; ProMotion smoothness of snapping.
- [ ] iOS WKWebView (an app shell), with the app's keyboard settings and a `data-ss-scroll-root`.
- [ ] Android Chrome with the real keyboard, with and without `interactive-widget=resizes-content`;
  the system back gesture with and without the history plugin.
- [ ] VoiceOver on iOS and macOS, TalkBack on Android, NVDA with Firefox and Chrome on Windows:
  name, focus on open and close, nothing outside the sheet reachable, swipe gestures.
- [ ] Windows with a mouse wheel and a touch screen; macOS with a trackpad.
- [ ] Text zoom 200 %, forced colours, print.
