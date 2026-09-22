"use client"

import { Button } from "@/components/ui/button"
import {
  ScrollSheet,
  ScrollSheetBody,
  ScrollSheetClose,
  ScrollSheetContent,
  ScrollSheetDescription,
  ScrollSheetHeader,
  ScrollSheetTitle,
  ScrollSheetTrigger,
} from "@/components/ui/scroll-sheet"

export function ContactDialog() {
  return (
    <ScrollSheet presentation="center">
      <ScrollSheetTrigger asChild>
        <Button variant="outline">Write to us</Button>
      </ScrollSheetTrigger>
      <ScrollSheetContent>
        <ScrollSheetHeader>
          <div className="flex-1">
            <ScrollSheetTitle>Write to us</ScrollSheetTitle>
            <ScrollSheetDescription>We answer within one working day.</ScrollSheetDescription>
          </div>
          <ScrollSheetClose />
        </ScrollSheetHeader>
        <ScrollSheetBody>
          {/* method="dialog": the pressed button closes the dialog and becomes its returnValue. */}
          <form method="dialog" className="flex flex-col gap-4">
            <label className="grid gap-1.5 text-sm">
              Your email
              <input
                type="email"
                name="email"
                autoComplete="email"
                required
                className="rounded-md border px-3 py-2 text-base"
              />
            </label>
            <label className="grid gap-1.5 text-sm">
              Message
              <textarea name="message" rows={4} className="rounded-md border px-3 py-2 text-base" />
            </label>
            <div className="flex gap-2">
              <Button type="submit" value="send">
                Send
              </Button>
              <Button type="submit" variant="ghost" value="cancel" formNoValidate>
                Cancel
              </Button>
            </div>
          </form>
        </ScrollSheetBody>
      </ScrollSheetContent>
    </ScrollSheet>
  )
}
