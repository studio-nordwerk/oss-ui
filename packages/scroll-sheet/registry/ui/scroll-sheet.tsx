"use client"

/*
 * Scroll Sheet for shadcn/ui: bottom sheets, side drawers and dialogs on a native modal <dialog>.
 * @nordwerk/scroll-sheet does the work underneath (top layer, scroll-snap dragging and snap points,
 * one cancelable close path, focus return); this file renders the markup with your theme.
 *
 * <ScrollSheet presentation="bottom md:end" snapPoints={["50dvh"]} initialSnap={0}>
 *   <ScrollSheetTrigger asChild><Button>Filter</Button></ScrollSheetTrigger>
 *   <ScrollSheetContent>
 *     <ScrollSheetHeader><ScrollSheetTitle>Filter</ScrollSheetTitle><ScrollSheetClose /></ScrollSheetHeader>
 *     <ScrollSheetBody>…</ScrollSheetBody>
 *     <ScrollSheetFooter>…</ScrollSheetFooter>
 *   </ScrollSheetContent>
 * </ScrollSheet>
 *
 * Triggers open the sheet with `commandfor`, so they work before hydration. Pass plugins made
 * outside the component (history, keyboard from @nordwerk/scroll-sheet/history and /keyboard).
 * Docs: https://www.nordwerk.studio/oss/scroll-sheet
 */

import * as React from "react"
import {
  attach,
  type CloseReason,
  type Plugin,
  type Sheet as ScrollSheetApi,
  type SheetState,
} from "@nordwerk/scroll-sheet"
import "@nordwerk/scroll-sheet/sheet.layer.css"

import { cn } from "@/lib/utils"

type ScrollSheetContextProps = {
  id: string
  open?: boolean
  presentation?: string
  snapPoints: string[]
  initialSnap?: number
  api: ScrollSheetApi | null
  state: SheetState | null
  setApi: (api: ScrollSheetApi | null) => void
  setState: (state: SheetState | null) => void
  options: React.RefObject<ScrollSheetOptions>
}

type ScrollSheetOptions = {
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean, details: { reason: CloseReason | "open" }) => void
  plugins?: Plugin[]
  replace?: boolean
}

const ScrollSheetContext = React.createContext<ScrollSheetContextProps | null>(null)

function useScrollSheet() {
  const context = React.useContext(ScrollSheetContext)
  if (!context) {
    throw new Error("useScrollSheet must be used within a <ScrollSheet />")
  }
  const { api, state, id } = context
  return {
    id,
    api,
    state,
    open: () => api?.open(),
    close: () => api?.requestClose("api"),
  }
}

