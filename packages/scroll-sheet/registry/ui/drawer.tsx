"use client"

/*
 * Drawer for shadcn/ui on @nordwerk/scroll-sheet: a drop-in for components/ui/drawer.tsx. Same
 * exports and the props of both shadcn flavours (Vaul in the Radix styles, Base UI in the Base UI
 * styles), so call sites stay as they are:
 *
 * <Drawer snapPoints={[0.5, 1]}>
 *   <DrawerTrigger asChild><Button>Open</Button></DrawerTrigger>
 *   <DrawerContent>
 *     <DrawerHeader><DrawerTitle>Title</DrawerTitle><DrawerDescription>…</DrawerDescription></DrawerHeader>
 *     …
 *     <DrawerFooter><DrawerClose asChild><Button variant="outline">Cancel</Button></DrawerClose></DrawerFooter>
 *   </DrawerContent>
 * </Drawer>
 *
 * Underneath is a native <dialog>: triggers open it before hydration, dragging is native
 * scrolling, the page behind neither moves nor jumps, and there is no portal and no z-index.
 * shouldScaleBackground scales <body>, or the element marked data-ss-page (Vaul's
 * vaul-drawer-wrapper), which needs a background of its own.
 * Docs: https://www.nordwerk.studio/oss/scroll-sheet
 */

import * as React from "react"
import { attach, type CloseReason, type Sheet } from "@nordwerk/scroll-sheet"
import { keyboard } from "@nordwerk/scroll-sheet/keyboard"
import { swipeArea } from "@nordwerk/scroll-sheet/swipe-area"
import "@nordwerk/scroll-sheet/sheet.layer.css"
import "@nordwerk/scroll-sheet/options.layer.css"
import "@nordwerk/scroll-sheet/depth.layer.css"

import { cn } from "@/lib/utils"

type Direction = "top" | "bottom" | "left" | "right"
type SnapPoint = number | string

type DrawerProps = {
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean, details?: { reason: CloseReason | "open" }) => void
  /** Edge the drawer comes from. Default: bottom. */
  direction?: Direction
  /** Base UI's name for the same: the direction that dismisses it. */
  swipeDirection?: "up" | "down" | "left" | "right"
  /** Resting heights of a bottom drawer: fractions of the viewport (0.5) or CSS lengths ("320px"), smallest first. */
  snapPoints?: SnapPoint[]
  activeSnapPoint?: SnapPoint | null
  setActiveSnapPoint?: (snapPoint: SnapPoint | null) => void
  /** Base UI's names for activeSnapPoint and setActiveSnapPoint. */
  snapPoint?: SnapPoint | null
  defaultSnapPoint?: SnapPoint | null
  onSnapPointChange?: (snapPoint: SnapPoint | null) => void
  /** The dimmed area shows from this snap point on. Default: the last one. */
  fadeFromIndex?: number
  /** A fast swipe stops at the next snap point instead of skipping it. */
  snapToSequentialPoint?: boolean
  snapToSequentialPoints?: boolean
  /** false: dragging, Escape and taps outside do not close it; DrawerClose and open={false} do. */
  dismissible?: boolean
  /** Base UI: taps outside do not close it. */
  disablePointerDismissal?: boolean
  /** false: the page around the drawer stays usable. */
  modal?: boolean | "trap-focus"
  /** The page behind recedes while the drawer is open. */
  shouldScaleBackground?: boolean
  /** false: no dark ground around the receded page. */
  setBackgroundColorOnScale?: boolean
  /** Touch drags the drawer only by its handle. */
  handleOnly?: boolean
  /** Keeps fields above the on-screen keyboard (iOS). Default: true. */
  repositionInputs?: boolean
  /** Base UI: shows the handle on every side, not only at the bottom. */
  showSwipeHandle?: boolean
  onClose?: () => void
  /** After the enter or exit animation. */
  onAnimationEnd?: (open: boolean) => void
  onOpenChangeComplete?: (open: boolean) => void
  /** While it is dragged: how far it has moved towards closed, 0 to 1. */
  onDrag?: (event: Event, percentageDragged: number) => void
  /** When a drag ends: whether it stays open. */
  onRelease?: (event: Event, open: boolean) => void
  children?: React.ReactNode
  /** Accepted for compatibility; the platform does what they configure. */
  closeThreshold?: number
  scrollLockTimeout?: number
  fixed?: boolean
  nested?: boolean
  noBodyStyles?: boolean
  disablePreventScroll?: boolean
  preventScrollRestoration?: boolean
  container?: HTMLElement | null
  autoFocus?: boolean
}

