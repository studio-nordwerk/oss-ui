"use client"

import * as React from "react"
import type { ScrollCarouselApi } from "@/components/ui/scroll-carousel"
import {
  ScrollCarousel,
  ScrollCarouselContent,
  ScrollCarouselDots,
  ScrollCarouselItem,
  ScrollCarouselNext,
  ScrollCarouselPrevious,
} from "@/components/ui/scroll-carousel"
import {
  ScrollSheet,
  ScrollSheetClose,
  ScrollSheetContent,
  ScrollSheetHeader,
  ScrollSheetTrigger,
} from "@/components/ui/scroll-sheet"

const shades = ["Dune", "Clay", "Rosewood", "Ember", "Moss", "Slate"]

export function Lightbox() {
  const carousel = React.useRef<ScrollCarouselApi | null>(null)
  const picked = React.useRef(0)

  return (
    <ScrollSheet
      presentation="center"
      onOpenChange={(open) => {
        if (!open || !carousel.current) return
        // Measured while the dialog was closed: measure again now that it shows, then jump to
        // the image whose thumbnail was pressed.
        carousel.current.update()
        carousel.current.slideTo(picked.current, { instant: true })
      }}
    >
      <div className="flex flex-wrap gap-2">
        {shades.map((shade, index) => (
          <ScrollSheetTrigger
            key={shade}
            aria-label={`Open image of shade ${shade}`}
            className="size-16 rounded-md"
            style={{ background: `hsl(${index * 50 + 10} 40% 60%)` }}
            onClick={() => (picked.current = index)}
          />
        ))}
      </div>
      <ScrollSheetContent
        aria-label="Shades"
        className="[--ss-bg:#111] [--ss-dialog-size:100vw] [--ss-radius:0] text-white"
        panelClassName="h-dvh max-h-none"
      >
        <ScrollSheetHeader>
          <p className="flex-1 font-medium">Shades</p>
          <ScrollSheetClose className="bg-white/15 text-white hover:bg-white/25" />
        </ScrollSheetHeader>
        <ScrollCarousel
          aria-label="Shades"
          setApi={(api) => (carousel.current = api)}
          className="flex min-h-0 flex-1 flex-col gap-3 pb-4"
        >
          <ScrollCarouselContent className="flex-1 [--sc-align:center] [--sc-centered:1] [--sc-gap:0.75rem] [--sc-per-view:1.15] @4xl:[--sc-per-view:1.6]">
            {shades.map((shade, index) => (
              <ScrollCarouselItem key={shade} aria-label={`${index + 1} of ${shades.length}`}>
                <figure className="grid h-full grid-rows-[1fr_auto] gap-2">
                  <span
                    className="rounded-md"
                    style={{ background: `hsl(${index * 50 + 10} 40% 50%)` }}
                  />
                  <figcaption>{shade}</figcaption>
                </figure>
              </ScrollCarouselItem>
            ))}
          </ScrollCarouselContent>
          <ScrollCarouselPrevious className="start-4 border-0 bg-white/15 text-white hover:bg-white/25" />
          <ScrollCarouselNext className="end-4 border-0 bg-white/15 text-white hover:bg-white/25" />
          <ScrollCarouselDots className="[--foreground:#fff]" />
        </ScrollCarousel>
      </ScrollSheetContent>
    </ScrollSheet>
  )
}
