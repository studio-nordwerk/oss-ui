// Stand-in for shadcn's Button, only for type-checking the registry: same props that matter here.
import type * as React from "react"

export function Button(
  props: React.ComponentProps<"button"> & {
    variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
    size?: "default" | "xs" | "sm" | "lg" | "icon" | "icon-xs" | "icon-sm" | "icon-lg"
  },
) {
  const { variant: _variant, size: _size, ...rest } = props
  return <button {...rest} />
}
