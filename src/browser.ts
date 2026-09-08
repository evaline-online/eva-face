/**
 * browser.ts — Browser renderer: Canvas + mouse/touch input.
 * Self-contained: imports face3d.ts and runs in the browser.
 */
import {
  createFaceMesh, projectAndShade, computeParams,
  deformMesh, v3norm, v3dot, v3,
  type Mesh, type FaceParams,
} from './face3d.js';
import { type GlyphRamp, type RenderMode } from './capability.js';

// ─── Canvas Setup ──────────────────────────────────────────────

const canvas = document.getElementById('c') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

let W = 0;
let H = 0;
let COLS = 0;
let ROWS = 0;
let cellW = 0;
let cellH = 0;

// Device pixel ratio (capped at 2): backing-store resolution. Without it the
// canvas renders at CSS resolution and small glyphs look blurry on HiDPI.
const DPR = Math.min(window.devicePixelRatio || 1, 2);

// ─── Adaptive Quality Ladder ───────────────────────────────────
// Four quality tiers. The renderer starts at HIGH (not ultra) and steps
// down QUICKLY when frame time exceeds the 60fps budget (16.7ms), with
// short hysteresis (500ms). Ultra is opt-in only via ?quality=ultra.
const QUALITY = [
  { cw: 14, ch: 22, rain: false, label: 'low'    },
  { cw: 10, ch: 16, rain: true,  label: 'medium' },
  { cw: 7,  ch: 12, rain: true,  label: 'high'   },
  { cw: 5,  ch: 9,  rain: true,  label: 'ultra'  },
];
// Start at HIGH (index 2). Ultra (index 3) only if URL has ?quality=ultra
const URL_ULTRA = /[?&]quality=ultra/.test(location.search);
let quality = URL_ULTRA ? 3 : 2;
let ftAvg = 16.6;        // smoothed frame time (ms), EMA
let lastQChange = 0;     // timestamp of last quality switch

function resize() {
  W = window.innerWidth;
  H = window.innerHeight;

  // Only touch the backing store when the size actually changed — resize()
  // runs every frame, and re-assigning canvas.width/height clears the canvas
  // and forces a full layout each frame.
  const bw = Math.floor(W * DPR);
  const bh = Math.floor(H * DPR);
  if (canvas.width !== bw || canvas.height !== bh) {
    canvas.width = bw;
    canvas.height = bh;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
  }
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);

  cellW = QUALITY[quality].cw;
  cellH = QUALITY[quality].ch;
  COLS = Math.floor(W / cellW);
  ROWS = Math.floor(H / cellH);

  // Rain columns depend on COLS — rebuild when the grid changes.
  if (rainCols.length !== COLS + 20) {
    rainCols.length = 0;
    for (let i = 0; i < COLS + 20; i++) {
      rainCols.push({
        x: i,
        y: Math.random() * ROWS * 2 - ROWS,
        speed: 0.5 + Math.random() * 1.5,
        char: Math.random() > 0.5 ? '0' : '1',
        bright: Math.random() < 0.1,
      });
    }
  }
}

window.addEventListener('resize', resize);
// Initial resize() is deferred until after rainCols initialization below.

// ─── Mouse / Touch Input ──────────────────────────────────────

let mouseX = 0;
let mouseY = 0;
let targetRX = 0;
let targetRY = 0;
let rotX = 0;
let rotY = 0;
let dragging = false;
let lastMX = 0;
let lastMY = 0;
let autoRotY = 0;
// Gaze stays at the very start until the pointer moves — startup view is a
// straight FRONT portrait. After the first interaction the head + eyes follow.
let hasInteracted = false;

function onPointerMove(x: number, y: number) {
  hasInteracted = true;
  mouseX = (x / W) * 2 - 1;  // -1 to 1
  mouseY = (y / H) * 2 - 1;  // -1 to 1

  // Head follows cursor (subtle) — unless currently dragging
  if (!dragging) {
    targetRX = mouseY * 0.25;
    targetRY = mouseX * 0.4;
  } else {
    const dx = (x - lastMX) / W * 3;
    const dy = (y - lastMY) / H * 3;
    targetRY += dx;
    targetRX += dy;
    lastMX = x;
    lastMY = y;
  }
}

canvas.addEventListener('mousemove', (e) => {
  onPointerMove(e.clientX, e.clientY);
});

canvas.addEventListener('mousedown', (e) => {
  dragging = true;
  lastMX = e.clientX;
  lastMY = e.clientY;
});

canvas.addEventListener('mouseup', () => { dragging = false; });
canvas.addEventListener('mouseleave', () => { dragging = false; });

canvas.addEventListener('touchstart', (e) => {
  e.preventDefault();
  // Touch = pointer tracking (head + eyes follow the finger), not drag-rotate.
  const t = e.touches[0];
  onPointerMove(t.clientX, t.clientY);
}, { passive: false });

canvas.addEventListener('touchmove', (e) => {
  e.preventDefault();
  const t = e.touches[0];
  onPointerMove(t.clientX, t.clientY);
}, { passive: false });

