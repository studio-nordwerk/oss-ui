"use client"

import { autoplay } from "@nordwerk/scroll-carousel/autoplay"
import { drag } from "@nordwerk/scroll-carousel/drag"

import { Button } from "@/components/ui/button"
import {
  ScrollCarousel,
  ScrollCarouselContent,
  ScrollCarouselDots,
  ScrollCarouselItem,
  ScrollCarouselNext,
  ScrollCarouselPlay,
  ScrollCarouselPrevious,
} from "@/components/ui/scroll-carousel"
import { cn } from "@/lib/utils"

const slides = [
  {
    title: "Autumn roasts are in",
    text: "Four single origins, roasted this week and shipped within two days.",
    cta: "Shop the roasts",
    tone: "bg-primary text-primary-foreground",
  },
  {
    title: "Free shipping from €40",
    text: "On every order to Germany, Austria and the Netherlands.",
    cta: "See delivery options",
    tone: "bg-muted text-foreground",
  },
  {
    title: "Hand grinders, 20% off",
    text: "Every burr grinder in the range, until Sunday night.",
    cta: "Shop grinders",
    tone: "bg-secondary text-secondary-foreground",
  },
  {
    title: "Pour-over class on Saturday",
    text: "Six places left, beans included.",
    cta: "Book a place",
    tone: "bg-accent text-accent-foreground",
  },
]

// Autoplay pauses on hover and off-screen, stops for good on focus or any control, and starts
// stopped with reduced motion. After the last slide the first one fades in again (rewind).
const plugins = [autoplay({ delay: 5000 }), drag()]

export function HeroAutoplay() {
  return (
    <ScrollCarousel
      aria-label="Current offers"
      opts={{ rewind: true }}
      plugins={plugins}
      className="overflow-hidden rounded-xl"
    >
      <ScrollCarouselContent className="[--sc-gap:0px]">
        {slides.map((slide, i) => (
          <ScrollCarouselItem key={slide.title} aria-label={`${i + 1} of ${slides.length}`}>
            <div
              className={cn(
                "flex aspect-[4/5] flex-col justify-end gap-3 p-8 pb-16 sm:aspect-[21/8] sm:justify-center sm:px-16",
                slide.tone,
              )}
            >
              <h2 className="max-w-[16ch] text-3xl font-semibold tracking-tight text-balance sm:text-5xl">
                {slide.title}
              </h2>
              <p className="max-w-[40ch] opacity-80">{slide.text}</p>
              <div>
                <Button variant="outline" className="text-foreground">
                  {slide.cta}
                </Button>
              </div>
            </div>
          </ScrollCarouselItem>
        ))}
      </ScrollCarouselContent>
      <ScrollCarouselPrevious className="max-sm:hidden" />
      <ScrollCarouselNext className="max-sm:hidden" />
      <div className="absolute inset-x-0 bottom-3 flex items-center justify-center gap-1">
        <ScrollCarouselPlay />
        <ScrollCarouselDots className="rounded-full bg-background/80 px-1" />
      </div>
    </ScrollCarousel>
  )
}
