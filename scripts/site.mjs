// Builds the documentation site into _site/, after the package build (pnpm site):
// - _site/<name>/ for every package with a site/generate.mjs, written by it on the shared frame
//   in site/frame.mjs;
// - _site/r/, the shadcn registry as built JSON, installable by URL as well as by GitHub address;
// - _site/index.html, which lists the packages.
// GitHub Pages publishes _site/ under /oss-ui/ (SITE_BASE=/oss-ui/); www.nordwerk.studio shows each
// page at /oss/<name> through a proxy. With SITE_REDIRECT=1, visitors of the GitHub Pages address
// are sent to nordwerk.studio.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { esc } from '../site/frame.mjs';
import { bin, packages, root } from './packages.mjs';

const prefix = process.env.SITE_BASE || '/';
const redirect = process.env.SITE_REDIRECT == '1';
const site = join(root, '_site');
const overview = 'https://www.nordwerk.studio/oss';

rmSync(site, { recursive: true, force: true });
mkdirSync(site, { recursive: true });

const pages = packages().filter(({ dir }) => existsSync(join(dir, 'site/generate.mjs')));
for (const { name, dir } of pages) {
  const { default: generate } = await import(pathToFileURL(join(dir, 'site/generate.mjs')).href);
  await generate({ out: join(site, name), base: `${prefix}${name}/`, canonical: `${overview}/${name}`, redirect });
}

execFileSync(bin('shadcn'), ['build', join(root, 'registry.json'), '--output', join(site, 'r'), '--cwd', root], {
  stdio: 'pipe',
});

writeFileSync(
  join(site, 'index.html'),
  `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Studio Nordwerk open source</title>
${redirect ? `<script>if (location.hostname.endsWith('github.io')) location.replace('${overview}');</script>\n<link rel="canonical" href="${overview}">` : ''}
</head>
<body>
<h1>Studio Nordwerk open source</h1>
<ul>
${pages.map(({ name, manifest }) => `<li><a href="${name}/">${name}</a>: ${esc(manifest.description)}</li>`).join('\n')}
</ul>
</body>
</html>
`,
);
writeFileSync(join(site, '.nojekyll'), '');
console.log(`_site/ written: ${pages.map(({ name }) => name).join(', ')}`);
