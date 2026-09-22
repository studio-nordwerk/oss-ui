"use client"

import * as React from "react"

import { Button } from "@/components/ui/button"
import { drag } from "@nordwerk/scroll-sheet/drag"

import {
  ScrollSheet,
  ScrollSheetBody,
  ScrollSheetClose,
  ScrollSheetContent,
  ScrollSheetFooter,
  ScrollSheetHandle,
  ScrollSheetHeader,
  ScrollSheetTitle,
  ScrollSheetTrigger,
} from "@/components/ui/scroll-sheet"

const brands = [
  "Alder & Ash",
  "Bramble",
  "Cinder Lane",
  "Dune Studio",
  "Elm Hollow",
  "Fernweh",
  "Grove No. 7",
  "Harbour Mist",
  "Isle Botanics",
  "Juniper Row",
  "Kestrel",
  "Linden Works",
]

// Made outside the component, so every render passes the same plugins.
const plugins = [drag()]

export function FilterDrawer() {
  const [chosen, setChosen] = React.useState<string[]>([])
  const toggle = (brand: string) =>
    setChosen((list) =>
      list.includes(brand) ? list.filter((item) => item !== brand) : [...list, brand],
    )
  return (
    // A bottom sheet on phones, a drawer from the end edge from 48rem on.
    <ScrollSheet presentation="bottom md:end" plugins={plugins}>
      <ScrollSheetTrigger asChild>
        <Button variant="outline">Filter{chosen.length ? ` (${chosen.length})` : ""}</Button>
      </ScrollSheetTrigger>
      <ScrollSheetContent>
        <ScrollSheetHandle />
        <ScrollSheetHeader>
          <ScrollSheetTitle>Filter</ScrollSheetTitle>
          <ScrollSheetClose />
        </ScrollSheetHeader>
        <ScrollSheetBody>
          <fieldset className="grid gap-1">
            <legend className="mb-2 text-sm text-muted-foreground">Brand</legend>
            {brands.map((brand) => (
              <label key={brand} className="flex items-center gap-3 py-1.5">
                <input
                  type="checkbox"
                  checked={chosen.includes(brand)}
                  onChange={() => toggle(brand)}
                />
                {brand}
              </label>
            ))}
          </fieldset>
        </ScrollSheetBody>
        <ScrollSheetFooter className="flex-row">
          <Button variant="ghost" onClick={() => setChosen([])}>
            Reset
          </Button>
          <ScrollSheetClose className="h-10 flex-1 rounded-md bg-primary text-primary-foreground hover:bg-primary/90">
            Show 128 products
          </ScrollSheetClose>
        </ScrollSheetFooter>
      </ScrollSheetContent>
    </ScrollSheet>
  )
}
