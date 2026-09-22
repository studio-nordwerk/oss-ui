// End-to-end check of the shadcn registry: a fresh shadcn project (Vite template) installs every
// component and block through `shadcn add`, builds with its own TypeScript and Tailwind, and
// renders all blocks on one page. Dependencies point at this checkout, not at npm. Each package
// can add its own browser checks in test/shadcn.mjs (export async function check(page)).
// Usage: node scripts/shadcn-smoke.mjs   (KEEP=1 keeps the project; SMOKE_DIR sets its place)
import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from '@playwright/test';
import { packages, root } from './packages.mjs';

const work = process.env.SMOKE_DIR || mkdtempSync(join(tmpdir(), 'oss-ui-shadcn-'));
const run = (command, args, cwd = work) =>
  execFileSync(command, args, { cwd, stdio: 'inherit', env: { ...process.env, CI: '1' } });
const shadcn = (...args) => run('npx', ['-y', 'shadcn@latest', ...args]);
const REGISTRY = 'studio-nordwerk/oss-ui/';

console.log(`Working in ${work}`);

// 1. The packages as tarballs, and the registry as built JSON.
run('pnpm', ['build'], root);
const tarballs = {};
for (const { dir, manifest } of packages()) {
  const before = new Set(readdirSync(work));
  run('npm', ['pack', '--pack-destination', work], dir);
  tarballs[manifest.name] = join(
    work,
    readdirSync(work).find((name) => name.endsWith('.tgz') && !before.has(name)),
  );
}
const built = join(work, 'r');
shadcn('build', join(root, 'registry.json'), '--output', built, '--cwd', root);

// Point dependencies at this checkout: tarballs instead of npm, built items instead of the GitHub
// address.
const items = JSON.parse(readFileSync(join(root, 'registry.json'), 'utf8')).items;
for (const { name } of items) {
  const file = join(built, `${name}.json`);
  const item = JSON.parse(readFileSync(file, 'utf8'));
  item.dependencies = (item.dependencies || []).map((dep) => tarballs[dep.replace(/(?<=.)@[^@]*$/, '')] ?? dep);
  item.registryDependencies = (item.registryDependencies || []).map((dep) =>
    dep.startsWith(REGISTRY) ? join(built, `${dep.slice(REGISTRY.length)}.json`) : dep,
  );
  writeFileSync(file, JSON.stringify(item, null, 2));
}

// 2. A fresh shadcn project, and everything installed through the CLI.
shadcn(
  'init',
  '--name',
  'app',
  '--template',
  'vite',
  '--preset',
  'nova',
  '--base',
  'base',
  '--yes',
  '--no-monorepo',
  '--cwd',
  work,
);
const app = join(work, 'app');
shadcn('add', ...items.map(({ name }) => join(built, `${name}.json`)), '--yes', '--overwrite', '--cwd', app);

// 3. A page with every block, then the project's own build.
const blocks = items
  .filter((item) => item.type == 'registry:block')
  .map(({ name }) => ({ name, component: name.replace(/(^|-)(\w)/g, (_, dash, char) => char.toUpperCase()) }));
writeFileSync(
  join(app, 'src/App.tsx'),
  `${blocks.map(({ name, component }) => `import { ${component} } from "@/components/${name}"`).join('\n')}

export default function App() {
  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-16 p-6">
      ${blocks.map(({ component }) => `<${component} />`).join('\n      ')}
    </main>
  )
}
`,
);
run('npm', ['run', 'build'], app);

// 4. In a browser: nothing overflows or errors, and each package's own checks pass.
const server = spawn('npx', ['vite', 'preview', '--port', '4175', '--strictPort'], { cwd: app, stdio: 'ignore' });
let failed = false;
try {
  await new Promise((done) => setTimeout(done, 2500));
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => message.type() == 'error' && errors.push(message.text()));
  await page.goto('http://localhost:4175/');
  const problems = [];
  const reports = {};
  for (const { name, dir } of packages()) {
    const checks = join(dir, 'test/shadcn.mjs');
    if (!existsSync(checks)) continue;
    const { check } = await import(pathToFileURL(checks).href);
    const result = await check(page);
    reports[name] = result.report;
    problems.push(...result.problems.map((problem) => `${name}: ${problem}`));
  }
  const overflow = await page.evaluate(
    () => document.scrollingElement.scrollWidth - document.scrollingElement.clientWidth,
  );
  if (overflow > 0) problems.push(`the page scrolls sideways by ${overflow}px`);
  problems.push(...errors);
  await page.screenshot({ path: join(work, 'smoke.png'), fullPage: false });
  await browser.close();
  console.log(JSON.stringify({ reports, problems }, null, 2));
  failed = problems.length > 0;
} finally {
  server.kill();
  if (!process.env.KEEP && !process.env.SMOKE_DIR) rmSync(work, { recursive: true, force: true });
}
console.log(failed ? 'shadcn smoke test FAILED' : 'shadcn smoke test passed');
process.exit(failed ? 1 : 0);