type DrawerContextProps = DrawerProps & {
  id: string
  direction: Direction
  api: Sheet | null
  setApi: (api: Sheet | null) => void
  latest: React.RefObject<DrawerProps>
}

const DrawerContext = React.createContext<DrawerContextProps | null>(null)

function useDrawer() {
  const context = React.useContext(DrawerContext)
  if (!context) throw new Error("Drawer parts must be used within a <Drawer />")
  return context
}

const fromSwipe = { up: "top", down: "bottom", left: "left", right: "right" } as const
// Physical sides; right to left swaps start and end, as drawers there come from the other side.
const presentation = { top: "top", bottom: "bottom", left: "start", right: "end" } as const
// A fraction of the viewport, as Vaul and Base UI take them, or a CSS length as it is.
const length = (point: SnapPoint) => (typeof point == "number" ? `${point * 100}dvh` : point)

function Drawer({ direction, swipeDirection, children, ...props }: DrawerProps) {
  const generated = React.useId()
  const id = `drawer${generated.replace(/[^\w-]/g, "")}`
  const [api, setApi] = React.useState<Sheet | null>(null)
  const latest = React.useRef<DrawerProps>(props)
  React.useEffect(() => {
    latest.current = props
  })
  const side: Direction = direction ?? (swipeDirection ? fromSwipe[swipeDirection] : "bottom")
  return (
    <DrawerContext.Provider value={{ ...props, id, direction: side, api, setApi, latest }}>
      {children}
    </DrawerContext.Provider>
  )
}

// Props of the trigger on top of the element's own: both handlers run, class names and styles
// combine, both refs get the node; anything else from the trigger wins.
function mergeProps(own: Record<string, any>, extra: Record<string, any>) {
  const merged: Record<string, any> = { ...own, ...extra }
  for (const key in extra) {
    const [a, b] = [own[key], extra[key]]
    if (!a || !b) continue
    if (/^on[A-Z]/.test(key) && typeof a == "function") {
      merged[key] = (...args: unknown[]) => {
        a(...args)
        b(...args)
      }
    } else if (key == "style") merged.style = { ...a, ...b }
    else if (key == "ref") {
      merged.ref = (node: unknown) => {
        for (const ref of [a, b]) {
          if (typeof ref == "function") ref(node)
          else ref.current = node
        }
      }
    }
  }
  merged.className = cn(own.className, extra.className)
  return merged
}

type ButtonPartProps = React.ComponentProps<"button"> & {
  /** Radix style: the single child element becomes the button. */
  asChild?: boolean
  /** Base UI style: this element becomes the button. */
  render?: React.ReactElement
}

/** A native <button> with commandfor, so it works before hydration; asChild and render compose. */
function commandButton(slot: string, command: string) {
  return function CommandButton({ asChild, render, children, ...props }: ButtonPartProps) {
    const { id } = useDrawer()
    const attributes = { commandfor: id, command, "data-slot": slot } as Record<string, string>
    const compose = (element: React.ReactElement<Record<string, any>>, content: React.ReactNode) =>
      React.cloneElement(element, {
        ...mergeProps(element.props, { ...props, ...attributes }),
        children: content ?? element.props.children,
      })
    if (render) return compose(render as React.ReactElement<Record<string, any>>, children)
    if (asChild && React.isValidElement(children)) {
      return compose(children as React.ReactElement<Record<string, any>>, undefined)
    }
    return (
      <button type="button" {...attributes} {...props}>
        {children}
      </button>
    )
  }
}

const DrawerTrigger = commandButton("drawer-trigger", "show-modal")
const DrawerClose = commandButton("drawer-close", "close")

/** No portal needed: the dialog shows in the top layer. Kept so imports keep working. */
function DrawerPortal({
  children,
}: {
  children?: React.ReactNode
  container?: HTMLElement | null
}) {
  return <>{children}</>
}

