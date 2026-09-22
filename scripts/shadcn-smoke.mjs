// End-to-end check of the shadcn registry: a fresh shadcn project (Vite template) installs the
// Scroll Carousel component and every block through `shadcn add`, builds with its own TypeScript
// and Tailwind, and renders in a browser. Dependencies point at this checkout, not at npm.
// Usage: node scripts/shadcn-smoke.mjs   (KEEP=1 keeps the project; SMOKE_DIR sets its place)
import { execFileSync, spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { chromium } from '@playwright/test';

const root = resolve(import.meta.dirname, '..');
const work = process.env.SMOKE_DIR || mkdtempSync(join(tmpdir(), 'sc-shadcn-'));
const run = (command, args, cwd = work) => execFileSync(command, args, { cwd, stdio: 'inherit', env: { ...process.env, CI: '1' } });
const shadcn = (...args) => run('npx', ['-y', 'shadcn@latest', ...args]);

console.log(`Working in ${work}`);

// 1. The package as a tarball, and the registry as built JSON.
run('node', ['scripts/build.mjs'], root);
run('npm', ['pack', '--pack-destination', work], root);
const tarball = join(work, readdirSync(work).find((name) => name.endsWith('.tgz')));
const built = join(work, 'r');
shadcn('build', join(root, 'registry.json'), '--output', built, '--cwd', root);

// Point dependencies at this checkout: the tarball instead of npm, the built component instead
// of the GitHub address.
const items = JSON.parse(readFileSync(join(root, 'registry.json'), 'utf8')).items.map((item) => item.name);
for (const name of items) {
  const file = join(built, `${name}.json`);
  const item = JSON.parse(readFileSync(file, 'utf8'));
  item.dependencies = (item.dependencies || []).map((dep) => (dep.startsWith('@nordwerk/scroll-carousel') ? tarball : dep));
  item.registryDependencies = (item.registryDependencies || []).map((dep) =>
    dep == 'studio-nordwerk/scroll-carousel/scroll-carousel' ? join(built, 'scroll-carousel.json') : dep,
  );
  writeFileSync(file, JSON.stringify(item, null, 2));
}

// 2. A fresh shadcn project, and everything installed through the CLI.
shadcn('init', '--name', 'app', '--template', 'vite', '--preset', 'nova', '--base', 'base', '--yes', '--no-monorepo', '--cwd', work);
const app = join(work, 'app');
shadcn('add', ...items.map((name) => join(built, `${name}.json`)), '--yes', '--overwrite', '--cwd', app);

// 3. A page with every block, then the project's own build.
writeFileSync(
  join(app, 'src/App.tsx'),
  `import { BrandTeasers } from "@/components/brand-teasers"
import { HeroAutoplay } from "@/components/hero-autoplay"
import { ImageGallery } from "@/components/image-gallery"
import { LogoBelt } from "@/components/logo-belt"
import { ProductRow } from "@/components/product-row"

export default function App() {
  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-16 p-6">
      <HeroAutoplay />
      <ProductRow />
      <BrandTeasers />
      <ImageGallery />
      <LogoBelt />
    </main>
  )
}
`,
);
run('npm', ['run', 'build'], app);

// 4. In a browser: every carousel attaches, the controls work, nothing overflows or errors.
const server = spawn('npx', ['vite', 'preview', '--port', '4175', '--strictPort'], { cwd: app, stdio: 'ignore' });
let failed = false;
try {
  await new Promise((done) => setTimeout(done, 2500));
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const problems = [];
  page.on('pageerror', (error) => problems.push(error.message));
  page.on('console', (message) => message.type() == 'error' && problems.push(message.text()));
  await page.goto('http://localhost:4175/');
  await page.waitForFunction(() => document.querySelectorAll('.sc[data-sc-ready]').length == 5, null, { timeout: 15000 });
  const row = page.locator('[aria-label="Bestsellers"]');
  await row.scrollIntoViewIfNeeded();
  await row.locator('[data-slot=scroll-carousel-next]').click();
  await page.waitForTimeout(1200);
  const report = await page.evaluate(() => ({
    rowScrolled: Math.abs(document.querySelector('[aria-label="Bestsellers"] [data-sc-track]').scrollLeft),
    dots: document.querySelectorAll('[aria-label="Bestsellers"] [data-slot=scroll-carousel-dots] button').length,
    playLabel: document.querySelector('[data-slot=scroll-carousel-play]')?.getAttribute('aria-label'),
    overflow: document.scrollingElement.scrollWidth - document.scrollingElement.clientWidth,
  }));
  await page.screenshot({ path: join(work, 'smoke.png'), fullPage: false });
  await browser.close();
  console.log(JSON.stringify({ ...report, problems }, null, 2));
  failed = report.rowScrolled < 100 || report.dots < 2 || !report.playLabel || report.overflow > 0 || problems.length > 0;
} finally {
  server.kill();
  if (!process.env.KEEP && !process.env.SMOKE_DIR) rmSync(work, { recursive: true, force: true });
}
console.log(failed ? 'shadcn smoke test FAILED' : 'shadcn smoke test passed');
process.exit(failed ? 1 : 0);
