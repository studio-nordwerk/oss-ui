/*
 * Swipe area plugin, opt-in: attach(dialog, { plugins: [swipeArea()] }).
 * A strip at the edge the sheet comes from: a swipe away from that edge opens the sheet, which
 * follows the finger with snapping suspended; on release it goes to the snap point the swipe and
 * its speed point at, or closes again when it ends below half of the lowest one. Without an element
 * of your own the plugin adds the strip and keeps it at the edge of the current presentation
 * (bottom, top, start, end; none for the centred dialog). Works with touch, pen and mouse.
 */
import type { Plugin } from './index.ts';

export interface SwipeAreaOptions {
  /** Your own strip, placed and styled by you. Default: one the plugin adds to <body>. */
  element?: HTMLElement;
  /** Depth of the strip the plugin adds, as a CSS length. Default 1.5rem. */
  size?: string;
  /** Pixels a swipe must travel away from the edge before the sheet opens. Default 8. */
  threshold?: number;
}

type Edge = 'top' | 'right' | 'bottom' | 'left';

export function swipeArea({ element, size = '1.5rem', threshold = 8 }: SwipeAreaOptions = {}): Plugin {
  return (sheet) => {
    const { dialog } = sheet;
    const panel = dialog.querySelector<HTMLElement>(':scope > .ss-panel')!;
    const area = element ?? document.body.appendChild(document.createElement('div'));
    let edge: Edge | null = null;
    let press: {
      id: number;
      from: [number, number];
      scroll: [number, number];
      open: boolean;
      trail: [number, number][];
    } | null = null;
    let timer = 0;
    const cleanups: (() => void)[] = [];
    const listen = (target: EventTarget, type: string, handler: (event: any) => void) => {
      target.addEventListener(type, handler);
      cleanups.push(() => target.removeEventListener(type, handler));
    };

    // The edge follows the presentation, read like the core reads it: bottom sheets and end
    // drawers put the spacer first, top sheets and start drawers after the panel.
    const place = () => {
      const style = getComputedStyle(dialog);
      const x = style.overflowX != 'hidden';
      const first = style.getPropertyValue('--_ready-rest-order').trim() == '-1';
      edge = x
        ? first != (style.direction == 'rtl')
          ? 'right'
          : 'left'
        : style.overflowY != 'hidden'
          ? first
            ? 'bottom'
            : 'top'
          : null;
      area.dataset.ssEdge = edge ?? 'none';
      if (element) return;
      const across = edge == 'top' || edge == 'bottom' ? ['left', 'right'] : ['top', 'bottom'];
      for (const side of ['top', 'right', 'bottom', 'left'])
        area.style.setProperty(side, side == edge || across.includes(side) ? '0' : 'auto');
      area.style.cssText += `;position:fixed;z-index:1;touch-action:none;display:${edge ? 'block' : 'none'}`;
      const flat = across[0] == 'left';
      area.style.setProperty('height', flat ? size : 'auto');
      area.style.setProperty('width', flat ? 'auto' : size);
    };
    const horizontal = () => edge == 'left' || edge == 'right';
    // How much of the panel shows along the swipe axis.
    const shown = () => {
      const p = panel.getBoundingClientRect();
      const d = dialog.getBoundingClientRect();
      return horizontal()
        ? Math.min(p.right, d.right) - Math.max(p.left, d.left)
        : Math.min(p.bottom, d.bottom) - Math.max(p.top, d.top);
    };
    const restore = () => {
      clearTimeout(timer);
      dialog.style.removeProperty('scroll-snap-type');
    };

    if (!element) area.setAttribute('aria-hidden', 'true');
    place();
    listen(window, 'resize', place);

    listen(area, 'pointerdown', (event: PointerEvent) => {
      if (dialog.open || !edge || event.button) return;
      press = { id: event.pointerId, from: [event.clientX, event.clientY], scroll: [0, 0], open: false, trail: [] };
    });

    listen(document, 'pointermove', (event: PointerEvent) => {
      if (!press || event.pointerId != press.id) return;
      const x = horizontal();
      const along = x ? event.clientX - press.from[0] : event.clientY - press.from[1];
      if (!press.open) {
        const across = Math.abs(x ? event.clientY - press.from[1] : event.clientX - press.from[0]);
        const away = edge == 'bottom' || edge == 'right' ? -along : along;
        // Mostly along the edge: a scroll or another gesture, not ours.
        if (across > threshold && across > away) press = null;
        if (!press || away < threshold) return;
        press.open = true;
        dialog.style.scrollSnapType = 'none';
        sheet.open();
        // Reduced motion: the sheet is already where it opens; nothing to follow.
        if (!dialog.hasAttribute('open') || matchMedia('(prefers-reduced-motion: reduce)').matches) {
          press = null;
          return restore();
        }
        // open() starts at the closed position and scrolls towards the snap point: stop there and
        // let the finger move it from the closed position on.
        press.from = [event.clientX, event.clientY];
        press.scroll = [dialog.scrollLeft, dialog.scrollTop];
        dialog.scrollTo({ left: press.scroll[0], top: press.scroll[1], behavior: 'instant' });
        return;
      }
      dialog.scrollTo(
        x
          ? { left: press.scroll[0] - along, behavior: 'instant' }
          : { top: press.scroll[1] - along, behavior: 'instant' },
      );
      press.trail.push([event.timeStamp, shown()]);
      while (press.trail.length > 2 && event.timeStamp - press.trail[0][0] > 100) press.trail.shift();
    });

    const release = (event: PointerEvent) => {
      const done = press;
      if (!done || event.pointerId != done.id) return;
      press = null;
      if (!done.open || !dialog.open) return restore();
      // Snapping comes back once the sheet rests; listening from the next frame on, after the
      // scrollend of the swipe's own last step.
      requestAnimationFrame(() => dialog.addEventListener('scrollend', restore, { once: true }));
      timer = setTimeout(restore, 800) as unknown as number;
      const points = sheet.state.snapPoints;
      const now = shown();
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
      if (!element) area.remove();
      else delete area.dataset.ssEdge;
    };
  };
}
