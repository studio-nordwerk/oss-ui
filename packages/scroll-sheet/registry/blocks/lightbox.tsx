"use client"

import {
  ScrollSheet,
  ScrollSheetClose,
  ScrollSheetContent,
  ScrollSheetHeader,
  ScrollSheetTrigger,
} from "@/components/ui/scroll-sheet"

const shades = ["Dune", "Clay", "Rosewood", "Ember", "Moss", "Slate"]

export function Lightbox() {
  return (
    <ScrollSheet presentation="center">
      <div className="flex flex-wrap gap-2">
        {shades.map((shade, index) => (
          <ScrollSheetTrigger
            key={shade}
            aria-label={`Open image of shade ${shade}`}
            className="size-16 rounded-md"
            style={{ background: `hsl(${index * 50 + 10} 40% 60%)` }}
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
        {/* A native horizontal scroller with scroll snap; @nordwerk/scroll-carousel adds arrows and dots. */}
        <ul
          tabIndex={0}
          aria-label="Shades, scroll sideways"
          className="flex flex-1 snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain px-4 pb-4"
        >
          {shades.map((shade, index) => (
            <li
              key={shade}
              className="grid w-[min(88vw,720px)] shrink-0 snap-center grid-rows-[1fr_auto] gap-2"
            >
              <span
                className="rounded-md"
                style={{ background: `hsl(${index * 50 + 10} 40% 50%)` }}
              />
              <span>{shade}</span>
            </li>
          ))}
        </ul>
      </ScrollSheetContent>
    </ScrollSheet>
  )
}
