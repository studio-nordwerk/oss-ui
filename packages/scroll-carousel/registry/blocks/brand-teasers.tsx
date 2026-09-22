"use client"

import { drag } from "@nordwerk/scroll-carousel/drag"

import {
  ScrollCarousel,
  ScrollCarouselContent,
  ScrollCarouselDots,
  ScrollCarouselItem,
  ScrollCarouselNext,
  ScrollCarouselPrevious,
} from "@/components/ui/scroll-carousel"

const teasers = [
  { brand: "Harlow & Pine", title: "The autumn kettle collection", text: "Four finishes, one pour: slow, steady and exact." },
  { brand: "Ostmark", title: "Grinders built to be repaired", text: "Every part replaceable, for decades of mornings." },
  { brand: "Fjordware", title: "Glazed by hand in small batches", text: "No two mugs alike, all of them dishwasher safe." },
  { brand: "Kiln Coffee Co.", title: "Single origins, roasted this week", text: "Traceable farms, fair prices, shipped within two days." },
  { brand: "Tarekit", title: "Precision for the morning ritual", text: "Scales and timers that fit in any kitchen." },
  { brand: "Arken", title: "Linen for the kitchen table", text: "Napkins and cloths woven in Portugal." },
]

const plugins = [drag()]

export function BrandTeasers() {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold">Highlights from our brands</h2>
      <ScrollCarousel aria-label="Brand highlights" plugins={plugins}>
        <ScrollCarouselContent className="[--sc-gap:2px] [--sc-group:page] [--sc-per-view:1.2] @2xl:[--sc-per-view:2] @4xl:[--sc-per-view:3]">
          {teasers.map((teaser) => (
            <ScrollCarouselItem key={teaser.title} className="grid grid-rows-[auto_1fr]">
              <div className="col-start-1 row-start-1 aspect-square bg-muted" />
              <div className="col-start-1 row-start-1 z-10 mb-[-1.25rem] ms-4 grid size-16 place-items-center self-end border-2 border-background bg-foreground text-center text-[0.65rem] font-semibold leading-tight text-background">
                {teaser.brand}
              </div>
              <a href="#" className="flex flex-col gap-2 bg-foreground p-4 pt-9 text-background">
                <span className="text-xl font-semibold uppercase leading-tight tracking-tight">{teaser.title}</span>
                <span className="text-sm opacity-80">{teaser.text}</span>
              </a>
            </ScrollCarouselItem>
          ))}
        </ScrollCarouselContent>
        <ScrollCarouselPrevious className="top-[30%]" />
        <ScrollCarouselNext className="top-[30%]" />
        <ScrollCarouselDots className="mt-3" />
      </ScrollCarousel>
    </section>
  )
}
