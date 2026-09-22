// Stand-in for shadcn's Badge, only for type-checking the registry.
import type * as React from "react"

export function Badge(props: React.ComponentProps<"span"> & { variant?: "default" | "secondary" | "destructive" | "outline" }) {
  const { variant: _variant, ...rest } = props
  return <span {...rest} />
}
