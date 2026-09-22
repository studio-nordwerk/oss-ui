/*
 * The controller. The track is a native horizontal scroller laid out entirely by carousel.css;
 * this adds what CSS cannot: arrows, dots, paging by group, an API and change events. It never
 * positions a slide itself: every move is a native scroll.
 */
import {
  EPS,
  buildPages,
  clamp,
  closest,
  pageOf,
  snapPositions,
  visibleRange,
  type Geometry,
  type Group,
  type Page,
} from './math.ts';

export type { Align, Geometry, Group, Page } from './math.ts';

export interface CarouselState {
  /** The slide at the snap position, or the destination of a move in flight. */
  index: number;
  page: number;
  pageCount: number;
  isBeginning: boolean;
  isEnd: boolean;
  /** Whether the content overflows at all. Without overflow there are no controls. */
  overflow: boolean;
}

export interface Labels {
  /** Accessible name of a default dot. */
  page: (n: number, count: number) => string;
  /** Live-region text after a settled move, from the first and last visible slide (1-based). */
  status: (first: number, last: number, count: number, slides: HTMLElement[]) => string;
}

export interface CarouselOptions {
  /** Slides per step of next and previous: a number or 'page'. Default: --sc-group, then 1. */
  group?: Group;
  /** Initial slide. Default: the slide with [data-sc-initial], then 0. */
  initial?: number;
  /** Next at the end goes to the start and the reverse. true fades, 'scroll' scrolls back. */
  rewind?: boolean | 'fade' | 'scroll';
  labels?: Partial<Labels>;
  /** Called after every settled move that changed the state, like the sc:change event. */
  onChange?: (state: CarouselState) => void;
  /** Default: [data-sc-prev], [data-sc-next], [data-sc-dots], [data-sc-status] inside the root. */
  prev?: HTMLElement | null;
  next?: HTMLElement | null;
  dots?: HTMLElement | null;
  status?: HTMLElement | null;
  /** Opt-in behaviour, e.g. drag() and autoplay(). */
  plugins?: Plugin[];
}

export interface MoveOptions {
  /** Jump instead of scrolling smoothly. */
  instant?: boolean;
}

export interface Carousel {
  readonly root: HTMLElement;
  readonly track: HTMLElement;
  readonly slides: HTMLElement[];
  readonly state: CarouselState;
  readonly index: number;
  readonly page: number;
  readonly pageCount: number;
  readonly isBeginning: boolean;
  readonly isEnd: boolean;
  next(): void;
  prev(): void;
  slideTo(index: number, options?: MoveOptions): void;
  goToPage(page: number, options?: MoveOptions): void;
  /** Measure again, e.g. after changing the direction or a custom property from script. */
  update(): void;
  destroy(): void;
  /** Present when the autoplay plugin is attached. */
  play?(): void;
  pause?(): void;
}

export interface Layout {
  pages: Page[];
  max: number;
  rtl: boolean;
  snap: 'mandatory' | 'proximity' | 'none';
  state: CarouselState;
}

/** What a plugin gets to work with. Listeners added through `listen` end with destroy(). */
export interface PluginContext {
  root: HTMLElement;
  track: HTMLElement;
  listen(
    target: EventTarget | null | undefined,
    type: string,
    handler: (event: any) => void,
    options?: AddEventListenerOptions,
  ): void;
  layout(): Layout;
  toPage(page: number): void;
  /** Scroll to a position, e.g. where a drag's momentum ends. */
  scrollTo(pos: number): void;
  /** Next or previous page; a quiet step is not announced in the live region. */
  step(direction: 1 | -1, wrap: boolean, quiet?: boolean): void;
  /** The user took hold of the track: a programmatic move in flight is abandoned. */
  grab(): void;
  /** While held, scrolling never counts as settled, e.g. during a drag. */
  hold(on: boolean): void;
  /** control: the user took over. settle: a move came to rest. measure: layout was read. */
  on(event: 'control' | 'settle' | 'measure', handler: () => void): void;
}

export type Plugin = (context: PluginContext) => { destroy?(): void; play?(): void; pause?(): void } | void;

const LABELS: Labels = {
  page: (n, count) => `Page ${n} of ${count}`,
  status: (first, last, count) =>
    first === last ? `Item ${first} of ${count}` : `Items ${first} to ${last} of ${count}`,
};

const px = (value: string) => parseFloat(value) || 0;
/** A computed length-percentage in px; percentages of scroll-padding refer to the scrollport. */
const lengthIn = (value: string, whole: number) => (value.trim().endsWith('%') ? (px(value) * whole) / 100 : px(value));

const instances = new WeakMap<HTMLElement, Carousel>();

/** The carousel attached to `root`, if any. */
export const getCarousel = (root: HTMLElement): Carousel | undefined => instances.get(root);

