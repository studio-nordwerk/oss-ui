/*
 * Shared implementation of the React and Preact adapters, written against the few hook and
 * element functions both libraries have. The adapters render the markup and attach the core;
 * they hold no sheet behaviour of their own.
 *
 * State ownership:
 * - Uncontrolled (no `open` prop): the dialog owns its state. Triggers with commandfor open it,
 *   even before hydration; the adapter reports every change through onOpenChange.
 * - Controlled (`open` prop): the prop owns the state. A user close (button, Escape, dimmed area,
 *   swipe, back) is not carried out but reported with onOpenChange(false, { reason }); the sheet
 *   closes when the prop turns false.
 */
import { attach, type CloseReason, type Plugin, type Sheet as SheetApi, type SheetState } from './index.ts';

export interface OpenChangeDetails {
  reason: CloseReason | 'open';
}

export interface SheetProps {
  /** Id of the dialog; commandfor on triggers refers to it. Default: generated. */
  id?: string;
  /** Presentation per breakpoint, e.g. 'bottom md:end'. Default: bottom sheet. */
  presentation?: string;
  /** Accessible name when the sheet has no <SheetTitle>. */
  label?: string;
  /** Snap points of a bottom sheet below its full height, as CSS lengths ('45dvh', '320px'). */
  snapPoints?: string[];
  /** Index into snapPoints to open at; default: full height. */
  initialSnap?: number;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean, details: OpenChangeDetails) => void;
  onSnap?: (state: SheetState) => void;
  /** Close other open sheets when this one opens. */
  replace?: boolean;
  plugins?: Plugin[];
  className?: string;
  panelClassName?: string;
  style?: Record<string, string | number>;
  /** Receives the sheet API after attaching, and null after it is destroyed. */
  sheetRef?: (sheet: SheetApi | null) => void;
  children?: unknown;
}

export interface PartProps {
  className?: string;
  children?: unknown;
  [attribute: string]: unknown;
}

export interface Framework {
  createElement: (...args: any[]) => any;
  createContext: (value: any) => any;
  useContext: (context: any) => any;
  useState: <T>(initial: T) => [T, (value: T) => void];
  useRef: <T>(initial: T) => { current: T };
  useEffect: (effect: () => void | (() => void), deps?: unknown[]) => void;
  useId: () => string;
}

const join = (...names: unknown[]) => names.filter(Boolean).join(' ');

