"use client"

import { drag } from "@nordwerk/scroll-carousel/drag"

import { Badge } from "@/components/ui/badge"
import {
  ScrollCarousel,
  ScrollCarouselContent,
  ScrollCarouselDots,
  ScrollCarouselItem,
  ScrollCarouselNext,
  ScrollCarouselPrevious,
} from "@/components/ui/scroll-carousel"

const products = [
  { brand: "Harlow & Pine", name: "Gooseneck kettle, 0.9 l", price: "€64.00", badge: "Bestseller" },
  {
    brand: "Ostmark",
    name: "Hand grinder with conical steel burrs",
    price: "€89.00",
    badge: "−18%",
  },
  { brand: "Fjordware", name: "Stoneware mug, 350 ml", price: "€18.50", badge: "New" },
  { brand: "Kiln Coffee Co.", name: "Espresso roast, whole beans, 1 kg", price: "€27.90" },
  { brand: "Ostmark", name: "Paper filters, size 02, 100 pieces", price: "€5.90" },
  { brand: "Harlow & Pine", name: "Glass carafe, 600 ml", price: "€32.00" },
  { brand: "Tarekit", name: "Brewing scale with timer", price: "€39.00", badge: "−20%" },
  { brand: "Fjordware", name: "Airtight bean canister, 500 g", price: "€24.00" },
  { brand: "Tarekit", name: "Handheld milk frother", price: "€45.00" },
  { brand: "Kiln Coffee Co.", name: "Decaf filter roast, 250 g", price: "€9.40", badge: "New" },
]

// Plugins are made once; each carousel gets its own state when it attaches.
const plugins = [drag()]

export function ProductRow() {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-lg font-semibold">Bestsellers this week</h2>
        <a href="#" className="text-sm font-medium underline-offset-4 hover:underline">
          View all
        </a>
      </div>
      <ScrollCarousel aria-label="Bestsellers" plugins={plugins}>
        <ScrollCarouselContent className="[--sc-gap:1rem] [--sc-group:page] [--sc-per-view:1.4] @md:[--sc-per-view:3] @4xl:[--sc-per-view:4]">
          {products.map((product) => (
            <ScrollCarouselItem key={product.name}>
              <a
                href="#"
                className="flex h-full flex-col gap-1.5 rounded-xl p-2 transition-colors hover:bg-muted"
              >
                <div className="relative mb-1.5 aspect-square rounded-lg bg-muted">
                  {product.badge && (
                    <Badge className="absolute start-2 top-2">{product.badge}</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{product.brand}</p>
                <p className="line-clamp-2 font-medium">{product.name}</p>
                <p className="mt-auto font-semibold tabular-nums">{product.price}</p>
              </a>
            </ScrollCarouselItem>
          ))}
        </ScrollCarouselContent>
        <ScrollCarouselPrevious className="top-[38%]" />
        <ScrollCarouselNext className="top-[38%]" />
        <ScrollCarouselDots className="mt-3" />
      </ScrollCarousel>
    </section>
  )
}
