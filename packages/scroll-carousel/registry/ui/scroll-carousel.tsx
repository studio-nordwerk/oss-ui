"use client"

/*
 * Scroll Carousel for shadcn/ui: the structure of shadcn's Carousel, on native scrolling.
 * @nordwerk/scroll-carousel does the work underneath (CSS scroll snap, paging, keyboard,
 * announcements); this file renders the markup and the controls with your theme.
 *
 * Size slides with Tailwind: `basis-1/3` on items works as with Embla, or set the carousel's
 * custom properties on the content, e.g. `[--sc-per-view:1.3] @3xl:[--sc-per-view:4]`.
 * Docs: https://www.nordwerk.studio/oss/scroll-carousel
 */

import * as React from "react"
import {
  attach,
  type Carousel as ScrollCarouselApi,
  type CarouselOptions,
  type CarouselState,
  type Plugin,
} from "@nordwerk/scroll-carousel"
import "@nordwerk/scroll-carousel/carousel.layer.css"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

type ScrollCarouselContextProps = {
  api: ScrollCarouselApi | null
  state: CarouselState | null
  scrollPrev: () => void
  scrollNext: () => void
  scrollTo: (page: number) => void
  canScrollPrev: boolean
  canScrollNext: boolean
}

const ScrollCarouselContext = React.createContext<ScrollCarouselContextProps | null>(null)

function useScrollCarousel() {
  const context = React.useContext(ScrollCarouselContext)
  if (!context) {
    throw new Error("useScrollCarousel must be used within a <ScrollCarousel />")
  }
  return context
}

const useIsomorphicLayoutEffect =
  typeof window === "undefined" ? React.useEffect : React.useLayoutEffect

function ScrollCarousel({
  opts,
  plugins,
  setApi,
  onStateChange,
  className,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  /** Read once on mount; give the carousel a new `key` to attach again with other options. */
  opts?: Omit<CarouselOptions, "plugins" | "onChange" | "prev" | "next" | "dots" | "status">
  plugins?: Plugin[]
  setApi?: (api: ScrollCarouselApi) => void
  onStateChange?: (state: CarouselState) => void
}) {
  const ref = React.useRef<HTMLDivElement>(null)
  const [api, setInstance] = React.useState<ScrollCarouselApi | null>(null)
  const [state, setState] = React.useState<CarouselState | null>(null)
  // The latest props for the callbacks, updated after render and before the attach below.
  const latest = React.useRef({ opts, plugins, setApi, onStateChange })
  useIsomorphicLayoutEffect(() => {
    latest.current = { opts, plugins, setApi, onStateChange }
  })

  useIsomorphicLayoutEffect(() => {
    if (!ref.current) return
    const { opts, plugins, setApi } = latest.current
    const instance = attach(ref.current, {
      ...opts,
      plugins,
      onChange: (next) => {
        setState(next)
        latest.current.onStateChange?.(next)
      },
    })
    setInstance(instance)
    setState(instance.state)
    setApi?.(instance)
    return () => instance.destroy()
  }, [])

  // Moves report their destination at once, so controls answer the click, not the settle.
  const move = React.useCallback(
    (go: (api: ScrollCarouselApi) => void) => {
      if (!api) return
      go(api)
      setState(api.state)
    },
    [api],
  )
  const rewind = Boolean(opts?.rewind)
  const canScrollPrev = Boolean(state?.overflow && (rewind || !state.isBeginning))
  const canScrollNext = Boolean(state?.overflow && (rewind || !state.isEnd))

  return (
    <ScrollCarouselContext.Provider
      value={{
        api,
        state,
        scrollPrev: () => move((api) => api.prev()),
        scrollNext: () => move((api) => api.next()),
        scrollTo: (page) => move((api) => api.goToPage(page)),
        canScrollPrev,
        canScrollNext,
      }}
    >
      <div
        ref={ref}
        role="region"
        aria-roledescription="carousel"
        data-slot="scroll-carousel"
        className={cn("sc group/scroll-carousel relative", className)}
        {...props}
      >
        {children}
        <p data-sc-status aria-live="polite" className="sr-only" />
      </div>
    </ScrollCarouselContext.Provider>
  )
}

function ScrollCarouselContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-sc-track
      data-slot="scroll-carousel-content"
      tabIndex={0}
      className={cn(
        "sc-track rounded-md outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
        className,
      )}
      {...props}
    />
  )
}

