"use client"

import { Button } from "@/components/ui/button"
import {
  ScrollSheet,
  ScrollSheetBody,
  ScrollSheetClose,
  ScrollSheetContent,
  ScrollSheetFooter,
  ScrollSheetHeader,
  ScrollSheetTitle,
  ScrollSheetTrigger,
} from "@/components/ui/scroll-sheet"

const items = [
  { name: "Rose Water Mist", detail: "Harbour Mist · 100 ml", price: "24.95 €" },
  { name: "Night Repair Cream", detail: "Isle Botanics · 50 ml", price: "39.00 €" },
  { name: "Cedar Hand Balm", detail: "Alder & Ash · 75 ml", price: "12.50 €" },
]

export function MiniCart() {
  return (
    // replace: opening the bag closes any other sheet first instead of stacking on it.
    <ScrollSheet presentation="end" replace>
      <ScrollSheetTrigger asChild>
        <Button variant="outline">Bag (3)</Button>
      </ScrollSheetTrigger>
      <ScrollSheetContent>
        <ScrollSheetHeader>
          <ScrollSheetTitle>Your bag</ScrollSheetTitle>
          <ScrollSheetClose />
        </ScrollSheetHeader>
        <ScrollSheetBody>
          <ul className="divide-y">
            {items.map((item) => (
              <li key={item.name} className="flex items-center gap-3 py-3">
                <span className="size-14 shrink-0 rounded-md bg-muted" aria-hidden="true" />
                <span className="flex-1">
                  <span className="block font-medium">{item.name}</span>
                  <span className="block text-sm text-muted-foreground">{item.detail}</span>
                </span>
                <span>{item.price}</span>
              </li>
            ))}
          </ul>
        </ScrollSheetBody>
        <ScrollSheetFooter>
          <p className="flex justify-between font-medium">
            <span>Total</span>
            <span>76.45 €</span>
          </p>
          <Button>Go to checkout</Button>
        </ScrollSheetFooter>
      </ScrollSheetContent>
    </ScrollSheet>
  )
}