/** The dimmed area is the dialog's ::backdrop, styled by DrawerContent. Kept so imports keep working. */
function DrawerOverlay(_props: React.ComponentProps<"div">) {
  return null
}

/**
 * An invisible strip at the drawer's edge: a swipe away from the edge opens the drawer, which
 * follows the finger (Base UI's Drawer.SwipeArea). Place it anywhere inside <Drawer>.
 */
function DrawerSwipeArea({
  className,
  disabled,
  // Base UI's; here the direction comes from <Drawer>.
  swipeDirection: _swipeDirection,
  ...props
}: React.ComponentProps<"div"> & { disabled?: boolean; swipeDirection?: string }) {
  const { api, direction } = useDrawer()
  const ref = React.useRef<HTMLDivElement>(null)
  React.useEffect(() => {
    if (!api || !ref.current || disabled) return
    return swipeArea({ element: ref.current })(api) || undefined
  }, [api, disabled])
  return (
    <div
      ref={ref}
      aria-hidden="true"
      data-slot="drawer-swipe-area"
      className={cn(
        "fixed z-10 touch-none",
        direction == "bottom" && "inset-x-0 bottom-0 h-6",
        direction == "top" && "inset-x-0 top-0 h-6",
        direction == "left" && "inset-y-0 left-0 w-6",
        direction == "right" && "inset-y-0 right-0 w-6",
        disabled && "pointer-events-none",
        className,
      )}
      {...props}
    />
  )
}

/** The bar at the top of a bottom drawer; with snap points a button that steps through them. */
function DrawerSwipeHandle({ className, ...props }: React.ComponentProps<"div">) {
  const { id, snapPoints } = useDrawer()
  const classes = cn(
    "ss-handle mx-auto mt-4 h-1 w-[100px] shrink-0 rounded-full bg-muted opacity-100",
    className,
  )
  if (snapPoints?.length) {
    const command = { commandfor: id, command: "--ss-cycle" } as Record<string, string>
    return (
      <button
        type="button"
        aria-label="Change height"
        data-slot="drawer-swipe-handle"
        className={classes}
        {...command}
      />
    )
  }
  return <div aria-hidden="true" data-slot="drawer-swipe-handle" className={classes} {...props} />
}

// Radix Dialog props on Vaul's content that have no DOM attribute; the ones with a meaning here
// are handled, the rest are dropped instead of reaching the <dialog>.
type RadixContentProps = {
  onEscapeKeyDown?: (event: Event) => void
  onPointerDownOutside?: (event: Event) => void
  onInteractOutside?: (event: Event) => void
  onOpenAutoFocus?: (event: Event) => void
  onCloseAutoFocus?: (event: Event) => void
  forceMount?: boolean
}

