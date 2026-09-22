/*
 * Mouse drag on desktop, opt-in: attach(root, { plugins: [drag()] }).
 * Touch and pen already scroll natively; this only adds dragging with a mouse. Snapping is
 * suspended while dragging, the move ends on a page (or where momentum ends without snap), the
 * click after a real drag is swallowed, and native image and link dragging is prevented.
 */
import { clamp, closest } from './math.ts';
import type { Plugin } from './index.ts';

export interface DragOptions {
  /** Pixels the pointer must travel before a press becomes a drag. Default 6. */
  threshold?: number;
}

export const drag =
  ({ threshold = 6 }: DragOptions = {}): Plugin =>
  ({ root, track, listen, layout, toPage, scrollTo, grab, hold, on }) => {
    let suppressUntil = 0;
    let press: { id: number; x: number; left: number; from: number; moved: boolean; trail: [number, number][] } | null = null;
    const readPos = () => Math.abs(track.scrollLeft);

    root.setAttribute('data-sc-drag', '');
    listen(track, 'dragstart', (event: DragEvent) => event.preventDefault());
    // A drag that moved must not end in a click on whatever is under the pointer.
    listen(
      track,
      'click',
      (event: MouseEvent) => {
        if (event.timeStamp > suppressUntil) return;
        event.preventDefault();
        event.stopPropagation();
      },
      { capture: true },
    );
    on('settle', () => track.removeAttribute('data-sc-dragging'));

    listen(track, 'pointerdown', (event: PointerEvent) => {
      if (event.pointerType != 'mouse' || event.button || !layout().state.overflow) return;
      if ((event.target as Element).closest('input, textarea, select, label, [contenteditable], [data-sc-no-drag]')) return;
      press = { id: event.pointerId, x: event.clientX, left: track.scrollLeft, from: readPos(), moved: false, trail: [[event.timeStamp, event.clientX]] };
    });

    listen(document, 'pointermove', (event: PointerEvent) => {
      if (!press || event.pointerId != press.id) return;
      // The button came up somewhere we did not hear it, e.g. over an iframe.
      if (!(event.buttons & 1)) return release(event);
      const dx = event.clientX - press.x;
      if (!press.moved) {
        if (Math.abs(dx) < threshold) return;
        press.moved = true;
        grab();
        hold(true);
        // Capture only now: capturing on pointerdown would retarget the click of a plain press.
        track.setPointerCapture(press.id);
        track.setAttribute('data-sc-dragging', '');
        getSelection()?.removeAllRanges();
      }
      track.scrollLeft = press.left - dx;
      press.trail.push([event.timeStamp, event.clientX]);
      while (press.trail.length > 2 && event.timeStamp - press.trail[0][0] > 100) press.trail.shift();
    });

    const release = (event: PointerEvent) => {
      const done = press;
      if (!done || event.pointerId != done.id) return;
      press = null;
      if (!done.moved) return;
      hold(false);
      suppressUntil = event.timeStamp + 100;
      const { pages, max, rtl, snap } = layout();
      const [t0, x0] = done.trail[0];
      const velocity = event.timeStamp > t0 ? (event.clientX - x0) / (event.timeStamp - t0) : 0;
      const here = readPos();
      const forward = rtl ? velocity : -velocity; // px per ms towards the end
      // Free scrolling keeps the momentum of the throw.
      if (snap == 'none') return scrollTo(clamp(here + forward * 200, 0, max));
      // Snapping rows move by whole pages: to the page the drag reached, or one page on for a
      // short drag or a flick, never several pages at once however fast the throw.
      const positions = pages.map((page) => page.pos);
      const start = closest(positions, done.from);
      let page = closest(positions, here);
      const moved = here - done.from;
      if (page == start && (Math.abs(moved) > 40 || Math.abs(forward) > 0.3)) {
        page = clamp(start + Math.sign(Math.abs(moved) > 40 ? moved : forward), 0, pages.length - 1);
      }
      toPage(page);
    };
    listen(document, 'pointerup', release);
    listen(document, 'pointercancel', release);

    return {
      destroy() {
        root.removeAttribute('data-sc-drag');
        track.removeAttribute('data-sc-dragging');
      },
    };
  };