function ScrollCarouselItem({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      role="group"
      aria-roledescription="slide"
      data-slot="scroll-carousel-item"
      className={cn("min-w-0", className)}
      {...props}
    />
  )
}

const chevron = (path: string) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    className="rtl:-scale-x-100"
  >
    <path d={path} />
  </svg>
)

// aria-disabled rather than disabled: a focused button that becomes disabled drops focus.
function ScrollCarouselPrevious({
  className,
  variant = "outline",
  size = "icon-sm",
  ...props
}: React.ComponentProps<typeof Button>) {
  const { state, scrollPrev, canScrollPrev } = useScrollCarousel()

  return (
    <Button
      data-slot="scroll-carousel-previous"
      variant={variant}
      size={size}
      className={cn(
        "absolute start-2 top-1/2 -translate-y-1/2 rounded-full touch-manipulation aria-disabled:cursor-default aria-disabled:opacity-50",
        !state?.overflow && "hidden",
        className,
      )}
      aria-disabled={!canScrollPrev}
      onClick={canScrollPrev ? scrollPrev : undefined}
      {...props}
    >
      {chevron("m15 18-6-6 6-6")}
      <span className="sr-only">Previous slide</span>
    </Button>
  )
}

function ScrollCarouselNext({
  className,
  variant = "outline",
  size = "icon-sm",
  ...props
}: React.ComponentProps<typeof Button>) {
  const { state, scrollNext, canScrollNext } = useScrollCarousel()

  return (
    <Button
      data-slot="scroll-carousel-next"
      variant={variant}
      size={size}
      className={cn(
        "absolute end-2 top-1/2 -translate-y-1/2 rounded-full touch-manipulation aria-disabled:cursor-default aria-disabled:opacity-50",
        !state?.overflow && "hidden",
        className,
      )}
      aria-disabled={!canScrollNext}
      onClick={canScrollNext ? scrollNext : undefined}
      {...props}
    >
      {chevron("m9 6 6 6-6 6")}
      <span className="sr-only">Next slide</span>
    </Button>
  )
}

/** One dot per page. It keeps its height before the carousel attaches, so nothing shifts. */
function ScrollCarouselDots({ className, ...props }: React.ComponentProps<"div">) {
  const { state, scrollTo } = useScrollCarousel()
  const count = state?.overflow ? state.pageCount : 0

  return (
    <div
      data-slot="scroll-carousel-dots"
      className={cn("flex min-h-6 flex-wrap items-center justify-center", className)}
      {...props}
    >
      {Array.from({ length: count }, (_, i) => (
        <button
          key={i}
          type="button"
          aria-label={`Go to slide ${i + 1} of ${count}`}
          aria-current={i === state?.page ? "true" : undefined}
          onClick={() => scrollTo(i)}
          className="grid size-6 place-items-center rounded-full outline-none after:block after:size-2 after:rounded-full after:bg-foreground/25 after:transition-all focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-[current=true]:after:w-5 aria-[current=true]:after:bg-foreground"
        />
      ))}
    </div>
  )
}

/**
 * Play and pause for the autoplay plugin (WCAG 2.2.2). The plugin binds it and keeps its label;
 * the icon follows the carousel's data-sc-playing attribute.
 */
function ScrollCarouselPlay({
  className,
  variant = "secondary",
  size = "icon-sm",
  ...props
}: React.ComponentProps<typeof Button>) {
  const { state } = useScrollCarousel()

  return (
    <Button
      data-sc-play
      data-slot="scroll-carousel-play"
      variant={variant}
      size={size}
      aria-label="Stop automatic scrolling"
      className={cn("rounded-full", !state?.overflow && "invisible", className)}
      {...props}
    >
      <svg
        viewBox="0 0 24 24"
        fill="currentColor"
        aria-hidden="true"
        className="group-data-[sc-playing]/scroll-carousel:hidden"
      >
        <path d="M8 5v14l11-7z" />
      </svg>
      <svg
        viewBox="0 0 24 24"
        fill="currentColor"
        aria-hidden="true"
        className="hidden group-data-[sc-playing]/scroll-carousel:block"
      >
        <path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" />
      </svg>
    </Button>
  )
}

export {
  type ScrollCarouselApi,
  ScrollCarousel,
  ScrollCarouselContent,
  ScrollCarouselItem,
  ScrollCarouselPrevious,
  ScrollCarouselNext,
  ScrollCarouselDots,
  ScrollCarouselPlay,
  useScrollCarousel,
}
