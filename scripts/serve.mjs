// Serves _site/ for local preview and the browser tests. Usage: node scripts/serve.mjs [port]
// Each package's page is in _site/<name>/. GitHub Pages publishes the site under /oss-ui/ and
// www.nordwerk.studio shows the pages under /oss/<name>; locally both prefixes work, as does
// the root.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const root = join(import.meta.dirname, '..', '_site');
const port = Number(process.argv[2] || process.env.PORT || 4173);
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
};

createServer(async (request, response) => {
  const path =
    normalize(decodeURIComponent(new URL(request.url, 'http://localhost').pathname))
      .replace(/^(\.\.[/\\])+/, '')
      .replace(/^\/(oss-ui|oss)(?=\/|$)/, '') || '/';
  let file = join(root, path);
  try {
    if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
    const body = await readFile(file);
    response.writeHead(200, {
      'content-type': types[extname(file)] || 'application/octet-stream',
      'cache-control': 'no-store',
    });
    response.end(body);
  } catch {
    response.writeHead(404, { 'content-type': 'text/plain' });
    response.end('Not found');
  }
}).listen(port, () => console.log(`Serving _site on http://localhost:${port}`));
