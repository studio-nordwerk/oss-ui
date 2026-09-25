/*
 * scroll-sheet core. The markup and the stylesheet already open, show and close a sheet with
 * `commandfor`; this script adds what the platform cannot do alone:
 * - one cancelable close path for every way of closing (close button, Escape, a tap on the dimmed
 *   area, dragging the sheet away), with an exit animation that keeps the dialog modal until it ends;
 * - opening at a snap point, and events and an API for frameworks and stores;
 * - focus back to the element that opened the sheet (Safari does not focus tapped buttons), and
 *   focus on the sheet itself, without a focus ring, when a tap or click opened it;
 * - the handle as a button (command="--ss-cycle"): each press moves to the next snap point;
 * - a fallback for browsers without invoker commands.
 * The script reads layout and scrolls; positions come from CSS scroll snap.
 */

export type CloseReason = 'button' | 'escape' | 'backdrop' | 'swipe' | 'api' | 'history' | 'replaced' | 'native';

export interface OpenOptions {
  /** Element focus returns to on close. Default: the invoking button, or the focused element. */
  invoker?: Element | null;
  /** Snap point to open at: an index into `snapPoints`, or 'full'. Default: [data-ss-initial]. */
  snap?: number | 'full';
}

export interface SheetState {
  open: boolean;
  /** Visible heights of the snap points in px, smallest first; the last one is the full sheet. */
  snapPoints: number[];
  /** Index into snapPoints of the current resting position, -1 while closed. */
  snap: number;
}

export interface Sheet {
  readonly dialog: HTMLDialogElement;
  readonly state: SheetState;
  /** Opens the sheet; on a sheet that is closing, cancels the close and brings it back. */
  open(options?: OpenOptions): void;
  /**
   * Closes with the exit animation unless an `ss:requestclose` listener cancels. Resolves after
   * `ss:close` with true, or with false when it was cancelled or reopened before it finished.
   */
  requestClose(reason?: CloseReason): Promise<boolean>;
  /** Closes at once, without asking and without animation. */
  close(reason?: CloseReason): void;
  snapTo(snap: number | 'full', options?: { instant?: boolean }): void;
  destroy(): void;
}

/** A plugin gets the sheet when it attaches and returns its cleanup. */
export type Plugin = (sheet: Sheet) => void | (() => void);

export interface SheetOptions {
  plugins?: Plugin[];
  /** Close the other open sheets when this one opens. Also data-ss-replace on the dialog. */
  replace?: boolean;
}

const sheets = new WeakMap<HTMLDialogElement, Sheet>();
/** Open sheets, the most recently opened last. */
const stack: Sheet[] = [];
const hasScrollEnd = typeof window != 'undefined' && 'onscrollend' in window;

const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const emit = (dialog: HTMLDialogElement, type: string, detail: object, cancelable = false) =>
  dialog.dispatchEvent(new CustomEvent(`ss:${type}`, { detail, cancelable }));
const unstack = (sheet: Sheet) => {
  const index = stack.indexOf(sheet);
  if (index >= 0) stack.splice(index, 1);
  // A sheet under another one is marked (data-ss-covered) for the stylesheet; the new top is not.
  sheet.dialog.removeAttribute('data-ss-covered');
  stack[stack.length - 1]?.dialog.removeAttribute('data-ss-covered');
  // The stylesheet keeps a scrollbar gutter while the page is locked; a page that did not scroll
  // had none, so it gets none either (set in open), and loses the override with the last sheet.
  if (!stack.length) document.documentElement.style.removeProperty('--ss-gutter');
};

