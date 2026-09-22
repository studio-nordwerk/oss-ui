"use client"

import { Button } from "@/components/ui/button"
import { drag } from "@nordwerk/scroll-sheet/drag"

import {
  ScrollSheet,
  ScrollSheetBody,
  ScrollSheetClose,
  ScrollSheetContent,
  ScrollSheetHandle,
  ScrollSheetHeader,
  ScrollSheetTitle,
  ScrollSheetTrigger,
} from "@/components/ui/scroll-sheet"

const stores = [
  { street: "Harbour Street 12", town: "Lindholm", distance: "0.4 km", hours: "Open until 20:00" },
  { street: "Market Square 3", town: "Lindholm", distance: "1.2 km", hours: "Open until 19:00" },
  { street: "Station Arcade", town: "Westerby", distance: "3.8 km", hours: "Open until 21:00" },
  { street: "Mill Lane 40", town: "Westerby", distance: "4.1 km", hours: "Closed today" },
  { street: "Riverside Mall", town: "Osterfeld", distance: "7.5 km", hours: "Open until 20:00" },
]

// Made outside the component, so every render passes the same plugins.
const plugins = [drag()]

export function StoreFinder() {
  return (
    // Rests at a third, two thirds or the full height; opens low so the map above stays visible.
    <ScrollSheet snapPoints={["32dvh", "66dvh"]} initialSnap={0} plugins={plugins}>
      <ScrollSheetTrigger asChild>
        <Button variant="outline">Find a store</Button>
      </ScrollSheetTrigger>
      <ScrollSheetContent>
        <ScrollSheetHandle />
        <ScrollSheetHeader>
          <ScrollSheetTitle>Stores near you</ScrollSheetTitle>
          <ScrollSheetClose />
        </ScrollSheetHeader>
        <ScrollSheetBody>
          <ul className="divide-y">
            {stores.map((store) => (
              <li key={store.street} className="py-3">
                <span className="block font-medium">
                  {store.street}, {store.town}
                </span>
                <span className="block text-sm text-muted-foreground">
                  {store.distance} · {store.hours}
                </span>
              </li>
            ))}
          </ul>
        </ScrollSheetBody>
      </ScrollSheetContent>
    </ScrollSheet>
  )
}
