"use client"

import * as React from "react"
import { keyboard } from "@nordwerk/scroll-sheet/keyboard"

import { Button } from "@/components/ui/button"
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

// Made outside the component, so every render passes the same plugins.
const plugins = [keyboard()]

const sizes = [
  { label: "30 ml", price: "19.95 €" },
  { label: "50 ml", price: "29.95 €" },
  { label: "75 ml", price: "39.95 €" },
  { label: "100 ml", price: "49.95 €" },
  { label: "150 ml", price: "64.95 €" },
]

export function SizePicker() {
  const [size, setSize] = React.useState("50 ml")
  return (
    <ScrollSheet snapPoints={["50dvh"]} initialSnap={0} plugins={plugins}>
      <ScrollSheetTrigger asChild>
        <Button variant="outline">Choose a size: {size}</Button>
      </ScrollSheetTrigger>
      <ScrollSheetContent>
        <ScrollSheetHandle />
        <ScrollSheetHeader>
          <ScrollSheetTitle>Choose a size</ScrollSheetTitle>
          <ScrollSheetClose />
        </ScrollSheetHeader>
        <ScrollSheetBody className="flex flex-col gap-4">
          <fieldset className="grid gap-2">
            <legend className="sr-only">Size</legend>
            {sizes.map((option) => (
              <label
                key={option.label}
                className="flex items-center gap-3 rounded-lg border p-3 has-checked:border-foreground"
              >
                <input
                  type="radio"
                  name="size"
                  value={option.label}
                  checked={size === option.label}
                  onChange={() => setSize(option.label)}
                />
                <span className="flex-1">{option.label}</span>
                <span className="text-muted-foreground">{option.price}</span>
              </label>
            ))}
          </fieldset>
          <label className="grid gap-1.5 text-sm">
            Engraving, up to 20 letters
            {/* 16px text: iOS does not zoom into the field. */}
            <input maxLength={20} className="rounded-md border px-3 py-2 text-base" />
          </label>
          <p className="text-sm text-muted-foreground">
            Free delivery from 25 €. Returns within 30 days.
          </p>
        </ScrollSheetBody>
        <ScrollSheetFooter>
          <ScrollSheetClose className="h-10 rounded-md bg-primary text-primary-foreground hover:bg-primary/90">
            Add to bag
          </ScrollSheetClose>
        </ScrollSheetFooter>
      </ScrollSheetContent>
    </ScrollSheet>
  )
}
