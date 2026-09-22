"use client"

import { drag } from "@nordwerk/scroll-carousel/drag"

import { ScrollCarousel, ScrollCarouselContent, ScrollCarouselItem } from "@/components/ui/scroll-carousel"

// Widths stand in for logos of different proportions.
const logos = [
  { name: "Harlow & Pine", width: "w-32" },
  { name: "Ostmark", width: "w-24" },
  { name: "Fjordware", width: "w-36" },
  { name: "Kiln Coffee Co.", width: "w-28" },
  { name: "Tarekit", width: "w-24" },
  { name: "Arken", width: "w-20" },
  { name: "Linnea", width: "w-28" },
  { name: "Holm & Co.", width: "w-32" },
]

const plugins = [drag()]

export function LogoBelt() {
  return (
    <ScrollCarousel aria-label="Our brands" plugins={plugins}>
      <ScrollCarouselContent className="py-2 [--sc-gap:2.5rem] [--sc-slide-size:auto] [--sc-snap:none]">
        {logos.map((logo) => (
          <ScrollCarouselItem key={logo.name}>
            <div className={`${logo.width} grid h-10 place-items-center rounded-md bg-muted text-xs font-medium text-muted-foreground`}>
              {logo.name}
            </div>
          </ScrollCarouselItem>
        ))}
      </ScrollCarouselContent>
    </ScrollCarousel>
  )
}
