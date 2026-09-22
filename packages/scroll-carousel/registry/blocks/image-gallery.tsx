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

const images = ["Front", "Side", "Detail", "In use", "Packaging", "Scale"]

const plugins = [drag()]

export function ImageGallery() {
  return (
    <ScrollCarousel aria-label="Product images" opts={{ initial: 2 }} plugins={plugins}>
      <ScrollCarouselContent className="[--sc-align:center] [--sc-centered:1] [--sc-gap:0.75rem] [--sc-per-view:1.3] @3xl:[--sc-per-view:2.4] @5xl:[--sc-per-view:3.2]">
        {images.map((label, i) => (
          <ScrollCarouselItem key={label} aria-label={`Image ${i + 1} of ${images.length}`}>
            <div className="grid aspect-[4/5] place-items-center rounded-xl bg-muted text-sm text-muted-foreground">
              {label}
            </div>
          </ScrollCarouselItem>
        ))}
      </ScrollCarouselContent>
      <ScrollCarouselPrevious className="top-[45%]" />
      <ScrollCarouselNext className="top-[45%]" />
      <ScrollCarouselDots className="mt-3" />
    </ScrollCarousel>
  )
}
