/*
 * Drag plugin, opt-in: attach(dialog, { plugins: [drag()] }).
 * Touch and pen already move a sheet natively (the dialog is a scroller); a mouse only moves it
 * with the wheel. With this plugin a press on the handle or the header drags it with the mouse:
 * the panel follows the pointer with snapping suspended, and on release it goes to the snap point
 * the drag and its speed point at, or closes when it ends below half of the lowest one. The click
 * after a real drag is swallowed, so letting go over the handle or a button does not press it.
 */
import type { Plugin } from './index.ts';

export interface DragOptions {
  /** Where a press can start a drag. Default: the handle and the header. */
  area?: string;
  /** Pixels the pointer must travel before a press becomes a drag. Default 4. */
  threshold?: number;
}

export function drag({ area = '.ss-handle, .ss-header', threshold = 4 }: DragOptions = {}): Plugin {
  return (sheet) => {
    const { dialog } = sheet;
    const panel = dialog.querySelector<HTMLElement>(':scope > .ss-panel')!;
    let press: {
      id: number;
      x: boolean;
      from: [number, number];
      scroll: [number, number];
      moved: boolean;
      trail: [number, number][];
    } | null = null;
    let suppressUntil = 0;
    let timer = 0;
    const cleanups: (() => void)[] = [];
    const listen = (target: EventTarget, type: string, handler: (event: any) => void, capture = false) => {
      target.addEventListener(type, handler, capture);
      cleanups.push(() => target.removeEventListener(type, handler, capture));
    };

    // Same reading of the presentation as the core: drawers move on x, sheets on y, dialogs not.
    const axis = () => {
      const style = getComputedStyle(dialog);
      return style.overflowX != 'hidden' ? 'x' : style.overflowY != 'hidden' ? 'y' : null;
    };
    // How much of the panel shows along the drag axis.
    const shown = (x: boolean) => {
      const p = panel.getBoundingClientRect();
      const d = dialog.getBoundingClientRect();
      return x
        ? Math.min(p.right, d.right) - Math.max(p.left, d.left)
        : Math.min(p.bottom, d.bottom) - Math.max(p.top, d.top);
    };
    const restore = () => {
      clearTimeout(timer);
      dialog.style.removeProperty('scroll-snap-type');
    };

    dialog.setAttribute('data-ss-drag', '');
    listen(panel, 'dragstart', (event: DragEvent) => press && event.preventDefault());
    listen(
      dialog,
      'click',
      (event: MouseEvent) => {
        if (event.timeStamp > suppressUntil) return;
        event.preventDefault();
        event.stopPropagation();
      },
      true,
    );

    listen(panel, 'pointerdown', (event: PointerEvent) => {
      const direction = axis();
      const target = event.target as Element;
      if (event.pointerType != 'mouse' || event.button || !direction) return;
      // This sheet's own handle or header, not those of a sheet nested inside it, and no field.
      if (target.closest('dialog') != dialog || !target.closest(area)) return;
      if (target.closest('input, textarea, select, [contenteditable]')) return;
      press = {
        id: event.pointerId,
        x: direction == 'x',
        from: [event.clientX, event.clientY],
        scroll: [dialog.scrollLeft, dialog.scrollTop],
        moved: false,
        trail: [],
      };
    });

    listen(document, 'pointermove', (event: PointerEvent) => {
      if (!press || event.pointerId != press.id) return;
      // The button came up where we did not hear it, e.g. over an iframe.
      if (!(event.buttons & 1)) return release(event);
      const delta = press.x ? event.clientX - press.from[0] : event.clientY - press.from[1];
      if (!press.moved) {
        if (Math.abs(delta) < threshold) return;
        press.moved = true;
        clearTimeout(timer);
        dialog.style.scrollSnapType = 'none';
        dialog.setAttribute('data-ss-dragging', '');
        // Capture only now: capturing on pointerdown would retarget the click of a plain press.
        panel.setPointerCapture(press.id);
        getSelection()?.removeAllRanges();
      }
      // The content follows the pointer: the scroll offset moves against it, in either direction
      // and writing mode.
      dialog.scrollTo(
        press.x
          ? { left: press.scroll[0] - delta, behavior: 'instant' }
          : { top: press.scroll[1] - delta, behavior: 'instant' },
      );
      press.trail.push([event.timeStamp, shown(press.x)]);
      while (press.trail.length > 2 && event.timeStamp - press.trail[0][0] > 100) press.trail.shift();
    });

    const release = (event: PointerEvent) => {
      const done = press;
      if (!done || event.pointerId != done.id) return;
      press = null;
      if (!done.moved) return;
      dialog.removeAttribute('data-ss-dragging');
      suppressUntil = event.timeStamp + 100;
      if (!dialog.open) return restore();
      // Snapping comes back once the sheet rests where it goes. Listening from the next frame on,
      // after the scrollend of the drag's own last step has been delivered.
      requestAnimationFrame(() => dialog.addEventListener('scrollend', restore, { once: true }));
      timer = setTimeout(restore, 800) as unknown as number;
      const points = sheet.state.snapPoints;
      const now = shown(done.x);
      // Only the last 100 ms count: after a pause the speed is zero, not that of the moves before it.
      const [t0, s0] = done.trail.find(([t]) => event.timeStamp - t <= 100) ?? [event.timeStamp, now];
      // Where the throw would carry it: the speed (px per ms, positive towards open) over 200 ms.
      const aim = now + (event.timeStamp > t0 ? ((now - s0) / (event.timeStamp - t0)) * 200 : 0);
      if (aim < points[0] / 2) {
        void sheet.requestClose('swipe').then((closed) => closed || sheet.snapTo(0));
        return;
      }
      sheet.snapTo(
        points.reduce((best, point, i) => (Math.abs(point - aim) < Math.abs(points[best] - aim) ? i : best), 0),
      );
    };
    listen(document, 'pointerup', release);
    listen(document, 'pointercancel', release);

    return () => {
      cleanups.forEach((cleanup) => cleanup());
      restore();
      dialog.removeAttribute('data-ss-drag');
      dialog.removeAttribute('data-ss-dragging');
    };
  };
}