export function attach(dialog: HTMLDialogElement, options: SheetOptions = {}): Sheet {
  const existing = sheets.get(dialog);
  if (existing) return existing;
  install();

  const panel = dialog.querySelector<HTMLElement>(':scope > .ss-panel')!;
  const rest = dialog.querySelector<HTMLElement>(':scope > .ss-rest');
  let invoker: HTMLElement | null = null;
  // What had focus before opening: where the browser's own focus restoration goes on close.
  let before: Element | null = null;
  let reason: CloseReason = 'native';
  let snap = -1;
  // The drag axis the sheet was last placed on; a breakpoint that changes it changes the presentation.
  let placedOn: string | null = null;
  let pressedOnDialog = false;
  let opening = false;
  let scrollTimer = 0;
  let frame = 0;
  /** The close in progress: its promise, how to stop its animation, how to settle it. */
  let pending: { promise: Promise<boolean>; stop: () => void; settle: (closed: boolean) => void } | null = null;
  const cleanups: (() => void)[] = [];

  const listen = <K extends string>(target: EventTarget, type: K, handler: (event: any) => void, capture = false) => {
    target.addEventListener(type, handler, capture);
    cleanups.push(() => target.removeEventListener(type, handler, capture));
  };

  // The drag axis follows the presentation, which can change with the viewport: bottom sheets
  // scroll vertically, drawers horizontally, the centred dialog not at all.
  const axis = () => {
    const style = getComputedStyle(dialog);
    return style.overflowX != 'hidden' ? 'x' : style.overflowY != 'hidden' ? 'y' : null;
  };
  const rtl = () => getComputedStyle(dialog).direction == 'rtl';
  // Bottom sheets and end drawers put the spacer before the panel: open is the far end of the
  // scroll range. Start drawers put it after: open is the start.
  const restFirst = () =>
    !!rest && (axis() == 'x' ? rest.offsetLeft < panel.offsetLeft !== rtl() : rest.offsetTop < panel.offsetTop);
  // How far the panel has moved away from its fully open position, and the most it can.
  const travel = () => {
    const x = axis() == 'x';
    const max = x ? dialog.scrollWidth - dialog.clientWidth : dialog.scrollHeight - dialog.clientHeight;
    const position = Math.abs(x ? dialog.scrollLeft : dialog.scrollTop);
    return { at: restFirst() ? max - position : position, max };
  };
  // This sheet's own markers, not those of a sheet nested inside it.
  const markers = () =>
    [...panel.querySelectorAll<HTMLElement>('.ss-snap')].filter(
      (marker) => marker.offsetParent && marker.closest('dialog') == dialog,
    );
  // How much of the sheet shows when a marker rests at the bottom edge (its bottom edge snaps).
  const shownAt = (marker: HTMLElement) => Math.min(marker.offsetTop + marker.offsetHeight, panel.offsetHeight);
  // Visible heights of the snap points, smallest first; the full sheet last.
  const snapPoints = () => {
    if (axis() != 'y') return axis() ? [panel.offsetWidth] : [];
    return [...new Set([...markers().map(shownAt), panel.offsetHeight])].sort((a, b) => a - b);
  };
  const nearest = (points: number[], shown: number) =>
    points.reduce((best, point, index) => (Math.abs(point - shown) < Math.abs(points[best] - shown) ? index : best), 0);
  const current = () => {
    const points = snapPoints();
    if (!dialog.open || !points.length) return -1;
    const shown = (axis() == 'x' ? panel.offsetWidth : panel.offsetHeight) - travel().at;
    return shown < points[0] / 2 ? -1 : nearest(points, shown);
  };

  const scrollToTravel = (distance: number, instant?: boolean) => {
    const behavior: ScrollBehavior = instant || reducedMotion() ? 'instant' : 'smooth';
    const { max } = travel();
    const position = restFirst() ? max - distance : distance;
    // Right to left, horizontal scroll offsets run from 0 into negative values.
    if (axis() == 'x') dialog.scrollTo({ left: rtl() ? -position : position, behavior });
    else dialog.scrollTo({ top: position, behavior });
  };

  const snapTo = (target: number | 'full', { instant }: { instant?: boolean } = {}) => {
    const points = snapPoints();
    placedOn = axis();
    if (!points.length) return;
    const index = target == 'full' ? points.length - 1 : Math.max(0, Math.min(points.length - 1, target));
    scrollToTravel(points[points.length - 1] - points[index], instant);
  };

  // The expanded state follows the geometry, not only the index: a breakpoint can turn a bottom
  // sheet at its first snap point into a drawer, whose only (full) position is index 0 as well.
  const updateSnap = () => {
    const points = snapPoints();
    const next = current();
    dialog.toggleAttribute('data-ss-expanded', dialog.open && (axis() != 'y' || next == points.length - 1));
    if (next == snap) return;
    snap = next;
    emit(dialog, 'snap', { snap, snapPoints: points });
  };

  const onSettled = () => {
    if (!dialog.open || pending) return;
    const { at, max } = travel();
    const away = max > 0 && at >= max - 1;
    // Opening starts at the closed position; only a settle after that counts.
    if (opening) {
      if (away) return;
      opening = false;
    }
    if (away) {
      void sheet.requestClose('swipe').then((closed) => closed || snapTo(Math.max(snap, 0)));
      return;
    }
    updateSnap();
  };

  /** Ends the close in progress: false when it was called off, true after the dialog closed. */
  const settle = (closed: boolean) => {
    const current = pending;
    if (!current) return;
    pending = null;
    current.stop();
    delete dialog.dataset.ssClosing;
    current.settle(closed);
  };

  const finish = () => {
    // Reopened before this close event arrived, or already finished by open(): nothing to end.
    if (dialog.open || !stack.includes(sheet)) return;
    delete dialog.dataset.ssClosing;
    dialog.removeAttribute('data-ss-expanded');
    unstack(sheet);
    opening = false;
    snap = -1;
    // Chrome and Firefox return focus to the element focused before opening, and Safari does not
    // focus tapped buttons: go to the recorded invoker, unless the app moved focus elsewhere in
    // the meantime or a sheet on top holds it.
    const top = stack[stack.length - 1];
    const now = document.activeElement;
    const free = !now || now == document.body || now == before || dialog.contains(now);
    if (invoker?.isConnected && free && (!top || top.dialog.contains(invoker))) invoker.focus({ preventScroll: true });
    invoker = before = null;
    const why = reason;
    reason = 'native';
    emit(dialog, 'close', { reason: why });
    settle(true);
  };

  const sheet: Sheet = {
    dialog,
    get state() {
      return { open: dialog.open, snapPoints: snapPoints(), snap: current() };
    },
    open({ invoker: from, snap: initial }: OpenOptions = {}) {
      if (dialog.open) {
        // Closing: call the close off and bring the sheet back to where it rested.
        if (pending) {
          settle(false);
          snapTo(snap >= 0 ? snap : 'full');
        }
        return;
      }
      // Closed in this task, its close event still queued: end that close first.
      finish();
      if (options.replace || dialog.hasAttribute('data-ss-replace')) {
        for (const other of [...stack]) if (other != sheet) other.close('replaced');
      }
      const active = (before = document.activeElement);
      invoker = (from ?? (active != document.body ? active : null)) as HTMLElement | null;
      const page = document.documentElement;
      const short = page.scrollHeight <= page.clientHeight;
      // A sheet with depth: the page recedes towards the top of the screen, measured before it locks.
      if (dialog.hasAttribute('data-ss-depth')) {
        const behind = document.querySelector<HTMLElement>('[data-ss-page]') ?? document.body;
        behind.style.setProperty('--ss-page-y', `${-behind.getBoundingClientRect().top}px`);
      }
      // data-ss-modal="false": the page stays usable around the sheet (no top layer, no lock).
      if (dialog.dataset.ssModal == 'false') dialog.show();
      else dialog.showModal();
      // Opened by a tap or click: focus goes to the dialog, not to its first control, where
      // browsers would draw the keyboard focus ring (the tap focused nothing before). Tab still
      // reaches the first control; an [autofocus] element keeps its focus.
      if (viaPointer && !document.activeElement?.hasAttribute('autofocus')) {
        if (!dialog.hasAttribute('tabindex')) dialog.tabIndex = -1;
        dialog.focus({ preventScroll: true });
      }
      stack[stack.length - 1]?.dialog.setAttribute('data-ss-covered', '');
      stack.push(sheet);
      if (stack.length == 1 && short) page.style.setProperty('--ss-gutter', 'auto');
      const marked = markers().find((marker) => marker.hasAttribute('data-ss-initial'));
      const target = initial ?? (marked ? snapPoints().indexOf(shownAt(marked)) : 'full');
      // Sheets and drawers slide in by scrolling from their closed position to the snap point,
      // in the same task as showModal(), so nothing shows at the wrong place first.
      opening = !!axis() && !reducedMotion();
      if (opening) scrollToTravel(travel().max, true);
      snapTo(target);
      if (!opening) updateSnap();
      emit(dialog, 'open', { invoker, snap: target });
    },
    requestClose(why = 'api') {
      if (!dialog.open) return Promise.resolve(false);
      if (pending) return pending.promise;
      // data-ss-dismissible="false": only the close button and the API close it.
      const refused = dialog.dataset.ssDismissible == 'false' && why != 'button' && why != 'api';
      if (refused || !emit(dialog, 'requestclose', { reason: why }, true)) return Promise.resolve(false);
      reason = why;
      let resolve!: (closed: boolean) => void;
      const promise = new Promise<boolean>((done) => (resolve = done));
      let timer = 0;
      let stopListening = () => {};
      pending = {
        promise,
        stop: () => {
          clearTimeout(timer);
          stopListening();
        },
        settle: resolve,
      };
      const leave = () => {
        pending?.stop();
        // Leave the scroller at the open position: WebKit returns to the last snap target when the
        // dialog shows again. Same task as close(), so it never paints. The promise settles when
        // the close event has run (finish).
        if (axis()) scrollToTravel(0, true);
        dialog.close();
      };
      // A sheet dragged all the way out is already gone. Otherwise it leaves while it stays modal:
      // sheets and drawers scroll to their closed position, the centred dialog runs its
      // transition; then it closes.
      const { at, max } = travel();
      if ((max > 0 && at >= max - 1) || reducedMotion()) {
        leave();
        return promise;
      }
      dialog.dataset.ssClosing = '';
      const scrolls = !!axis() && max > 0;
      if (scrolls) scrollToTravel(max);
      const target: EventTarget = scrolls ? dialog : panel;
      const type = scrolls ? (hasScrollEnd ? 'scrollend' : 'scroll') : 'transitionend';
      const onEnd = (event: Event) => {
        if (event.type == 'transitionend' ? event.target == panel : travel().at >= travel().max - 1) leave();
      };
      target.addEventListener(type, onEnd);
      stopListening = () => target.removeEventListener(type, onEnd);
      timer = setTimeout(
        leave,
        scrolls ? 700 : parseFloat(getComputedStyle(panel).transitionDuration) * 1000 + 80,
      ) as unknown as number;
      return promise;
    },
    close(why = 'api') {
      if (!dialog.open) return;
      pending?.stop();
      reason = why;
      if (axis()) scrollToTravel(0, true);
      dialog.close();
    },
    snapTo,
    destroy() {
      if (!sheets.has(dialog)) return;
      cleanups.forEach((cleanup) => cleanup());
      clearTimeout(scrollTimer);
      cancelAnimationFrame(frame);
      settle(false);
      unstack(sheet);
      dialog.style.removeProperty('scroll-snap-type');
      dialog.removeAttribute('data-ss-expanded');
      delete dialog.dataset.ssReady;
      sheets.delete(dialog);
    },
  };

  // Invoker commands: open and close through this script, so both get the same treatment as
  // script calls. Without the script the browser runs them itself.
  listen(dialog, 'command', (event: Event & { command: string; source: Element | null }) => {
    if (event.command == 'show-modal') {
      event.preventDefault();
      sheet.open({ invoker: event.source });
    } else if (event.command == 'close' || event.command == 'request-close') {
      event.preventDefault();
      void sheet.requestClose('button');
    } else if (event.command == '--ss-cycle') cycle(sheet);
  });
  // Escape, the Android back gesture and requestClose() arrive as a cancelable cancel event.
  // A non-modal dialog gets no cancel event: Escape is handled here.
  listen(dialog, 'keydown', (event: KeyboardEvent) => {
    const own = (event.target as Element).closest('dialog') == dialog;
    if (event.key == 'Escape' && own && !dialog.matches(':modal')) void sheet.requestClose('escape');
  });
  listen(dialog, 'cancel', (event: Event) => {
    event.preventDefault();
    void sheet.requestClose('escape');
  });
  // The dialog box itself is only hit outside the panel: the dimmed area. Both the press and the
  // release must be there, so a drag that starts in the panel does not close it.
  listen(dialog, 'pointerdown', (event: PointerEvent) => (pressedOnDialog = event.target == dialog));
  listen(dialog, 'click', (event: MouseEvent) => {
    if (event.target == dialog && pressedOnDialog) void sheet.requestClose('backdrop');
    pressedOnDialog = false;
  });
  listen(dialog, hasScrollEnd ? 'scrollend' : 'scroll', () => {
    if (hasScrollEnd) return onSettled();
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(onSettled, 120) as unknown as number;
  });
  listen(dialog, 'close', finish);
  // A breakpoint can switch the presentation of an open sheet: it then shows in full in the new
  // one, as the scroll position of the old one means nothing on the other axis.
  listen(window, 'resize', () => {
    if (!dialog.open || pending) return;
    if (axis() != placedOn) snapTo('full', { instant: true });
    updateSnap();
  });

  // Opened before the script ran (commandfor works without it): the layout switches to its
  // scripted form under the open sheet, which keeps its height. Snapping is off for that moment,
  // or WebKit animates a re-snap to the target it remembers from before, and a running enter
  // transition is finished first, as its transform would stretch the scroll range.
  const adopting = dialog.open;
  let shownBefore = 0;
  if (adopting) {
    panel.getAnimations?.().forEach((animation) => animation.finish());
    shownBefore = dialog.getBoundingClientRect().bottom - panel.getBoundingClientRect().top;
    dialog.style.scrollSnapType = 'none';
  }
  dialog.dataset.ssReady = '';
  sheets.set(dialog, sheet);
  for (const plugin of options.plugins ?? []) {
    const cleanup = plugin(sheet);
    if (cleanup) cleanups.push(cleanup);
  }
  if (adopting) {
    stack.push(sheet);
    const points = snapPoints();
    const target = axis() == 'y' ? nearest(points, shownBefore) : 'full';
    snapTo(target, { instant: true });
    frame = requestAnimationFrame(() => dialog.style.removeProperty('scroll-snap-type'));
    updateSnap();
    emit(dialog, 'open', { invoker: null, snap: target });
  }
  return sheet;
}

