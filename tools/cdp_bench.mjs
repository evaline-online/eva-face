// cdp_bench.mjs — run headless chromium, poll window.__benchResult via CDP.
import { spawn } from 'node:child_process';

const url = process.argv[2];
const chromeBin = process.argv[3] || '/usr/bin/chromium';
const port = 9223;

const proc = spawn(chromeBin, [
  '--headless=new', '--no-sandbox', '--disable-gpu',
  `--remote-debugging-port=${port}`,
  '--window-size=1200,800',
  url,
]);

let targets = null;
for (let i = 0; i < 50; i++) {
  try {
    const r = await fetch(`http://127.0.0.1:${port}/json`);
    targets = await r.json();
    if (targets.length) break;
  } catch { /* not ready */ }
  await new Promise(r => setTimeout(r, 200));
}
if (!targets || !targets.length) { proc.kill(); console.error('NO targets'); process.exit(1); }

const page = targets.find(t => t.type === 'page');
if (!page) { proc.kill(); console.error('NO page target'); process.exit(1); }

const ws = new WebSocket(page.webSocketDebuggerUrl);
let id = 0;
const pending = new Map();
function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const mid = ++id;
    pending.set(mid, { resolve, reject });
    ws.send(JSON.stringify({ id: mid, method, params }));
  });
}
ws.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) {
    const p = pending.get(m.id); pending.delete(m.id);
    m.error ? p.reject(new Error(m.error.message)) : p.resolve(m.result);
  }
};
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });

let result = null;
const deadline = Date.now() + 30000;
while (Date.now() < deadline) {
  const r = await send('Runtime.evaluate', {
    expression: `(window.__benchResult ? JSON.stringify(window.__benchResult) : null)`,
    returnByValue: true,
  });
  if (r.result && r.result.value) { result = JSON.parse(r.result.value); break; }
  await new Promise(s => setTimeout(s, 700));
}
console.log(JSON.stringify(result || { error: 'no bench result' }));
proc.kill();
process.exit(0);