canvas.addEventListener('touchend', () => { dragging = false; });

// ─── Rain Background ───────────────────────────────────────────

interface RainColumn {
  x: number;
  y: number;
  speed: number;
  char: string;
  bright: boolean;
}

const rainCols: RainColumn[] = [];
for (let i = 0; i < COLS + 20; i++) {
  rainCols.push({
    x: i,
    y: Math.random() * ROWS * 2 - ROWS,
    speed: 0.5 + Math.random() * 1.5,
    char: Math.random() > 0.5 ? '0' : '1',
    bright: Math.random() < 0.1,
  });
}

// First layout — after rainCols exists (resize() may rebuild the rain array).
resize();

// ─── Debug hook (harmless; exposes state for dev tools) ─────────
// Visual test modes (deterministic, for screenshot/golden checks):
//   ?view=front      freeze head facing forward (no follow, no auto-rotate)
//   ?view=profile    freeze at a 3/4 profile
//   ?view=back       freeze facing away
const URL_VIEW = (() => {
  const m = location.search.match(/[?&]view=([a-z]+)/);
  return m ? m[1] : null;
})();

// ?bench — scripted 360° sweep benchmark: measures fps/frame-time percentiles
// over ~8 seconds, renders an on-screen report and exposes window.__benchResult.
const URL_BENCH = /[?&]bench/.test(location.search);
const BENCH_SECONDS = 8;
const BENCH_WARMUP = 0.7;   // seconds skipped (tab warmup, shader/JIT warmup)
let benchT0 = -1;
let benchDone = false;
let benchSamples: number[] = [];
let benchReport: string[] = [];

// FPS HUD state
let fpsShown = 60;
let fpsLastDraw = 0;

declare global {
  interface Window { __faceState?: unknown }
}
(window as any).__faceState = () => ({ mouseX, mouseY, rotX, rotY, targetRX, targetRY, dragging, view: URL_VIEW });

// ─── Render Loop ───────────────────────────────────────────────

const mesh = createFaceMesh();
let prevTime = performance.now();

