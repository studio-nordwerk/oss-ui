# oss-ui

Open-source UI packages by [Studio Nordwerk](https://www.nordwerk.studio/oss), built on the native
platform first: the HTML and CSS work on their own, and a small script, where there is one, only
improves them. No runtime dependencies, React, Preact and Astro adapters, and shadcn/ui components
and blocks.

| Package | What it is | Docs |
| --- | --- | --- |
| [`@nordwerk/scroll-carousel`](packages/scroll-carousel) | A carousel on native scrolling with CSS scroll snap | [nordwerk.studio/oss/scroll-carousel](https://www.nordwerk.studio/oss/scroll-carousel) |

Each package is published on its own, with its own version and changelog.

## shadcn/ui

One registry for all packages, straight from this repository:

```sh
npx shadcn@latest add studio-nordwerk/oss-ui/<item>
```

The items are listed in [registry.json](registry.json) and in each package's README.

## Development

Needs Node 22 or later and the pnpm version in `packageManager`. The toolchain is
[Vite+](https://viteplus.dev) (`vp`), installed with the dependencies.

```sh
pnpm install
pnpm check      # format, lint, typecheck, unit tests, build, site, size budgets, fixtures, browser tests
pnpm serve      # the site on http://localhost:4173 after pnpm site, each package under /<name>/
```

See [AGENTS.md](AGENTS.md) for the layout, the conventions and how a release works.

## Licence

MIT
