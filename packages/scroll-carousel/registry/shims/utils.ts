// Stand-in for a shadcn project's lib/utils, only for type-checking the registry.
export const cn = (...classes: unknown[]): string => classes.filter(Boolean).join(" ")
