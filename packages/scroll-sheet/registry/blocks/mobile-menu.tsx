"use client"

import { history } from "@nordwerk/scroll-sheet/history"

import { Button } from "@/components/ui/button"
import {
  ScrollSheet,
  ScrollSheetBody,
  ScrollSheetClose,
  ScrollSheetContent,
  ScrollSheetHeader,
  ScrollSheetTitle,
  ScrollSheetTrigger,
} from "@/components/ui/scroll-sheet"

// The back button and the back swipe close the menu instead of leaving the page.
const plugins = [history()]

const links = ["New in", "Skin care", "Fragrance", "Make-up", "Hair", "Gifts", "Sale"]

export function MobileMenu() {
  return (
    <ScrollSheet presentation="start" plugins={plugins}>
      <ScrollSheetTrigger asChild>
        <Button variant="outline" aria-label="Open the menu">
          <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
            className="size-4"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
          >
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
          Menu
        </Button>
      </ScrollSheetTrigger>
      <ScrollSheetContent>
        <ScrollSheetHeader>
          <ScrollSheetTitle>Menu</ScrollSheetTitle>
          <ScrollSheetClose />
        </ScrollSheetHeader>
        <ScrollSheetBody>
          <nav aria-label="Categories">
            <ul className="divide-y">
              {links.map((link) => (
                <li key={link}>
                  <a href="#" className="block py-3 text-lg">
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </ScrollSheetBody>
      </ScrollSheetContent>
    </ScrollSheet>
  )
}