function DrawerContent({
  className,
  children,
  style,
  onEscapeKeyDown,
  onPointerDownOutside,
  onInteractOutside,
  onOpenAutoFocus: _openAutoFocus,
  onCloseAutoFocus: _closeAutoFocus,
  forceMount: _forceMount,
  ...props
}: React.ComponentProps<"dialog"> & RadixContentProps) {
  const context = useDrawer()
  const { id, direction, api, setApi, latest, open } = context
  const snapPoints = context.snapPoints ?? []
  const ref = React.useRef<HTMLDialogElement>(null)
  const closingFromProp = React.useRef(false)
  const [snap, setSnap] = React.useState(-1)

  // The last snap point is the drawer's height; the others are markers in the panel.
  const lengths = snapPoints.map(length)
  const fadeFrom = context.fadeFromIndex ?? snapPoints.length - 1
  const vertical = direction == "top" || direction == "bottom"
  const handle = direction == "bottom" || context.showSwipeHandle
  const dismissible = context.dismissible !== false
  const modal = context.modal !== false

  const closeFromProp = (sheet: Sheet) => {
    closingFromProp.current = true
    void sheet.requestClose("api").finally(() => (closingFromProp.current = false))
  }

  // Attaches once, when the dialog mounts; the latest props are read from a ref.
  React.useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    const options = () => latest.current
    const sheet = attach(dialog, {
      plugins: options().repositionInputs === false ? [] : [keyboard()],
    })
    const controlled = () => options().open !== undefined
    const points = () => options().snapPoints ?? []
    let frame = 0
    let settled = false
    let pressed = false
    // Controlled: after a change the owner did not follow (a trigger opened it, a form closed it),
    // the drawer goes back to what the prop says.
    const reconcile = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        if (!controlled()) return
        const want = options().open
        if (want && !dialog.open) sheet.open()
        else if (!want && dialog.open) closeFromProp(sheet)
      })
    }
    const onOpen = () => {
      settled = false
      options().onOpenChange?.(true, { reason: "open" })
      reconcile()
    }
    const onRequest = (event: Event) => {
      const { reason } = (event as CustomEvent<{ reason: CloseReason }>).detail
      const radix =
        reason == "escape"
          ? onEscapeKeyDown
          : reason == "backdrop"
            ? (onPointerDownOutside ?? onInteractOutside)
            : null
      radix?.(event)
      if (event.defaultPrevented) return
      if (reason == "backdrop" && options().disablePointerDismissal) return event.preventDefault()
      if (!controlled() || closingFromProp.current) return
      event.preventDefault()
      options().onOpenChange?.(false, { reason })
    }
    const onClose = (event: Event) => {
      setSnap(-1)
      options().onAnimationEnd?.(false)
      options().onOpenChangeComplete?.(false)
      options().onClose?.()
      if (closingFromProp.current) return
      options().onOpenChange?.(false, {
        reason: (event as CustomEvent<{ reason: CloseReason }>).detail.reason,
      })
      reconcile()
    }
    const onSnap = (event: Event) => {
      const index = (event as CustomEvent<{ snap: number }>).detail.snap
      setSnap(index)
      if (index < 0) return
      if (!settled) {
        settled = true
        options().onAnimationEnd?.(true)
        options().onOpenChangeComplete?.(true)
      }
      const point = points()[index] ?? null
      options().setActiveSnapPoint?.(point)
      options().onSnapPointChange?.(point)
    }
    // Drag progress: how much of the panel has left the screen along its axis.
    const onScroll = (event: Event) => {
      const onDrag = options().onDrag
      if (!onDrag || !pressed) return
      const box = dialog.querySelector(".ss-panel")!.getBoundingClientRect()
      const y = dialog.scrollHeight > dialog.clientHeight
      const size = y ? box.height : box.width
      const shown = y
        ? Math.min(box.bottom, innerHeight) - Math.max(box.top, 0)
        : Math.min(box.right, innerWidth) - Math.max(box.left, 0)
      onDrag(event, Math.min(1, Math.max(0, 1 - shown / size)))
    }
    const onPress = () => (pressed = true)
    const onEnd = (event: Event) => {
      if (!pressed) return
      pressed = false
      options().onRelease?.(event, dialog.open && !dialog.hasAttribute("data-ss-closing"))
    }
    const listeners: [EventTarget, string, (event: any) => void][] = [
      [dialog, "ss:open", onOpen],
      [dialog, "ss:requestclose", onRequest],
      [dialog, "ss:close", onClose],
      [dialog, "ss:snap", onSnap],
      [dialog, "scroll", onScroll],
      [dialog, "pointerdown", onPress],
      [dialog, "scrollend", onEnd],
    ]
    for (const [target, type, listener] of listeners) target.addEventListener(type, listener)
    setApi(sheet)
    // Opened before hydration (triggers use commandfor): report it like any other open.
    if (dialog.open) onOpen()
    else if (options().defaultOpen) sheet.open()
    return () => {
      cancelAnimationFrame(frame)
      for (const [target, type, listener] of listeners) target.removeEventListener(type, listener)
      sheet.destroy()
      setApi(null)
    }
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- attaches once; props come from a ref
  }, [])

  React.useEffect(() => {
    if (!api || open === undefined) return
    // open() also calls off a close that is still animating, so a quick false → true holds.
    if (open) api.open()
    else if (api.dialog.open) closeFromProp(api)
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- closeFromProp only touches a ref
  }, [api, open])

  // Controlled snap point (Vaul: activeSnapPoint, Base UI: snapPoint).
  const wanted = context.activeSnapPoint !== undefined ? context.activeSnapPoint : context.snapPoint
  React.useEffect(() => {
    if (!api || wanted == null || !api.dialog.open) return
    const index = snapPoints.indexOf(wanted)
    if (index >= 0 && index != api.state.snap) api.snapTo(index)
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- snapPoints are compared by value above
  }, [api, wanted])

  // Described by DrawerDescription only when there is one: a reference to nothing is an error.
  React.useEffect(() => {
    const description = document.getElementById(`${id}-description`)
    if (description) ref.current?.setAttribute("aria-describedby", description.id)
    else ref.current?.removeAttribute("aria-describedby")
  })

  const initial = snapPoints.indexOf(
    wanted ?? context.defaultSnapPoint ?? (snapPoints[0] as SnapPoint),
  )
  const faded = snapPoints.length > 1 && snap >= 0 && snap < fadeFrom

  return (
    <dialog
      ref={ref}
      id={id}
      data-ss={presentation[direction]}
      data-slot="drawer-content"
      data-direction={direction}
      data-ss-depth={context.shouldScaleBackground ? "" : undefined}
      data-ss-modal={modal ? undefined : "false"}
      data-ss-dismissible={dismissible ? undefined : "false"}
      data-ss-sequential={
        context.snapToSequentialPoint || context.snapToSequentialPoints ? "" : undefined
      }
      data-ss-handle-only={context.handleOnly ? "" : undefined}
      data-faded={faded ? "" : undefined}
      aria-labelledby={`${id}-title`}
      suppressHydrationWarning
      style={
        {
          ...(context.setBackgroundColorOnScale === false && { "--ss-depth-bg": "transparent" }),
          ...style,
        } as React.CSSProperties
      }
      className={cn(
        "ss group/drawer text-sm text-popover-foreground",
        "[--ss-bg:var(--popover)] [--ss-radius:var(--radius-xl,0.75rem)] [--ss-backdrop:rgb(0_0_0/0.1)] [--ss-top-gap:6rem] [--ss-sheet-max-size:none] [--ss-drawer-size:75vw] sm:[--ss-drawer-size:min(75vw,24rem)]",
        "supports-backdrop-filter:backdrop:backdrop-blur-xs data-faded:backdrop:opacity-0 data-faded:backdrop:[animation:none]",
        className,
      )}
      {...props}
    >
      <div
        className={cn(
          "ss-panel border-border",
          vertical
            ? direction == "bottom"
              ? "border-t"
              : "border-b"
            : direction == "left"
              ? "border-r"
              : "border-l",
        )}
        style={
          snapPoints.length
            ? { blockSize: lengths[lengths.length - 1], maxBlockSize: "none" }
            : undefined
        }
      >
        {lengths.slice(0, -1).map((at, index) => (
          <i
            key={at}
            className="ss-snap"
            style={{ "--ss-at": at } as React.CSSProperties}
            data-ss-initial={index === initial ? "" : undefined}
          />
        ))}
        {handle && <DrawerSwipeHandle />}
        {children}
      </div>
      <div className="ss-rest" />
    </dialog>
  )
}

function DrawerHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="drawer-header"
      className={cn(
        "ss-header flex-col items-stretch gap-0.5 p-4 group-data-[direction=bottom]/drawer:text-center group-data-[direction=top]/drawer:text-center md:gap-0.5 md:text-left",
        className,
      )}
      {...props}
    />
  )
}

function DrawerFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="drawer-footer"
      className={cn("ss-footer mt-auto flex flex-col gap-2 p-4", className)}
      {...props}
    />
  )
}

function DrawerTitle({ className, ...props }: React.ComponentProps<"h2">) {
  const { id } = useDrawer()
  return (
    <h2
      id={`${id}-title`}
      data-slot="drawer-title"
      className={cn("text-base font-medium text-foreground", className)}
      {...props}
    />
  )
}

function DrawerDescription({ className, ...props }: React.ComponentProps<"p">) {
  const { id } = useDrawer()
  return (
    <p
      id={`${id}-description`}
      data-slot="drawer-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

export {
  Drawer,
  DrawerPortal,
  DrawerOverlay,
  DrawerSwipeHandle,
  DrawerSwipeArea,
  DrawerTrigger,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerFooter,
  DrawerTitle,
  DrawerDescription,
}