function ScrollSheet({
  id: givenId,
  presentation,
  snapPoints = [],
  initialSnap,
  open,
  defaultOpen,
  onOpenChange,
  plugins,
  replace,
  children,
}: ScrollSheetOptions & {
  /** Id of the dialog; defaults to a generated one. */
  id?: string
  /** Presentation per breakpoint: "bottom" (default), "end", "start", "center", with sm:, md:, lg:. */
  presentation?: string
  /** Snap points of a bottom sheet below its full height, as CSS lengths ("50dvh", "320px"). */
  snapPoints?: string[]
  /** Index into snapPoints to open at; default: full height. */
  initialSnap?: number
  children?: React.ReactNode
}) {
  const generated = React.useId()
  const id = givenId ?? `ss${generated.replace(/[^\w-]/g, "")}`
  const [api, setApi] = React.useState<ScrollSheetApi | null>(null)
  const [state, setState] = React.useState<SheetState | null>(null)
  const options = React.useRef<ScrollSheetOptions>({
    open,
    defaultOpen,
    onOpenChange,
    plugins,
    replace,
  })
  React.useEffect(() => {
    options.current = { open, defaultOpen, onOpenChange, plugins, replace }
  })

  return (
    <ScrollSheetContext.Provider
      value={{
        id,
        open,
        presentation,
        snapPoints,
        initialSnap,
        api,
        state,
        setApi,
        setState,
        options,
      }}
    >
      {children}
    </ScrollSheetContext.Provider>
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

function ScrollSheetTrigger({
  asChild,
  render,
  children,
  ...props
}: React.ComponentProps<"button"> & {
  /** Radix style: the single child element becomes the trigger. */
  asChild?: boolean
  /** Base UI style, which `shadcn add` writes in Base UI projects: this element becomes the trigger. */
  render?: React.ReactElement
}) {
  const { id } = useScrollSheet()
  const command = { commandfor: id, command: "show-modal" } as Record<string, string>
  // The element becomes the trigger and keeps its own children. The element that ends up in the
  // DOM must be a native <button>, as commandfor needs one.
  const compose = (element: React.ReactElement<Record<string, any>>, content: React.ReactNode) =>
    React.cloneElement(element, {
      ...mergeProps(element.props, { ...props, ...command }),
      children: content ?? element.props.children,
    })
  if (render) return compose(render as React.ReactElement<Record<string, any>>, children)
  if (asChild && React.isValidElement(children)) {
    return compose(children as React.ReactElement<Record<string, any>>, undefined)
  }
  return (
    <button type="button" data-slot="scroll-sheet-trigger" {...command} {...props}>
      {children}
    </button>
  )
}

function ScrollSheetContent({
  className,
  panelClassName,
  children,
  ...props
}: React.ComponentProps<"dialog"> & { panelClassName?: string }) {
  const context = React.useContext(ScrollSheetContext)
  if (!context) throw new Error("ScrollSheetContent must be used within a <ScrollSheet />")
  const { id, open, presentation, snapPoints, initialSnap, api, setApi, setState, options } =
    context
  const ref = React.useRef<HTMLDialogElement>(null)
  const closingFromProp = React.useRef(false)

  // Attaches once, when the dialog mounts; the latest options are read from a ref.
  const closeFromProp = (instance: ScrollSheetApi) => {
    closingFromProp.current = true
    void instance.requestClose("api").finally(() => (closingFromProp.current = false))
  }

  React.useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    const instance = attach(dialog, {
      plugins: options.current.plugins,
      replace: options.current.replace,
    })
    const controlled = () => options.current.open !== undefined
    const report = () => setState(instance.state)
    let frame = 0
    // Controlled: after a change the owner did not follow (a trigger opened it, a form closed it),
    // the sheet goes back to what the prop says.
    const reconcile = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        if (!controlled()) return
        const want = options.current.open
        if (want && !dialog.open) instance.open()
        else if (!want && dialog.open) closeFromProp(instance)
      })
    }
    const onOpen = () => {
      report()
      options.current.onOpenChange?.(true, { reason: "open" })
      reconcile()
    }
    const onRequest = (event: Event) => {
      if (!controlled() || closingFromProp.current) return
      event.preventDefault()
      options.current.onOpenChange?.(false, { reason: (event as CustomEvent).detail.reason })
    }
    const onClose = (event: Event) => {
      report()
      if (closingFromProp.current) return
      options.current.onOpenChange?.(false, { reason: (event as CustomEvent).detail.reason })
      reconcile()
    }
    dialog.addEventListener("ss:open", onOpen)
    dialog.addEventListener("ss:requestclose", onRequest)
    dialog.addEventListener("ss:close", onClose)
    dialog.addEventListener("ss:snap", report)
    setApi(instance)
    report()
    // Opened before hydration (triggers use commandfor): report it like any other open.
    if (dialog.open) onOpen()
    else if (options.current.defaultOpen) instance.open()
    return () => {
      cancelAnimationFrame(frame)
      dialog.removeEventListener("ss:open", onOpen)
      dialog.removeEventListener("ss:requestclose", onRequest)
      dialog.removeEventListener("ss:close", onClose)
      dialog.removeEventListener("ss:snap", report)
      instance.destroy()
      setApi(null)
    }
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- attaches once; options come from a ref
  }, [])

  React.useEffect(() => {
    if (!api || open === undefined) return
    // open() also calls off a close that is still animating, so a quick false → true holds.
    if (open) api.open()
    else if (api.dialog.open) closeFromProp(api)
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- closeFromProp only touches a ref
  }, [api, open])

  return (
    <dialog
      ref={ref}
      id={id}
      data-ss={presentation}
      data-slot="scroll-sheet-content"
      aria-labelledby={`${id}-title`}
      suppressHydrationWarning
      className={cn(
        "ss text-foreground [--ss-backdrop:rgb(0_0_0/0.45)] [--ss-bg:var(--background)] [--ss-radius:var(--radius-xl,1rem)]",
        className,
      )}
      {...props}
    >
      <div className={cn("ss-panel", panelClassName)}>
        {snapPoints.map((at, index) => (
          <i
            key={at}
            className="ss-snap"
            style={{ "--ss-at": at } as React.CSSProperties}
            data-ss-initial={index === initialSnap ? "" : undefined}
          />
        ))}
        {children}
      </div>
      <div className="ss-rest" />
    </dialog>
  )
}

