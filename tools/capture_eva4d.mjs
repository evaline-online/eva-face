import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const chromeBin = process.env.CHROME_BIN || '/usr/bin/chromium';
const port = 9333;
const outDir = '/home/evabot/.gemini/antigravity-cli/brain/ced7b0b2-28c6-42b8-80f3-20b42d1cdf93';

async function run() {
  const proc = spawn(chromeBin, [
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu',
    '--enable-unsafe-swiftshader',
    `--remote-debugging-port=${port}`,
    '--window-size=1280,820',
    'http://127.0.0.1:8093/',
  ]);

  let targets = null;
  for (let i = 0; i < 40; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${port}/json`);
      targets = await r.json();
      if (targets && targets.length) break;
    } catch (_) {}
    await new Promise(r => setTimeout(r, 200));
  }

  if (!targets || !targets.length) {
    proc.kill();
    console.error('No targets found');
    process.exit(1);
  }

  const page = targets.find(t => t.type === 'page');
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
      const p = pending.get(m.id);
      pending.delete(m.id);
      m.error ? p.reject(new Error(m.error.message)) : p.resolve(m.result);
    }
  };

  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });

  await send('Page.enable');
  await send('Runtime.enable');

  // Wait for WebGL initialization and shaders to warm up
  await new Promise(r => setTimeout(r, 2500));

  // 1. Capture pure closed view (minimalist head + single button)
  const snap1 = await send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(join(outDir, 'eva_4d_minimalist_view.png'), Buffer.from(snap1.data, 'base64'));
  console.log('[+] Captured eva_4d_minimalist_view.png');

  // 2. Open Master Control Deck Modal
  await send('Runtime.evaluate', {
    expression: `document.getElementById('btn-master-deck').click();`
  });
  await new Promise(r => setTimeout(r, 700));

  const snap2 = await send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(join(outDir, 'eva_4d_deck_modal.png'), Buffer.from(snap2.data, 'base64'));
  console.log('[+] Captured eva_4d_deck_modal.png');

  // 3. Select Hologram Vector (Eco 60 FPS) and close modal
  await send('Runtime.evaluate', {
    expression: `
      document.querySelector('.btn-variant-card[data-variant="hologram"]').click();
      document.getElementById('btn-close-deck').click();
    `
  });
  await new Promise(r => setTimeout(r, 800));

  const snap3 = await send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(join(outDir, 'eva_4d_hologram_eco.png'), Buffer.from(snap3.data, 'base64'));
  console.log('[+] Captured eva_4d_hologram_eco.png');

  // 4. Select Electra Cyan
  await send('Runtime.evaluate', {
    expression: `
      document.querySelector('.btn-variant-card[data-variant="electra"]').click();
    `
  });
  await new Promise(r => setTimeout(r, 600));

  const snap4 = await send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(join(outDir, 'eva_4d_electra_cyan.png'), Buffer.from(snap4.data, 'base64'));
  console.log('[+] Captured eva_4d_electra_cyan.png');

  // 5. Select Solar Amber
  await send('Runtime.evaluate', {
    expression: `
      document.querySelector('.btn-variant-card[data-variant="solar"]').click();
    `
  });
  await new Promise(r => setTimeout(r, 600));

  const snap5 = await send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(join(outDir, 'eva_4d_solar_amber.png'), Buffer.from(snap5.data, 'base64'));
  console.log('[+] Captured eva_4d_solar_amber.png');

  // 6. Mobile Viewport (iPhone 14 style: 390x844)
  await send('Emulation.setDeviceMetricsOverride', {
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    mobile: true,
  });
  await send('Runtime.evaluate', {
    expression: `
      document.querySelector('.btn-variant-card[data-variant="phosphor"]').click();
      window.dispatchEvent(new Event('resize'));
    `
  });
  await new Promise(r => setTimeout(r, 800));

  const snap6 = await send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(join(outDir, 'eva_4d_mobile_phone.png'), Buffer.from(snap6.data, 'base64'));
  console.log('[+] Captured eva_4d_mobile_phone.png');

  proc.kill();
  console.log('[✓] All 6 screenshots captured successfully!');
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
