"use client"

import * as React from "react"

import { Button } from "@/components/ui/button"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"

// The same calls as with the Vaul-based drawer.tsx: only the component file changed.
export function DrawerDemo() {
  const [goal, setGoal] = React.useState(350)
  const [snap, setSnap] = React.useState<number | string | null>(0.4)

  return (
    <div className="flex flex-wrap gap-3">
      <Drawer>
        <DrawerTrigger asChild>
          <Button variant="outline">Daily goal</Button>
        </DrawerTrigger>
        <DrawerContent>
          <div className="mx-auto w-full max-w-sm">
            <DrawerHeader>
              <DrawerTitle>Daily goal</DrawerTitle>
              <DrawerDescription>Set how many minutes you want to move each day.</DrawerDescription>
            </DrawerHeader>
            <div className="flex items-center justify-center gap-4 p-4">
              <Button
                variant="outline"
                size="icon"
                aria-label="Less"
                onClick={() => setGoal(Math.max(200, goal - 10))}
              >
                −
              </Button>
              <p className="w-24 text-center text-5xl font-semibold tabular-nums">{goal}</p>
              <Button
                variant="outline"
                size="icon"
                aria-label="More"
                onClick={() => setGoal(Math.min(400, goal + 10))}
              >
                +
              </Button>
            </div>
            <DrawerFooter>
              <DrawerClose asChild>
                <Button>Save</Button>
              </DrawerClose>
              <DrawerClose asChild>
                <Button variant="outline">Cancel</Button>
              </DrawerClose>
            </DrawerFooter>
          </div>
        </DrawerContent>
      </Drawer>

      <Drawer
        snapPoints={[0.4, 1]}
        activeSnapPoint={snap}
        setActiveSnapPoint={setSnap}
        shouldScaleBackground
      >
        <DrawerTrigger asChild>
          <Button variant="outline">Route details</Button>
        </DrawerTrigger>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Route details</DrawerTitle>
            <DrawerDescription>Opens at 40 %, drag it up for the full list.</DrawerDescription>
          </DrawerHeader>
          <ol className="grid gap-3 px-4 pb-4">
            {[
              "Harbour Street",
              "Market Square",
              "Station Arcade",
              "Mill Lane",
              "Riverside",
              "Old Town",
            ].map((stop, index) => (
              <li key={stop} className="rounded-lg bg-muted p-3">
                {index + 1}. {stop}
              </li>
            ))}
          </ol>
        </DrawerContent>
      </Drawer>

      <Drawer direction="right">
        <DrawerTrigger asChild>
          <Button variant="outline">Settings</Button>
        </DrawerTrigger>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Settings</DrawerTitle>
            <DrawerDescription>A drawer from the right edge.</DrawerDescription>
          </DrawerHeader>
          <DrawerFooter>
            <DrawerClose asChild>
              <Button variant="outline">Done</Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      <Drawer dismissible={false}>
        <DrawerTrigger asChild>
          <Button variant="outline">Terms</Button>
        </DrawerTrigger>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Accept the terms</DrawerTitle>
            <DrawerDescription>
              Dragging, Escape and taps outside do not close this one.
            </DrawerDescription>
          </DrawerHeader>
          <DrawerFooter>
            <DrawerClose asChild>
              <Button>Accept</Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  )
}
