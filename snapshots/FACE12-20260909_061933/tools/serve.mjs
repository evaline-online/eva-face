/**
 * serve.mjs — static dev server with hard no-store caching policy.
 * Replaces esbuild's built-in serve (which sends no Cache-Control headers),
 * so browsers can never hold a stale bundle. Pair with `esbuild --watch`:
 *   npx esbuild src/browser.ts --bundle --outfile=dist/face.js \
 *     --format=iife --platform=browser --watch &
 *   node tools/serve.mjs 8090
 */
import http from 'node:http';
import { createReadStream, statSync } from 'node:fs';
import { join, extname, normalize } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname; // project dir
const PORT = Number(process.argv[2] || 8090);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.obj': 'text/plain',
  '.txt': 'text/plain; charset=utf-8',
};

const server = http.createServer((req, res) => {
  // Everything is served with no-store: dev server, never cache.
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  let urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
  if (urlPath === '/') urlPath = '/index.html';
  const filePath = normalize(join(ROOT, urlPath));
  if (!filePath.startsWith(normalize(ROOT))) { res.writeHead(403); return res.end(); }

  try {
    const st = statSync(filePath);
    if (!st.isFile()) throw new Error('not a file');
    res.writeHead(200, { 'Content-Type': MIME[extname(filePath)] || 'application/octet-stream' });
    createReadStream(filePath).pipe(res);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('404');
  }
});

server.listen(PORT, '0.0.0.0', () => console.log(`[serve] no-store http://0.0.0.0:${PORT}/`));
