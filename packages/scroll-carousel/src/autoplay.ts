/*
 * Autoplay, opt-in: attach(root, { plugins: [autoplay({ delay: 5000 })] }).
 *
 * Moves to the next page every `delay` ms and wraps at the end (with the carousel's rewind
 * style). It pauses while the pointer is over the track, while the carousel is off-screen and
 * while the tab is hidden. Keyboard focus entering the carousel, or any control, swipe or drag,
 * stops it for good; only the play button starts it again (WCAG 2.2.2). With reduced motion it
 * starts stopped. Autoplay moves are never announced in the live region.
 *
 * Markup: a button with [data-sc-play] inside the root. While running, the root has
 * [data-sc-playing], and [data-sc-paused] while held; --sc-autoplay-delay drives the progress
 * shown on the current dot.
 */
import type { Plugin } from './index.ts';

export interface AutoplayOptions {
  /** Milliseconds per page. Default 5000. */
  delay?: number;
  /** Start running on attach. Default true, except with reduced motion. */
  start?: boolean;
  /** Default: [data-sc-play] inside the root. */
  button?: HTMLElement | null;
  labels?: { play?: string; pause?: string };
}

export const autoplay =
  ({ delay = 5000, start = true, button, labels = {} }: AutoplayOptions = {}): Plugin =>
  ({ root, track, listen, layout, step, on }) => {
    const play = button || root.querySelector<HTMLElement>('[data-sc-play]');
    const holds = new Set<string>();
    let playing = start && !matchMedia('(prefers-reduced-motion: reduce)').matches;
    let timer = 0;
    let left = delay;
    let since = 0;

    function sync() {
      const running = playing && !holds.size && layout().pages.length > 1;
      root.toggleAttribute('data-sc-playing', playing);
      root.toggleAttribute('data-sc-paused', playing && !running);
      play?.setAttribute(
        'aria-label',
        playing ? labels.pause || 'Stop automatic scrolling' : labels.play || 'Start automatic scrolling',
      );
      if (running && !timer) {
        since = performance.now();
        timer = setTimeout(() => {
          timer = 0;
          left = delay;
          step(1, true, true);
          sync();
        }, left);
      } else if (!running && timer) {
        clearTimeout(timer);
        timer = 0;
        left = Math.max(0, left - (performance.now() - since));
      }
    }

    function set(on: boolean) {
      playing = on;
      left = delay;
      clearTimeout(timer);
      timer = 0;
      sync();
    }

    const hold = (reason: string, on: boolean) => {
      holds[on ? 'add' : 'delete'](reason);
      sync();
    };

    // Conditions that already hold when attaching, before any event could report them.
    if (track.matches(':hover')) holds.add('hover');
    if (document.hidden) holds.add('hidden');
    if (root.contains(document.activeElement) && !play?.contains(document.activeElement)) playing = false;
    root.style.setProperty('--sc-autoplay-delay', `${delay}ms`);
    on('control', () => playing && set(false));
    on('measure', sync);
    listen(play, 'click', () => set(!playing));
    listen(track, 'pointerenter', (event: PointerEvent) => event.pointerType == 'mouse' && hold('hover', true));
    listen(track, 'pointerleave', (event: PointerEvent) => event.pointerType == 'mouse' && hold('hover', false));
    // Focusing the play button itself is exempt, or pressing play could never start it.
    listen(root, 'focusin', (event: FocusEvent) => !play?.contains(event.target as Node) && playing && set(false));
    listen(document, 'visibilitychange', () => hold('hidden', document.hidden));
    const visibility = new IntersectionObserver(([entry]) => hold('offscreen', !entry.isIntersecting));
    visibility.observe(root);
    sync();

    return {
      play: () => set(true),
      pause: () => set(false),
      destroy() {
        clearTimeout(timer);
        visibility.disconnect();
        root.removeAttribute('data-sc-playing');
        root.removeAttribute('data-sc-paused');
        root.style.removeProperty('--sc-autoplay-delay');
      },
    };
  };