/** Attach to server-rendered markup. Attaching twice returns the same carousel. */
export function attach(root: HTMLElement, options: CarouselOptions = {}): Carousel {
  const existing = instances.get(root);
  if (existing) return existing;
  const track = root.querySelector<HTMLElement>('[data-sc-track]')!;

  const part = (name: 'prev' | 'next' | 'dots' | 'status') =>
    options[name] || root.querySelector<HTMLElement>(`[data-sc-${name}]`);
  const prevButton = part('prev');
  const nextButton = part('next');
  const dots = part('dots');
  const status = part('status');
  const labels = { ...LABELS, ...options.labels };
  const rewind = options.rewind === true ? 'fade' : options.rewind || false;
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const tabIndex = track.getAttribute('tabindex');

  const listeners = new AbortController();
  const listen: PluginContext['listen'] = (target, type, handler, opts) =>
    target?.addEventListener(type, handler, { signal: listeners.signal, ...opts });
  const hooks = { control: [] as (() => void)[], settle: [] as (() => void)[], measure: [] as (() => void)[] };
  const run = (name: keyof typeof hooks) => hooks[name].forEach((handler) => handler());

  let slides = [...track.children] as HTMLElement[];
  const marked = slides.findIndex((slide) => slide.hasAttribute('data-sc-initial'));
  let anchor = Math.max(0, options.initial ?? marked);
  // Pages are counted from this element, so they stay put when slides are added before it.
  const anchorSlide = slides[anchor];
  let needsInitial = anchor > 0;

  let geo: Geometry = { starts: [], sizes: [], port: 0, padStart: 0, padEnd: 0, max: 0, align: 'start' };
  let snaps: number[] = [];
  let pages: Page[] = [];
  let snap: Layout['snap'] = 'mandatory';
  let rtl = false;
  let pos = 0;
  let target = -1; // page of a programmatic move still in flight
  let scrolling = false;
  let touching = false;
  let busy = false;
  let quiet = false; // the move in flight was not asked for by the user: do not announce it
  let state: CarouselState;
  let settled: CarouselState | undefined;
  let frame = 0;
  let measureFrame = 0;
  let settleTimer = 0;
  let fadeTimer = 0;

  const readPos = () => Math.abs(track.scrollLeft);
  const positions = () => pages.map((page) => page.pos);
  const moveTo = (position: number, behavior: ScrollBehavior) =>
    track.scrollTo({ left: rtl ? -position : position, behavior });

  function measure() {
    slides = [...track.children] as HTMLElement[];
    const style = getComputedStyle(track);
    rtl = style.direction == 'rtl';
    const configured = String(options.group ?? style.getPropertyValue('--sc-group')).trim();
    const group: Group = configured == 'page' ? 'page' : Math.max(1, parseInt(configured) || 1);
    // While a drag suspends snapping, the computed value says none; keep the real one.
    if (!track.hasAttribute('data-sc-dragging')) {
      const type = style.scrollSnapType;
      snap = type == 'none' ? 'none' : type.includes('mandatory') ? 'mandatory' : 'proximity';
    }
    const box = track.getBoundingClientRect();
    const edge = rtl ? box.right - px(style.borderRightWidth) : box.left + px(style.borderLeftWidth);
    const offset = readPos();
    const port = track.clientWidth;
    geo = {
      starts: [],
      sizes: [],
      port,
      padStart: lengthIn(style.scrollPaddingInlineStart, port),
      padEnd: lengthIn(style.scrollPaddingInlineEnd, port),
      max: Math.max(0, track.scrollWidth - port),
      align: (style.getPropertyValue('--sc-align').trim() || 'start') as Geometry['align'],
    };
    for (const slide of slides) {
      const rect = slide.getBoundingClientRect();
      geo.starts.push((rtl ? edge - rect.right : rect.left - edge) + offset);
      geo.sizes.push(rect.width);
    }
    snaps = snapPositions(geo);
    if (anchorSlide?.parentNode == track) anchor = slides.indexOf(anchorSlide);
    anchor = Math.max(0, Math.min(anchor, slides.length - 1));
    pages = buildPages(geo, snaps, group, anchor);
    if (target >= pages.length) target = -1;

    // Only page starts are snap points, so a swipe comes to rest where a dot can point.
    const firsts = new Set(pages.map((page) => page.first));
    slides.forEach((slide, i) => slide.toggleAttribute('data-sc-snap-off', group != 1 && !firsts.has(i)));

    if (dots) {
      while (dots.children.length > pages.length) dots.lastElementChild!.remove();
      while (dots.children.length < pages.length) {
        const dot = document.createElement('button');
        dot.type = 'button';
        dot.className = 'sc-dot';
        dots.append(dot);
      }
      [...dots.children].forEach((dot, i) => dot.setAttribute('aria-label', labels.page(i + 1, pages.length)));
    }

    if (needsInitial && port && pages.length) {
      needsInitial = false;
      const initial = pages[pageOf(pages, anchor)].pos;
      if (Math.abs(readPos() - initial) > 1) moveTo(initial, 'instant');
    }
    pos = readPos();
    run('measure');
  }

  function update(isSettled?: boolean, silent?: boolean) {
    const moving = target >= 0;
    const here = moving ? pages[target].pos : pos;
    const page = moving ? target : closest(positions(), pos);
    state = {
      index: moving ? pages[target].first : closest(snaps, pos),
      page,
      pageCount: pages.length,
      isBeginning: here <= EPS,
      isEnd: here >= geo.max - EPS,
      overflow: geo.max > EPS,
    };
    for (const [name, on] of [
      ['overflow', state.overflow],
      ['start', state.isBeginning],
      ['end', state.isEnd],
    ] as const) {
      root.toggleAttribute('data-sc-' + name, on);
    }
    // A row that cannot scroll is no tab stop.
    if (tabIndex == '0') track.tabIndex = state.overflow ? 0 : -1;
    // aria-disabled rather than disabled: a focused button that becomes disabled drops focus.
    prevButton?.setAttribute('aria-disabled', String(state.isBeginning && !rewind));
    nextButton?.setAttribute('aria-disabled', String(state.isEnd && !rewind));
    // An empty aria-current counts as false, so the value must be 'true'.
    if (dots) {
      [...dots.children].forEach((dot, i) =>
        i == page ? dot.setAttribute('aria-current', 'true') : dot.removeAttribute('aria-current'),
      );
    }
    if (!isSettled) return;
    if (settled && ['index', 'page', 'pageCount'].every((key) => settled![key as 'page'] == state[key as 'page']))
      return;
    const first = !settled;
    settled = state;
    if (first) return;
    root.dispatchEvent(new CustomEvent('sc:change', { detail: { ...state } }));
    options.onChange?.({ ...state });
    if (status && !silent && !quiet) {
      const [from, to] = visibleRange(pos, geo);
      if (from >= 0) status.textContent = labels.status(from + 1, to + 1, slides.length, slides);
    }
    quiet = false;
  }

  // --- Moving -------------------------------------------------------------------------------

  function armSettle() {
    clearTimeout(settleTimer);
    // With scrollend this is only a safety net; without it, it is how a move ends.
    settleTimer = setTimeout(settle, 'onscrollend' in window ? 400 : 120);
  }

  function settle() {
    clearTimeout(settleTimer);
    if (touching || busy) return;
    scrolling = false;
    target = -1;
    pos = readPos();
    run('settle');
    update(true);
  }

  function cancelFade() {
    clearTimeout(fadeTimer);
    track.removeAttribute('data-sc-fading');
  }

  function scrollToPos(position: number, how?: 'instant' | 'fade') {
    cancelFade();
    if (Math.abs(readPos() - position) < 1) return settle(); // no scroll, so no scrollend either
    if (how == 'fade' && !motion.matches) {
      track.setAttribute('data-sc-fading', '');
      fadeTimer = setTimeout(() => {
        moveTo(position, 'instant');
        track.removeAttribute('data-sc-fading');
      }, 160);
      return;
    }
    moveTo(position, how == 'instant' || motion.matches ? 'instant' : 'smooth');
    armSettle();
  }

  function toPage(page: number, how?: 'instant' | 'fade') {
    if (!pages[page]) return;
    target = page;
    update();
    scrollToPos(pages[page].pos, how);
  }

  function step(direction: 1 | -1, wrap: boolean, silent?: boolean) {
    if (pages.length < 2) return;
    if (silent) quiet = true;
    const from = target >= 0 ? pages[target].pos : readPos();
    let next = -1;
    pages.forEach((page, i) => {
      if (direction > 0 ? next < 0 && page.pos > from + EPS : page.pos < from - EPS) next = i;
    });
    if (next >= 0) toPage(next);
    else if (wrap) toPage(direction > 0 ? 0 : pages.length - 1, rewind == 'fade' ? 'fade' : undefined);
  }

  /** The user acted through a control: stop autoplay and let the move be announced. */
  function takeControl() {
    quiet = false;
    run('control');
  }

  function grab() {
    takeControl();
    cancelFade();
    target = -1;
  }

  const click = (button: HTMLElement | null, direction: 1 | -1) =>
    listen(button, 'click', () => {
      if (button!.getAttribute('aria-disabled') == 'true') return;
      takeControl();
      step(direction, !!rewind);
    });
  click(prevButton, -1);
  click(nextButton, 1);
  listen(dots, 'click', (event: MouseEvent) => {
    const dot = (event.target as Element).closest('.sc-dot');
    if (!dot) return;
    takeControl();
    toPage([...dots!.children].indexOf(dot));
  });
  listen(track, 'keydown', (event: KeyboardEvent) => {
    if (event.target != track || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    const key = event.key;
    const forward = rtl ? 'ArrowLeft' : 'ArrowRight';
    if (![forward, rtl ? 'ArrowRight' : 'ArrowLeft', 'Home', 'End'].includes(key)) return;
    event.preventDefault();
    takeControl();
    if (key == 'Home') toPage(0);
    else if (key == 'End') toPage(pages.length - 1);
    else step(key == forward ? 1 : -1, false);
  });

  listen(
    track,
    'scroll',
    () => {
      scrolling = true;
      frame ||= requestAnimationFrame(() => {
        frame = 0;
        pos = readPos();
        update();
      });
      armSettle();
    },
    { passive: true },
  );
  listen(track, 'scrollend', settle);
  listen(
    track,
    'touchstart',
    () => {
      touching = true;
      grab();
    },
    { passive: true },
  );
  for (const type of ['touchend', 'touchcancel']) {
    listen(
      track,
      type,
      () => {
        touching = false;
        armSettle();
      },
      { passive: true },
    );
  }
  listen(
    track,
    'wheel',
    (event: WheelEvent) => {
      if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) grab();
    },
    { passive: true },
  );

  // --- Observers and lifecycle --------------------------------------------------------------

  const resizes = new ResizeObserver(() => {
    measureFrame ||= requestAnimationFrame(() => {
      measureFrame = 0;
      measure();
      update(!scrolling, true);
    });
  });
  const observeSlides = () => {
    resizes.disconnect();
    for (const element of [track, ...slides]) resizes.observe(element);
  };
  // Runs before the next paint. The slide the reader is looking at stays where it was on
  // screen, also when slides were added or removed before it.
  const mutations = new MutationObserver(() => {
    const keep = !scrolling && target < 0 && !busy ? slides[state.index] : undefined;
    const seen = keep ? geo.starts[state.index] - pos : 0;
    measure();
    if (keep?.parentNode == track) {
      const wanted = clamp(geo.starts[slides.indexOf(keep)] - seen, 0, geo.max);
      if (Math.abs(readPos() - wanted) > 1) {
        moveTo(wanted, 'instant');
        pos = readPos();
      }
    }
    observeSlides();
    update(!scrolling, true);
  });

  const context: PluginContext = {
    root,
    track,
    listen,
    layout: () => ({ pages, max: geo.max, rtl, snap, state }),
    toPage,
    scrollTo: scrollToPos,
    step,
    grab,
    hold: (on) => (busy = on),
    on: (event, handler) => hooks[event].push(handler),
  };

  const api = {
    root,
    track,
    get slides() {
      return slides;
    },
    get state() {
      return { ...state };
    },
    next() {
      takeControl();
      step(1, !!rewind);
    },
    prev() {
      takeControl();
      step(-1, !!rewind);
    },
    slideTo(index, { instant } = {}) {
      takeControl();
      toPage(pageOf(pages, clamp(index, 0, slides.length - 1)), instant ? 'instant' : undefined);
    },
    goToPage(page, { instant } = {}) {
      takeControl();
      toPage(clamp(page, 0, pages.length - 1), instant ? 'instant' : undefined);
    },
    update() {
      measure();
      update(!scrolling, true);
    },
    destroy() {
      listeners.abort();
      resizes.disconnect();
      mutations.disconnect();
      cancelAnimationFrame(frame);
      cancelAnimationFrame(measureFrame);
      clearTimeout(settleTimer);
      cancelFade();
      cleanups.forEach((cleanup) => cleanup?.());
      for (const name of ['ready', 'overflow', 'start', 'end']) root.removeAttribute(`data-sc-${name}`);
      for (const slide of track.children) slide.removeAttribute('data-sc-snap-off');
      if (tabIndex != null) track.setAttribute('tabindex', tabIndex);
      prevButton?.removeAttribute('aria-disabled');
      nextButton?.removeAttribute('aria-disabled');
      dots?.replaceChildren();
      instances.delete(root);
    },
  } as Carousel;
  for (const key of ['index', 'page', 'pageCount', 'isBeginning', 'isEnd'] as const) {
    Object.defineProperty(api, key, { get: () => state[key] });
  }

  measure();
  update(true, true);
  observeSlides();
  mutations.observe(track, { childList: true });
  const cleanups = (options.plugins || []).map((plugin) => {
    const { destroy, ...extra } = plugin(context) || {};
    Object.assign(api, extra);
    return destroy;
  });
  instances.set(root, api);
  root.setAttribute('data-sc-ready', '');
  return api;
}