/** Up to the next snap point, from the full height back to the lowest; like the handle of a native sheet. */
const cycle = (sheet: Sheet) => {
  const { snap, snapPoints } = sheet.state;
  if (snapPoints.length > 1) sheet.snapTo((snap + 1) % snapPoints.length);
};

/** The sheet attached to a dialog, if any. */
export const getSheet = (dialog: HTMLDialogElement) => sheets.get(dialog);

/** The most recently opened sheet that is still open: where toasts and popovers belong. */
export const topSheet = (): Sheet | undefined => stack[stack.length - 1];

/**
 * Asks the top sheet to close, e.g. from a native app's back button. Returns whether a sheet was
 * open to ask.
 */
export function closeTop(reason: CloseReason = 'api') {
  const top = topSheet();
  if (top) void top.requestClose(reason);
  return !!top;
}

/** Whether the last input was a pointer (tap, click) rather than a key. */
let viaPointer = false;
let installed = false;

/**
 * Once per page: notes whether the last input was a pointer or a key, and in browsers without
 * invoker commands lets commandfor buttons open and close attached sheets.
 */
function install() {
  if (installed || typeof document == 'undefined') return;
  installed = true;
  document.addEventListener('pointerdown', () => (viaPointer = true), true);
  document.addEventListener('keydown', () => (viaPointer = false), true);
  if ('commandForElement' in HTMLButtonElement.prototype) return;
  document.addEventListener('click', (event) => {
    const button = (event.target as Element).closest?.('button[commandfor]');
    const dialog = button && document.getElementById(button.getAttribute('commandfor')!);
    const sheet = dialog instanceof HTMLDialogElement && sheets.get(dialog);
    const command = button?.getAttribute('command');
    if (!sheet) return;
    if (command == 'show-modal') sheet.open({ invoker: button });
    else if (command == 'close' || command == 'request-close') void sheet.requestClose('button');
    else if (command == '--ss-cycle') cycle(sheet);
  });
}

/** Attaches to every dialog.ss under root. */
export function enhance(root: ParentNode = document, options: SheetOptions = {}) {
  return [...root.querySelectorAll<HTMLDialogElement>('dialog.ss')].map((dialog) => attach(dialog, options));
}
