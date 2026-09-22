// The packages in packages/, for the scripts that work on all of them or on the ones named on
// the command line.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export const root = join(import.meta.dirname, '..');
export const bin = (name) => join(root, 'node_modules/.bin', name);

/** Every package, or the named ones: { name (the folder), dir, manifest }. */
export function packages(names = process.argv.slice(2)) {
  const all = readdirSync(join(root, 'packages'), { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && existsSync(join(root, 'packages', entry.name, 'package.json')))
    .map((entry) => {
      const dir = join(root, 'packages', entry.name);
      return { name: entry.name, dir, manifest: JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')) };
    });
  const unknown = names.filter((name) => !all.some((pkg) => pkg.name === name));
  if (unknown.length) throw new Error(`No package named ${unknown.join(', ')} in packages/`);
  return names.length ? all.filter((pkg) => names.includes(pkg.name)) : all;
}

/** The files an export map points at, e.g. ['./dist/index.js', './dist/carousel.css']. */
export const exportedFiles = (manifest) =>
  Object.values(manifest.exports ?? {}).map((target) => (typeof target === 'string' ? target : target.default));