function frame(now: number) {
  const dt = Math.min((now - prevTime) / 1000, 0.1);
  prevTime = now;
  const time = now / 1000;

  resize();

  // ── FPS sampling + adaptive quality (target: never below 60fps) ──
  ftAvg = ftAvg * 0.92 + (dt * 1000) * 0.08;
  if (!URL_BENCH && now - lastQChange > 2000) {
    if (ftAvg > 19 && quality > 0) {
      quality--; lastQChange = now; resize();
    } else if (ftAvg < 13.5 && quality < QUALITY.length - 1) {
      quality++; lastQChange = now; resize();
    }
  }
  if (now - fpsLastDraw > 250) {
    fpsShown = 1000 / Math.max(ftAvg, 0.01);
    fpsLastDraw = now;
  }

  if (URL_BENCH && !benchDone) {
    // Scripted benchmark: one full 360° yaw sweep at constant speed.
    if (benchT0 < 0) benchT0 = now;
    const bt = (now - benchT0) / 1000;
    rotX = 0;
    rotY = (bt / BENCH_SECONDS) * Math.PI * 2;
    targetRX = 0;
    targetRY = rotY;
    if (bt > BENCH_WARMUP) benchSamples.push(dt);
    if (bt >= BENCH_SECONDS) {
      benchDone = true;
      const sorted = benchSamples.slice().sort((a, b) => a - b);
      const avg = sorted.reduce((s, v) => s + v, 0) / Math.max(1, sorted.length);
      const pct = (p: number) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))];
      benchReport = [
        `BENCH RESULT (${benchSamples.length} frames, 1 full turn)`,
        `avg      ${(1000 / avg).toFixed(1)} fps  (${(avg * 1000).toFixed(2)} ms)`,
        `min      ${(1 / sorted[sorted.length - 1]).toFixed(1)} fps  (worst frame ${(sorted[sorted.length - 1] * 1000).toFixed(2)} ms)`,
        `p95      ${(1000 / pct(0.95)).toFixed(1)} fps`,
        `p99      ${(1000 / pct(0.99)).toFixed(1)} fps`,
        `quality  ${QUALITY[quality].label} (${QUALITY[quality].cw}x${QUALITY[quality].ch} cells)`,
        `budget   ${ftAvg > 16.7 ? 'FAIL: below 60fps — quality should step down' : 'PASS: >= 60fps sustained'}`,
      ];
      (window as any).__benchResult = { frames: benchSamples.length, avgFps: 1000 / avg, minFps: 1 / sorted[sorted.length - 1], quality: QUALITY[quality].label, pass: avg <= 16.7 };
    }
  } else if (URL_VIEW === 'front') {
    // Frozen front view: ignore follow and auto-rotation entirely.
    rotX = 0;
    rotY = 0;
    targetRX = 0;
    targetRY = 0;
  } else if (URL_VIEW === 'back') {
    rotX = 0;
    rotY = Math.PI;
    targetRX = 0;
    targetRY = Math.PI;
  } else if (URL_VIEW === 'profile') {
    rotX = 0;
    rotY = -0.7;
    targetRX = 0;
    targetRY = -0.7;
  } else {
    // Smooth rotation toward target
    const lerpSpeed = dragging ? 8 : 3;
    rotX += (targetRX - rotX) * Math.min(1, dt * lerpSpeed);
    rotY += (targetRY - rotY) * Math.min(1, dt * lerpSpeed);

    // Idle auto-rotation only AFTER the user has interacted at least once —
    // the startup view is a straight FRONT portrait, dead centered.
    if (!dragging && hasInteracted) {
      autoRotY += dt * 0.3;
      const autoTarget = targetRY + Math.sin(autoRotY) * 0.15;
      rotY += (autoTarget - rotY) * dt * 0.5;
    }
  }

  // Face parameters (expressions)
  const params = computeParams(time, mouseX, mouseY, dragging);

  // Deform mesh
  deformMesh(mesh, params);

  // Project to screen (cellAspect = cellWidth/cellHeight for proportional head)
  // Eyes (pupils + irises) track the pointer/finger via gaze.
  const result = projectAndShade(mesh, rotX, rotY, 0, COLS, ROWS, cellW / cellH,
    { gx: mouseX, gy: mouseY }, 'color' as RenderMode,
    ((new URLSearchParams(location.search)).get('ramp') as GlyphRamp) || 'quarter');

  // Clear canvas
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);

  // Set font
  ctx.font = `${cellH}px "Courier New", monospace`;
  ctx.textBaseline = 'top';

  // Update rain
  for (const col of rainCols) {
    col.y += col.speed * dt * 10;
    if (col.y > ROWS + 5) {
      col.y = -2 - Math.random() * 10;
      col.x = Math.floor(Math.random() * COLS);
      col.char = Math.random() > 0.5 ? '0' : '1';
      col.speed = 0.5 + Math.random() * 1.5;
      col.bright = Math.random() < 0.1;
    }
  }

  // Draw cells
  for (let j = 0; j < ROWS; j++) {
    for (let i = 0; i < COLS; i++) {
      const cell = result.cells[j]?.[i];
      const ch = cell?.ch || ' ';

      if (ch !== ' ' && ch !== '\0') {
        // Face pixel — glyph + tone come from face3d (bayer-dithered binary
        // ramp), the browser just blits them.
        ctx.fillStyle = `rgb(${cell!.r},${cell!.g},${cell!.b})`;
        ctx.fillText(ch, i * cellW, j * cellH);
      } else {
        // Background rain — hidden in deterministic test views
        if (URL_VIEW) continue;
        if (!QUALITY[quality].rain) continue; // low tier: rain disabled
        const rc = rainCols[i % rainCols.length];
        const ry = Math.floor(rc.y);
        if (ry === j && i < rainCols.length) {
          ctx.fillStyle = rc.bright ? '#0f0' : '#030';
          ctx.fillText(rc.char, i * cellW, j * cellH);
        } else if ((i + j * 3) % 11 === 0 && Math.sin(time * 2 + i * 0.5 + j * 0.3) > 0.95) {
          ctx.fillStyle = '#020';
          ctx.fillText(Math.random() > 0.5 ? '0' : '1', i * cellW, j * cellH);
        }
      }
    }
  }

  // Title (hidden in deterministic test views)
  if (!URL_VIEW) {
    ctx.fillStyle = '#0f0';
    ctx.font = `bold ${cellH}px "Courier New", monospace`;
    const title = 'M A T R I X   F A C E';
    const titleX = (W - ctx.measureText(title).width) / 2;
    ctx.fillText(title, titleX, 8);

    // Instructions
    ctx.fillStyle = '#060';
    ctx.font = `${Math.floor(cellH * 0.7)}px "Courier New", monospace`;
    const hint = 'Move mouse to look around · Click+drag to rotate';
    const hintX = (W - ctx.measureText(hint).width) / 2;
    ctx.fillText(hint, hintX, H - cellH - 4);
  }

  // FPS HUD (top-left) + benchmark report
  ctx.textBaseline = 'top';
  ctx.font = `${Math.floor(cellH * 0.7)}px "Courier New", monospace`;
  if (benchDone) {
    const lh = Math.floor(cellH * 0.9);
    benchReport.forEach((line, k) => {
      ctx.fillStyle = line.includes('FAIL') ? '#f55' : line.includes('PASS') ? '#0f0' : '#0c0';
      ctx.fillText(line, 10, 8 + k * lh);
    });
  } else {
    const q = QUALITY[quality];
    const fpsColor = fpsShown >= 58 ? '#0f0' : fpsShown >= 45 ? '#dd0' : '#f55';
    ctx.fillStyle = fpsColor;
    ctx.fillText(`FPS ${fpsShown.toFixed(0)}  ·  ${q.label} ${COLS}x${ROWS}  ·  ${ftAvg.toFixed(1)}ms`, 10, 8);
  }

  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
