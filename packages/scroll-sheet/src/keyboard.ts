/*
 * Keyboard plugin: keeps a sheet inside the visible part of the page while the on-screen keyboard
 * is up, and the page where it was.
 *
 * iOS has neither `interactive-widget` nor the VirtualKeyboard API. The keyboard shrinks the visual
 * viewport and, when a field is focused, Safari also moves it (visualViewport.offsetTop) or scrolls
 * the document behind the sheet, although the root does not scroll. While a sheet is open this
 * plugin
 * - places the dialog on the visual viewport (--ss-viewport-top, --ss-viewport-height), so the
 *   sheet sits right above the keyboard with its header in view;
 * - puts the sheet back on its snap point after the size changed (WebKit does not re-snap) and
 *   keeps the focused field in view inside the sheet;
 * - puts the document back where it was when the sheet opened.
 * visualViewport is viewport geometry, not a keyboard signal: pinch zoom changes it as well, so
 * the plugin leaves a zoomed page alone. Android with interactive-widget=resizes-content resizes
 * the layout viewport instead, which the stylesheet's dvh units follow on their own.
 */
import type { Plugin } from './index.ts';

export function keyboard(): Plugin {
  return (sheet) => {
    const { dialog } = sheet;
    const viewport = window.visualViewport;
    if (!viewport) return;
    let saved: [number, number] | null = null;
    let frame = 0;
    let placed = '';
    let snap: number | 'full' = 'full';

    // Scrolls the focused field into the part of its scroller that is actually visible: the
    // scroller clipped by the dialog (the visible viewport) and by a sticky footer.
    const reveal = () => {
      const field = document.activeElement as HTMLElement | null;
      if (!field || field == dialog || !dialog.contains(field)) return;
      const box = field.closest<HTMLElement>('.ss-body');
      if (!box) return;
      const footer = box.parentElement?.querySelector<HTMLElement>(':scope > .ss-footer');
      const area = box.getBoundingClientRect();
      const frameBox = dialog.getBoundingClientRect();
      const bottom = Math.min(area.bottom, frameBox.bottom, footer?.getBoundingClientRect().top ?? Infinity);
      const top = Math.max(area.top, frameBox.top);
      const rect = field.getBoundingClientRect();
      if (rect.bottom > bottom) box.scrollTop += rect.bottom - bottom + 16;
      else if (rect.top < top) box.scrollTop -= top - rect.top + 16;
    };

    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (!dialog.open || viewport.scale > 1.01) return;
        if (saved && (scrollX != saved[0] || scrollY != saved[1])) scrollTo(saved[0], saved[1]);
        const top = Math.round(viewport.offsetTop);
        const height = Math.round(viewport.height);
        const moved = top > 0 || height < innerHeight - 1;
        const next = moved ? `${top} ${height}` : '';
        if (next != placed) {
          placed = next;
          if (moved) {
            dialog.style.setProperty('--ss-viewport-top', `${top}px`);
            dialog.style.setProperty('--ss-viewport-height', `${height}px`);
          } else {
            dialog.style.removeProperty('--ss-viewport-top');
            dialog.style.removeProperty('--ss-viewport-height');
          }
          sheet.snapTo(snap, { instant: true });
        }
        reveal();
      });
    };
    // Full stays full: the keyboard can merge snap points, which shifts the index of the full one.
    const onSnap = (event: Event) => {
      const { snap: index, snapPoints } = (event as CustomEvent).detail;
      snap = index == snapPoints.length - 1 ? 'full' : index;
    };
    const onFocus = () => update();
    const onOpen = (event: Event) => {
      saved = [scrollX, scrollY];
      // The snap point the sheet opens at; later snap events replace it.
      snap = (event as CustomEvent).detail.snap ?? 'full';
      dialog.addEventListener('ss:snap', onSnap);
      dialog.addEventListener('focusin', onFocus);
      viewport.addEventListener('resize', update);
      viewport.addEventListener('scroll', update);
      // The keyboard may already be up when the sheet opens.
      update();
    };
    const onClose = () => {
      placed = '';
      dialog.removeEventListener('ss:snap', onSnap);
      dialog.removeEventListener('focusin', onFocus);
      viewport.removeEventListener('resize', update);
      viewport.removeEventListener('scroll', update);
      cancelAnimationFrame(frame);
      dialog.style.removeProperty('--ss-viewport-top');
      dialog.style.removeProperty('--ss-viewport-height');
      if (saved && (scrollX != saved[0] || scrollY != saved[1])) scrollTo(saved[0], saved[1]);
      saved = null;
    };
    dialog.addEventListener('ss:open', onOpen);
    dialog.addEventListener('ss:close', onClose);
    return () => {
      onClose();
      dialog.removeEventListener('ss:open', onOpen);
      dialog.removeEventListener('ss:close', onClose);
    };
  };
}