/** Each press moves the sheet to its next snap point, from the full height back to the lowest. */
function ScrollSheetHandle({ className, ...props }: React.ComponentProps<"button">) {
  const { id } = useScrollSheet()
  const command = { commandfor: id, command: "--ss-cycle" } as Record<string, string>
  return (
    <button
      type="button"
      aria-label="Change height"
      data-slot="scroll-sheet-handle"
      className={cn("ss-handle", className)}
      {...command}
      {...props}
    />
  )
}

function ScrollSheetHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div data-slot="scroll-sheet-header" className={cn("ss-header gap-3", className)} {...props} />
  )
}

function ScrollSheetTitle({ className, ...props }: React.ComponentProps<"h2">) {
  const { id } = useScrollSheet()
  return (
    <h2
      id={`${id}-title`}
      data-slot="scroll-sheet-title"
      className={cn("font-heading text-lg leading-tight font-semibold", className)}
      {...props}
    />
  )
}

function ScrollSheetDescription({ className, ...props }: React.ComponentProps<"p">) {
  const { id } = useScrollSheet()
  return (
    <p
      id={`${id}-description`}
      data-slot="scroll-sheet-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

function ScrollSheetBody({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="scroll-sheet-body" className={cn("ss-body", className)} {...props} />
}

function ScrollSheetFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="scroll-sheet-footer"
      className={cn("ss-footer flex flex-col gap-2 border-t", className)}
      {...props}
    />
  )
}

function ScrollSheetClose({ className, children, ...props }: React.ComponentProps<"button">) {
  const { id } = useScrollSheet()
  const command = { commandfor: id, command: "close" } as Record<string, string>
  return (
    <button
      type="button"
      aria-label={children ? undefined : "Close"}
      data-slot="scroll-sheet-close"
      className={cn(
        "ms-auto inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-foreground outline-none hover:bg-muted/70 focus-visible:ring-[3px] focus-visible:ring-ring/50",
        children && "size-auto rounded-md px-3",
        className,
      )}
      {...command}
      {...props}
    >
      {children ?? (
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          className="size-4"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
        >
          <path d="M6 6l12 12M18 6 6 18" />
        </svg>
      )}
    </button>
  )
}

export {
  ScrollSheet,
  ScrollSheetTrigger,
  ScrollSheetContent,
  ScrollSheetHandle,
  ScrollSheetHeader,
  ScrollSheetTitle,
  ScrollSheetDescription,
  ScrollSheetBody,
  ScrollSheetFooter,
  ScrollSheetClose,
  useScrollSheet,
  type ScrollSheetApi,
}
