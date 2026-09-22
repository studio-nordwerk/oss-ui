# oss-ui: guide for coding agents

How to work on this repository. How to use a package in a project is in that package's own
AGENTS.md (`packages/<name>/AGENTS.md`), which ships with the package on npm and is published as
`llms.txt` next to its documentation page.

## Layout

- `package.json`: the private workspace root with the shared tools; `pnpm-workspace.yaml` lists
  `packages/*`.
- `scripts/`: build, size budgets, site, fixtures, package lint, shadcn smoke test and the local
  server. Each works on every package, or on the packages named on the command line, e.g.
  `node scripts/build.mjs scroll-carousel`.
- `site/`: the shared frame of the documentation pages (`frame.mjs`, `frame.css`, `frame.js`).
- `registry.json`: the shadcn registry for all packages, read by the shadcn CLI straight from this
  public repository (`studio-nordwerk/oss-ui/<item>`).
- `playwright.config.ts`: browser tests of all packages in Chromium, WebKit and Firefox.
- `packages/<name>/`: one published package.

## What a package brings

- `package.json`: what is published. The build follows its `exports`: each `./dist/<x>.js` is
  built from `src/<x>.ts`, each `./dist/<x>.css` is copied from `src/`, and `./dist/<x>.layer.css`
  is `src/<x>.css` inside Tailwind's components layer. Peer dependencies stay external;
  `dist/react.js` gets `'use client'`. Declarations come from the package's `tsconfig.json`.
  `repository.directory` names the package folder; `prepublishOnly` runs the build.
- `budgets.json`: gzip budgets per entry, `[{ "name", "entry": "dist/…", "max": bytes }]`,
  measured bundled and minified. Not published.
- `src/`, `test/unit/*.test.ts` (node's test runner on the TypeScript sources).
- `test/e2e/*.spec.ts`: Playwright against `_site/`, where the package's page and fixtures are
  under `/<name>/`. Visual baselines sit next to the tests in `__screenshots__/<platform>`.
- `test/fixtures/build.mjs` (optional): builds adapter fixtures into `_site/<name>/fixtures/`.
- `test/shadcn.mjs` (optional): `export async function check(page)` with the package's checks in
  the shadcn smoke test; returns `{ report, problems }`.
- `site/generate.mjs`: `export default async ({ out, base, canonical, redirect }) => …` writes the
  documentation page into `out` with `page()` and `copyFrame()` from `site/frame.mjs`.
- `registry/ui/<name>.tsx`, `registry/blocks/<block>.tsx`: shadcn items, listed in the root
  `registry.json`. Block names are unique across the repository. Items depend on
  `@nordwerk/<name>@^<version>` and on the package's component as
  `studio-nordwerk/oss-ui/<name>`. `registry/tsconfig.json` with stand-ins in `registry/shims`
  type-checks them.
- `README.md`, `CHANGELOG.md`, `AGENTS.md` (the usage guide), `docs/`.

No package depends on another at runtime. Code they share is bundled in at build time, so every
package installs on its own.

## Documentation pages

GitHub Pages publishes `_site/` under `/oss-ui/`; each package's page is at `/oss-ui/<name>/`.
www.nordwerk.studio shows it at `/oss/<name>` through a proxy that rewrites `<base href>`, so
every link on a page must stay relative to `<base>`. The proxy also puts the studio site's own
header and footer in place of `<!--nw:header-->` (first child of `.sheet`) and `<!--nw:footer-->`
(right after `.sheet`); `page()` writes both. Keep `<html lang="en">` and `<body>` free of other
attributes, keep `data-hero` on the page's introduction, and never style the studio's class names
(band, pill, brand, brand-mark, links, link, cta, foot, grid, brand-col, tag, label, base) or set
`--wrap`. Locally and on GitHub Pages the pages have no header or footer. Visitors of the GitHub
Pages address are sent to nordwerk.studio (`SITE_REDIRECT=1` in CI).

## Commands

Needs Node 22 or later and the pnpm version in `packageManager`.

```sh
pnpm install
pnpm typecheck            # every package, and its registry files
pnpm test                 # unit tests, no build needed
pnpm build                # packages/*/dist
pnpm site                 # build, then _site/: every package's page, the registry as JSON in r/
pnpm size                 # fails when an entry exceeds its gzip budget
pnpm lint:package         # publint and arethetypeswrong on the packed tarballs, after a build
pnpm fixtures             # adapter fixtures into _site/<name>/fixtures/, after pnpm site
pnpm test:e2e             # Chromium, WebKit and Firefox
pnpm test:shadcn          # a fresh shadcn project installs, builds and renders every item
pnpm check                # all but the shadcn test, in order
```

Update a package's visual baselines with
`UPDATE_VISUAL=1 pnpm test:e2e --project=chromium packages/<name>/test/e2e/visual --update-snapshots=all`.

## Releases

Each package is released on its own by a tag `<name>@<version>`:

1. Bump `version` in `packages/<name>/package.json` and add the entry `## <version> (date)` to its
   CHANGELOG.md; commit.
2. `git tag -a <name>@<version> -m "<name> <version>"` and `git push --follow-tags`.

`.github/workflows/release.yml` checks the tag against the package, runs the checks, publishes
with provenance through npm trusted publishing and creates the GitHub release from the changelog
entry. The first version of a new package is published by hand (`npm publish` in its folder), as
npm only trusts a publisher for an existing package; then the package's settings on npmjs.com
name this repository and `release.yml`.

## Conventions

- No runtime dependencies. Anything a consumer does not use must tree-shake away; optional
  behaviour becomes a plugin or a separate entry.
- The native platform first: HTML and CSS must work before any script runs, and every package has
  a browser test of its page without the script. Scripts improve; they do not lay out.
- Raising a size budget needs a reason in the commit message.
- Every must-have behaviour has a browser test that passes in all three engines. Fix flaky tests
  instead of retrying them.
- Descriptive names, English in code, comments and docs, no project code names.
- Examples, fixtures and docs use fictional content. Never name or describe a client, its code,
  its paths or its numbers in this repository, including commit messages.