export function createAdapter(framework: Framework) {
  const { createElement: h, createContext, useContext, useState, useRef, useEffect, useId } = framework;
  const SheetId = createContext('');

  /**
   * Attaches the core to a dialog you render yourself: put `ref` on the <dialog class="ss">.
   * Takes the state options of <Sheet> (open, defaultOpen, onOpenChange, onSnap, replace, plugins,
   * sheetRef); plugins and replace are read once, when the dialog mounts.
   */
  function useSheet(options: Omit<SheetProps, 'children'> = {}) {
    const ref = useRef<HTMLDialogElement | null>(null);
    const [sheet, setSheet] = useState<SheetApi | null>(null);
    // The latest options for the event handlers, updated after every render.
    const latest = useRef(options);
    useEffect(() => {
      // oxlint-disable-next-line react/immutability -- a ref from the framework's useRef, which the rule cannot see
      latest.current = options;
    });
    const closingFromProp = useRef(false);

    const closeFromProp = (instance: SheetApi) => {
      // oxlint-disable-next-line react/immutability -- a ref from the framework's useRef, which the rule cannot see
      closingFromProp.current = true;
      void instance.requestClose('api').finally(() => (closingFromProp.current = false));
    };

    useEffect(() => {
      const dialog = ref.current!;
      const instance = attach(dialog, { plugins: latest.current.plugins, replace: latest.current.replace });
      const controlled = () => latest.current.open !== undefined;
      let frame = 0;
      // In controlled mode the prop wins: after a change the owner did not follow (a trigger opened
      // it, a form closed it), the sheet goes back to what the prop says.
      const reconcile = () => {
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(() => {
          if (!controlled()) return;
          const want = latest.current.open;
          if (want && !dialog.open) instance.open();
          else if (!want && dialog.open) closeFromProp(instance);
        });
      };
      const onOpen = () => {
        latest.current.onOpenChange?.(true, { reason: 'open' });
        reconcile();
      };
      const onRequest = (event: Event) => {
        if (!controlled() || closingFromProp.current) return;
        event.preventDefault();
        latest.current.onOpenChange?.(false, { reason: (event as CustomEvent).detail.reason });
      };
      const onClose = (event: Event) => {
        if (closingFromProp.current) return;
        latest.current.onOpenChange?.(false, { reason: (event as CustomEvent).detail.reason });
        reconcile();
      };
      const onSnap = () => latest.current.onSnap?.(instance.state);
      dialog.addEventListener('ss:open', onOpen);
      dialog.addEventListener('ss:requestclose', onRequest);
      dialog.addEventListener('ss:close', onClose);
      dialog.addEventListener('ss:snap', onSnap);
      setSheet(instance);
      latest.current.sheetRef?.(instance);
      // Opened before hydration (commandfor needs no script): report it like any other open.
      if (dialog.open) onOpen();
      else if (latest.current.defaultOpen) instance.open();
      return () => {
        cancelAnimationFrame(frame);
        dialog.removeEventListener('ss:open', onOpen);
        dialog.removeEventListener('ss:requestclose', onRequest);
        dialog.removeEventListener('ss:close', onClose);
        dialog.removeEventListener('ss:snap', onSnap);
        instance.destroy();
        latest.current.sheetRef?.(null);
        setSheet(null);
      };
    }, []);

    const { open } = options;
    useEffect(() => {
      if (!sheet || open === undefined) return;
      // open() also calls off a close that is still animating, so a quick false → true holds.
      if (open) sheet.open();
      else if (sheet.dialog.open) closeFromProp(sheet);
    }, [sheet, open]);

    return { ref, sheet };
  }

  function Sheet(props: SheetProps) {
    const generated = useId();
    const id = props.id ?? `ss${generated.replace(/[^\w-]/g, '')}`;
    const { presentation, label, snapPoints = [], initialSnap, className, panelClassName, style } = props;
    const { ref } = useSheet(props);

    return h(
      SheetId.Provider,
      { value: id },
      h(
        'dialog',
        {
          ref,
          id,
          className: join('ss', className),
          'data-ss': presentation,
          'aria-label': label,
          'aria-labelledby': label ? undefined : `${id}-title`,
          style,
          // The open attribute of a modal dialog comes from showModal(), never from markup.
          suppressHydrationWarning: true,
        },
        h(
          'div',
          { className: join('ss-panel', panelClassName) },
          snapPoints.map((at, index) =>
            h('i', {
              key: at,
              className: 'ss-snap',
              style: { '--ss-at': at },
              'data-ss-initial': index === initialSnap ? '' : undefined,
            }),
          ),
          props.children,
        ),
        h('div', { className: 'ss-rest' }),
      ),
    );
  }

  const part =
    (tag: string, name: string, extra?: (id: string) => Record<string, unknown>, fallback?: unknown) =>
    ({ className, children, ...rest }: PartProps) => {
      const id = useContext(SheetId);
      return h(tag, { ...extra?.(id), ...rest, className: join(name, className) }, children ?? fallback);
    };

  /** A button anywhere on the page that opens the sheet with the given id. */
  function SheetTrigger({ sheet, children, ...rest }: PartProps & { sheet: string }) {
    return h('button', { type: 'button', commandfor: sheet, command: 'show-modal', ...rest }, children);
  }

  return {
    Sheet,
    useSheet,
    SheetTrigger,
    SheetClose: part('button', 'ss-close', (id) => ({
      type: 'button',
      commandfor: id,
      command: 'close',
      'aria-label': 'Close',
    })),
    SheetTitle: part('h2', 'ss-title', (id) => ({ id: `${id}-title` })),
    // A button: each press moves the sheet to its next snap point (the core's --ss-cycle command).
    SheetHandle: part('button', 'ss-handle', (id) => ({
      type: 'button',
      commandfor: id,
      command: '--ss-cycle',
      'aria-label': 'Change height',
    })),
    SheetHeader: part('header', 'ss-header'),
    SheetBody: part('div', 'ss-body'),
    SheetFooter: part('footer', 'ss-footer'),
  };
}
