/**
 * terminal.ts — High-Fidelity 3D Matrix Neural Face for Linux Console / SSH.
 *
 * Direct triangle rasterization of Pinscreen Generic Head model (10,822 vertices, 21,510 triangles).
 * Features:
 *   - Mathematical dead-centering at (0, 0.18, 0)
 *   - 3D mouse drag rotation with elastic spring return (springReturn physics)
 *   - Continuous cursor gaze tracking & organic breathing physics
 *   - Multi-persona switcher: [1] Eva, [2] Adam, [3] Neo, [4] Rain
 *   - Dual visual modes: [v/tab] Matrix Katakana Code Mode & Ultra-HD TrueColor Solid Mode
 *   - Background cascading Matrix digital rain
 *   - Dynamic real FPS & frame time measurement
 *   - Differential ANSI screen redraw (zero flicker)
 */

import { HEAD_POS, HEAD_NRM, HEAD_TRI, HEAD_N, HEAD_TRI_COUNT } from './headmodel.js';
import { detectMode, ansiSet, type RenderMode } from './capability.js';
import { WebSocket } from 'ws';

const stdout = process.stdout;
const stdin = process.stdin;

// ─── Real-Time WebSocket Bridge Synchronization ────────────────
let wsBridge: WebSocket | null = null;
const BRIDGE_PORT = parseInt(process.env.BRIDGE_PORT || '8094', 10);

function sendBridge(msg: any) {
  if (wsBridge && wsBridge.readyState === WebSocket.OPEN) {
    try {
      wsBridge.send(JSON.stringify(msg));
    } catch (_) {}
  }
}

function initBridge() {
  try {
    const ws = new WebSocket(`ws://127.0.0.1:${BRIDGE_PORT}`);
    ws.on('open', () => {
      wsBridge = ws;
    });
    ws.on('message', (data: Buffer) => {
      try {
        const msg = JSON.parse(data.toString('utf8'));
        if (msg.type === 'variant' && msg.variant && VARIANT_PALETTES[msg.variant as TermVariant]) {
          currentVariant = msg.variant as TermVariant;
          currentPersona = currentVariant;
          if (msg.variant === 'solid') visualMode = 'solid';
          else if (msg.variant === 'wireframe') visualMode = 'wireframe';
          else visualMode = 'matrix';
          prevCells = null;
        } else if (msg.type === 'recenter') {
          rotX = 0; rotY = 0; dragRotX = 0; dragRotY = 0; mouseX = 0; mouseY = 0;
        } else if (msg.type === 'gaze' && typeof msg.x === 'number' && typeof msg.y === 'number') {
          mouseX = Math.max(-1.5, Math.min(1.5, msg.x));
          mouseY = Math.max(-1.5, Math.min(1.5, msg.y));
          hasInteracted = true;
        }
      } catch (_) {}
    });
    ws.on('error', () => {});
    ws.on('close', () => {
      wsBridge = null;
      setTimeout(initBridge, 3500);
    });
  } catch (_) {
    setTimeout(initBridge, 5000);
  }
}

function getTermSize(): [number, number] {
  const cols = stdout.columns || 90;
  const rows = stdout.rows || 32;
  return [cols, rows];
}

function hideCursor() { stdout.write('\x1b[?25l'); }
function showCursor() { stdout.write('\x1b[?25h'); }
function clearScreen() { stdout.write('\x1b[2J\x1b[H'); }

function enableRawMode() {
  if (stdin.isTTY) {
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');
  }
  // Enable SGR extended mouse tracking (motion + clicks)
  stdout.write('\x1b[?1003h');
  stdout.write('\x1b[?1006h');
}

function disableRawMode() {
  stdout.write('\x1b[?1003l');
  stdout.write('\x1b[?1006l');
  if (stdin.isTTY) {
    stdin.setRawMode(false);
  }
  showCursor();
}

// ─── Eva 4D Variants & Palette ──────────────────────────────────

export type TermVariant = 'phosphor' | 'hologram' | 'electra' | 'solar' | 'cascade' | 'solid' | 'wireframe';
let currentVariant: TermVariant = 'phosphor';
let showMenuOverlay = false;

export interface VariantPalette {
  id: TermVariant;
  name: string;
  primary: [number, number, number];
  highlight: [number, number, number];
  dark: [number, number, number];
  rain: [number, number, number];
  rainSpeed: number;
}

export const VARIANT_PALETTES: Record<TermVariant, VariantPalette> = {
  phosphor: {
    id: 'phosphor',
    name: 'EVA 4D (PHOSPHOR GREEN)',
    primary: [0, 255, 102],
    highlight: [255, 255, 255],
    dark: [0, 42, 12],
    rain: [0, 230, 80],
    rainSpeed: 1.0,
  },
  hologram: {
    id: 'hologram',
    name: 'EVA 4D (VECTOR HOLOGRAM 60FPS)',
    primary: [0, 255, 190],
    highlight: [220, 255, 245],
    dark: [0, 35, 28],
    rain: [0, 210, 160],
    rainSpeed: 0.9,
  },
  electra: {
    id: 'electra',
    name: 'EVA 4D (ELECTRA CYAN)',
    primary: [0, 240, 255],
    highlight: [255, 255, 255],
    dark: [0, 25, 50],
    rain: [0, 210, 255],
    rainSpeed: 1.25,
  },
  solar: {
    id: 'solar',
    name: 'EVA 4D (SOLAR AMBER)',
    primary: [255, 180, 0],
    highlight: [255, 245, 220],
    dark: [45, 20, 2],
    rain: [255, 160, 10],
    rainSpeed: 0.9,
  },
  cascade: {
    id: 'cascade',
    name: 'EVA 4D (RAIN CASCADE)',
    primary: [16, 255, 64],
    highlight: [230, 255, 235],
    dark: [0, 30, 6],
    rain: [50, 255, 120],
    rainSpeed: 1.8,
  },
  solid: {
    id: 'solid',
    name: 'EVA 4D (SOLID HD BLOCKS)',
    primary: [0, 255, 140],
    highlight: [255, 255, 255],
    dark: [0, 35, 15],
    rain: [0, 220, 90],
    rainSpeed: 1.1,
  },
  wireframe: {
    id: 'wireframe',
    name: 'EVA 4D (CYBER WIREFRAME)',
    primary: [60, 210, 255],
    highlight: [255, 255, 255],
    dark: [5, 25, 45],
    rain: [40, 180, 240],
    rainSpeed: 1.1,
  },
};

// Aliases for backwards compatibility
const PALETTES = VARIANT_PALETTES;
type TermPersona = TermVariant;
let currentPersona: TermVariant = currentVariant;

// ─── Render Modes ──────────────────────────────────────────────

type VisualMode = 'matrix' | 'solid' | 'wireframe';
let visualMode: VisualMode = 'matrix'; // default Matrix Code

// Parse CLI flags for direct launch
for (const arg of process.argv.slice(2)) {
  const clean = arg.toLowerCase().replace(/^--?/, '');
  if (clean === 'phosphor' || clean === 'eva') currentVariant = 'phosphor';
  else if (clean === 'hologram' || clean === 'eco') currentVariant = 'hologram';
  else if (clean === 'electra' || clean === 'neo') currentVariant = 'electra';
  else if (clean === 'solar' || clean === 'adam') currentVariant = 'solar';
  else if (clean === 'cascade' || clean === 'rain') currentVariant = 'cascade';
  else if (clean === 'solid' || clean === 'hd') { currentVariant = 'solid'; visualMode = 'solid'; }
  else if (clean === 'wireframe' || clean === 'wire') { currentVariant = 'wireframe'; visualMode = 'wireframe'; }
}

const MATRIX_RAMP = '  .:-=+10AZXﾊﾐﾋｳｼﾅﾓﾆｻﾜﾂｵ#%@';
const WIREFRAME_RAMP = '  ..::--==++//\\\\||##@@';

// ─── Interactive State & Spring Physics ─────────────────────────

let mouseX = 0;
let mouseY = 0;
let dragRotX = 0;
let dragRotY = 0;
let rotX = 0;
let rotY = 0;
let dragging = false;
let lastMX = 0;
let lastMY = 0;
let buttonDown = false;
let hasInteracted = false;
let termW = 90;
let termH = 32;

// Natural blinking state
let blinkAmount = 0;
let lastBlinkTime = 0;
let nextBlinkInterval = 2800;

// ─── Matrix Rain System ────────────────────────────────────────

interface RainColumn {
  y: number;
  speed: number;
  chars: string[];
}

let rainColumns: RainColumn[] = [];
const RAIN_GLYPHS = '日ﾊﾐﾋｰｳｼﾅﾓﾆｻﾜﾂｵ0123456789+*=AZX';

function initRain(cols: number) {
  rainColumns = [];
  for (let i = 0; i < cols; i++) {
    const chars: string[] = [];
    for (let c = 0; c < 20; c++) {
      chars.push(RAIN_GLYPHS[Math.floor(Math.random() * RAIN_GLYPHS.length)]);
    }
    rainColumns.push({
      y: Math.random() * 50 - 40,
      speed: 0.2 + Math.random() * 0.7,
      chars,
    });
  }
}

function updateRain(dt: number, cols: number, rows: number) {
  while (rainColumns.length < cols) {
    const chars: string[] = [];
    for (let c = 0; c < 20; c++) {
      chars.push(RAIN_GLYPHS[Math.floor(Math.random() * RAIN_GLYPHS.length)]);
    }
    rainColumns.push({ y: Math.random() * rows, speed: 0.2 + Math.random() * 0.7, chars });
  }

  for (let i = 0; i < cols; i++) {
    const col = rainColumns[i];
    col.y += col.speed * dt * 18;
    if (col.y > rows + 15) {
      col.y = -Math.random() * 10 - 2;
      col.speed = 0.2 + Math.random() * 0.7;
      if (Math.random() < 0.2) {
        col.chars[0] = RAIN_GLYPHS[Math.floor(Math.random() * RAIN_GLYPHS.length)];
      }
    }
  }
}

// ─── Input Parsing ─────────────────────────────────────────────

let inputBuffer = '';

function handleInput(data: Buffer) {
  const str = data.toString('utf8');

  // Keystrokes
  if (str === '\u0003' || str.toLowerCase() === 'q') {
    disableRawMode();
    clearScreen();
    process.exit(0);
  }
  if (str === ' ' || str.toLowerCase() === 'm' || str.toLowerCase() === 'ь') {
    showMenuOverlay = !showMenuOverlay;
    prevCells = null;
    clearScreen();
    return;
  }
  if (str === '1') { currentVariant = 'phosphor'; currentPersona = 'phosphor'; visualMode = 'matrix'; sendBridge({ type: 'variant', variant: 'phosphor' }); }
  else if (str === '2') { currentVariant = 'hologram'; currentPersona = 'hologram'; visualMode = 'matrix'; sendBridge({ type: 'variant', variant: 'hologram' }); }
  else if (str === '3') { currentVariant = 'electra'; currentPersona = 'electra'; visualMode = 'matrix'; sendBridge({ type: 'variant', variant: 'electra' }); }
  else if (str === '4') { currentVariant = 'solar'; currentPersona = 'solar'; visualMode = 'matrix'; sendBridge({ type: 'variant', variant: 'solar' }); }
  else if (str === '5') { currentVariant = 'cascade'; currentPersona = 'cascade'; visualMode = 'matrix'; sendBridge({ type: 'variant', variant: 'cascade' }); }
  else if (str === '6') { currentVariant = 'solid'; currentPersona = 'solid'; visualMode = 'solid'; prevCells = null; clearScreen(); sendBridge({ type: 'variant', variant: 'solid' }); }
  else if (str === '7') { currentVariant = 'wireframe'; currentPersona = 'wireframe'; visualMode = 'wireframe'; prevCells = null; clearScreen(); sendBridge({ type: 'variant', variant: 'wireframe' }); }
  else if (str.toLowerCase() === 'v' || str === '\t') {
    if (visualMode === 'matrix') visualMode = 'solid';
    else if (visualMode === 'solid') visualMode = 'wireframe';
    else visualMode = 'matrix';
    prevCells = null;
    clearScreen();
    sendBridge({ type: 'variant', variant: currentVariant });
  }
  else if (str.toLowerCase() === 'r' || str.toLowerCase() === 'к') {
    rotX = 0; rotY = 0; dragRotX = 0; dragRotY = 0; mouseX = 0; mouseY = 0;
    sendBridge({ type: 'recenter' });
  }

  inputBuffer += str;

  // SGR Mouse Protocol: ESC [ < Cb ; Cx ; Cy M/m
  const mouseRegex = /\x1b\[<(\d+);(\d+);(\d+)([Mm])/g;
  let match;
  while ((match = mouseRegex.exec(inputBuffer)) !== null) {
    const rawBtn = parseInt(match[1]);
    const x = parseInt(match[2]) - 1;
    const y = parseInt(match[3]) - 1;
    const isRelease = match[4] === 'm';
    const btn = rawBtn >= 32 ? rawBtn - 32 : rawBtn;

    if (isRelease || rawBtn % 32 >= 3) {
      if (btn === 0) {
        dragging = false;
        buttonDown = false;
      }
    } else if (rawBtn === 0 || rawBtn === 32) {
      if (rawBtn === 0 && !buttonDown) {
        dragging = true;
        buttonDown = true;
        lastMX = x;
        lastMY = y;
      } else if (rawBtn === 32) {
        dragging = false;
        buttonDown = false;
      } else if (dragging) {
        const dx = ((x - lastMX) / termW) * 2.8;
        const dy = ((y - lastMY) / termH) * 2.8;
        dragRotY += dx;
        dragRotX += dy;
        lastMX = x;
        lastMY = y;
      }
    }

    mouseX = (x / termW) * 2 - 1;
    mouseY = (y / termH) * 2 - 1;
    hasInteracted = true;

    inputBuffer = inputBuffer.substring(match.index + match[0].length);
  }

  if (inputBuffer.startsWith('\x1b') && !inputBuffer.match(/\x1b\[</)) {
    if (inputBuffer.length > 1) inputBuffer = '';
  }
  if (inputBuffer.length > 50) {
    inputBuffer = inputBuffer.slice(-20);
  }
}

stdin.on('data', (data: Buffer) => {
  handleInput(data);
});

// ─── Terminal Resize ───────────────────────────────────────────

process.on('resize', () => {
  [termW, termH] = getTermSize();
  initRain(termW);
  prevCells = null;
  clearScreen();
});

// ─── High-Performance 3D Triangle Rasterizer ───────────────────

// Reusable vertex projection buffers
const sX = new Float32Array(HEAD_N);
const sY = new Float32Array(HEAD_N);
const vZ = new Float32Array(HEAD_N);
const nX = new Float32Array(HEAD_N);
const nY = new Float32Array(HEAD_N);
const nZ = new Float32Array(HEAD_N);

// Frame buffers
let maxGridSize = 300 * 200;
let depthBuf = new Float32Array(maxGridSize);
let normBufX = new Float32Array(maxGridSize);
let normBufY = new Float32Array(maxGridSize);
let normBufZ = new Float32Array(maxGridSize);

function ensureBuffers(size: number) {
  if (size > maxGridSize) {
    maxGridSize = size + 5000;
    depthBuf = new Float32Array(maxGridSize);
    normBufX = new Float32Array(maxGridSize);
    normBufY = new Float32Array(maxGridSize);
    normBufZ = new Float32Array(maxGridSize);
  }
}

// Directional Lights
const KEY_DIR = [0.42, 0.52, 0.74];
const keyLen = Math.hypot(...KEY_DIR);
KEY_DIR[0] /= keyLen; KEY_DIR[1] /= keyLen; KEY_DIR[2] /= keyLen;

const FILL_DIR = [-0.50, 0.20, 0.45];
const fillLen = Math.hypot(...FILL_DIR);
FILL_DIR[0] /= fillLen; FILL_DIR[1] /= fillLen; FILL_DIR[2] /= fillLen;

// Previous frame cell cache for differential redraw
let prevCells: string[] | null = null;

// Performance timing
let prevTime = performance.now();
let dtMsAvg = 33;
let cpuMsAvg = 10;

function renderFrame() {
  const now = performance.now();
  const dt = Math.min((now - prevTime) / 1000, 0.1);
  prevTime = now;
  const time = now / 1000;
  const cpuStart = performance.now();

  const [w, h] = getTermSize();
  if (w !== termW || h !== termH) {
    termW = w;
    termH = h;
    initRain(termW);
    prevCells = null;
    clearScreen();
  }

  // 1. Elastic Spring Return to Center
  if (!dragging) {
    dragRotX *= 0.88;
    dragRotY *= 0.88;
    if (Math.abs(dragRotX) < 0.0001) dragRotX = 0;
    if (Math.abs(dragRotY) < 0.0001) dragRotY = 0;
  }

  // Gaze tracking + breathing
  const hoverX = -mouseY * 0.25;
  const hoverY = mouseX * 0.40;
  const targetRotX = hoverX + dragRotX;
  let targetRotY = hoverY + dragRotY;

  if (!dragging && hasInteracted) {
    targetRotY += Math.sin(time * 0.8) * 0.04;
  }

  const lerpSpeed = dragging ? 10 : 5;
  rotX += (targetRotX - rotX) * Math.min(1, dt * lerpSpeed);
  rotY += (targetRotY - rotY) * Math.min(1, dt * lerpSpeed);

  // Blinking physics
  if (now - lastBlinkTime > nextBlinkInterval) {
    blinkAmount = 1.0;
    lastBlinkTime = now;
    nextBlinkInterval = 2500 + Math.random() * 3200;
  }
  if (blinkAmount > 0) {
    blinkAmount -= dt * 7.5;
    if (blinkAmount < 0) blinkAmount = 0;
  }

  // Grid dimensions
  const isSolid = visualMode === 'solid';
  const gridW = termW;
  const gridH = isSolid ? termH * 2 : termH;
  const cellAspect = isSolid ? 1.0 : 0.50; // ratio of width to height per sample cell

  ensureBuffers(gridW * gridH);
  depthBuf.fill(-999, 0, gridW * gridH);

  // 2. Camera & Scaling (Dead-Center between Title Bar row 0 and Hint Bar row termH-1)
  const headScale = Math.min(gridW * 0.27, gridH * 0.56);
  const sx = (headScale / cellAspect) * 1.05;
  const sy = headScale;
  const camZ = 2.45;

  const cosY = Math.cos(rotY), sinY = Math.sin(rotY);
  const cosX = Math.cos(rotX), sinX = Math.sin(rotX);

  // 3. Transform Vertices
  const breathY = Math.sin(time * 1.8) * 0.008;

  for (let i = 0; i < HEAD_N; i++) {
    let x = -HEAD_POS[i * 3];
    let y = HEAD_POS[i * 3 + 1];
    let z = -HEAD_POS[i * 3 + 2];
    let nx = -HEAD_NRM[i * 3];
    let ny = HEAD_NRM[i * 3 + 1];
    let nz = -HEAD_NRM[i * 3 + 2];

    // Blink deformation on upper eyelids
    if (blinkAmount > 0 && y > 0.30 && y < 0.38 && z > 0.32) {
      const eyeDist = Math.hypot(Math.abs(x) - 0.137, y - 0.336);
      if (eyeDist < 0.065) {
        y -= blinkAmount * (1 - eyeDist / 0.065) * 0.024;
      }
    }

    // Centered rotation around facial midpoint
    y += 0.05;
    // Yaw (Y)
    const x1 = x * cosY + z * sinY;
    const z1 = -x * sinY + z * cosY;
    const nx1 = nx * cosY + nz * sinY;
    const nz1 = -nx * sinY + nz * cosY;
    // Pitch (X)
    const y2 = y * cosX - z1 * sinX;
    const z2 = y * sinX + z1 * cosX;
    const ny2 = ny * cosX - nz1 * sinX;
    const nz2 = ny * sinX + nz1 * cosX;

    const finalY = y2 - 0.05 + breathY;
    vZ[i] = z2;
    nX[i] = nx1;
    nY[i] = ny2;
    nZ[i] = nz2;

    const dist = camZ - z2;
    const pers = camZ / Math.max(0.1, dist);
    sX[i] = gridW / 2 + x1 * sx * pers;
    sY[i] = gridH / 2 - (finalY + 0.05) * sy * pers;
  }

  // 4. Triangle Rasterization with Z-Buffer
  for (let t = 0; t < HEAD_TRI_COUNT; t++) {
    const i0 = HEAD_TRI[t * 3], i1 = HEAD_TRI[t * 3 + 1], i2 = HEAD_TRI[t * 3 + 2];
    const x0 = sX[i0], y0 = sY[i0], z0 = vZ[i0];
    const x1 = sX[i1], y1 = sY[i1], z1 = vZ[i1];
    const x2 = sX[i2], y2 = sY[i2], z2 = vZ[i2];

    // Backface culling in screen space
    const area = (x1 - x0) * (y2 - y0) - (x2 - x0) * (y1 - y0);
    if (area >= 0) continue;

    const minI = Math.max(0, Math.floor(Math.min(x0, x1, x2)));
    const maxI = Math.min(gridW - 1, Math.ceil(Math.max(x0, x1, x2)));
    const minJ = Math.max(0, Math.floor(Math.min(y0, y1, y2)));
    const maxJ = Math.min(gridH - 1, Math.ceil(Math.max(y0, y1, y2)));

    const invArea = 1 / area;
    for (let j = minJ; j <= maxJ; j++) {
      const py = j + 0.5;
      const rowBase = j * gridW;
      const w0row = (x2 - x1) * (py - y1);
      const w1row = (x0 - x2) * (py - y2);
      const w2row = (x1 - x0) * (py - y0);
      const dx0 = -(y2 - y1);
      const dx1 = -(y0 - y2);
      const dx2 = -(y1 - y0);

      for (let i = minI; i <= maxI; i++) {
        const px = i + 0.5;
        const w0 = w0row + dx0 * (px - x1);
        const w1 = w1row + dx1 * (px - x2);
        const w2 = w2row + dx2 * (px - x0);

        const a0 = w0 * invArea;
        const a1 = w1 * invArea;
        const a2 = w2 * invArea;
        if (a0 < -0.01 || a1 < -0.01 || a2 < -0.01) continue;

        const z = a0 * z0 + a1 * z1 + a2 * z2;
        const idx = rowBase + i;
        if (z > depthBuf[idx]) {
          depthBuf[idx] = z;
          normBufX[idx] = a0 * nX[i0] + a1 * nX[i1] + a2 * nX[i2];
          normBufY[idx] = a0 * nY[i0] + a1 * nY[i1] + a2 * nY[i2];
          normBufZ[idx] = a0 * nZ[i0] + a1 * nZ[i1] + a2 * nZ[i2];
        }
      }
    }
  }

  // 5. Update Matrix Rain
  updateRain(dt, termW, termH);

  // 6. Color & Glyph Resolution
  const palette = PALETTES[currentPersona];
  const totalCells = termW * termH;
  const curCells: string[] = new Array(totalCells);

  if (isSolid) {
    // ─── Mode 2: Ultra-HD TrueColor Solid Half-Blocks (▀) ───────
    for (let j = 0; j < termH; j++) {
      const rowT = j * 2;
      const rowB = j * 2 + 1;

      for (let i = 0; i < termW; i++) {
        const idxT = rowT * gridW + i;
        const idxB = rowB * gridW + i;
        const hasT = depthBuf[idxT] > -990;
        const hasB = depthBuf[idxB] > -990;
        const outIdx = j * termW + i;

        if (!hasT && !hasB) {
          // Digital rain background in half-block mode
          const rain = rainColumns[i % rainColumns.length];
          const dropY = Math.floor(rain.y);
          if (rowT === dropY) {
            curCells[outIdx] = `\x1b[38;2;${palette.highlight[0]};${palette.highlight[1]};${palette.highlight[2]}m▀`;
          } else if (rowT < dropY && rowT >= dropY - 7) {
            const decay = 1 - (dropY - rowT) / 7;
            const r = Math.floor(palette.rain[0] * decay * 0.4);
            const g = Math.floor(palette.rain[1] * decay * 0.4);
            const b = Math.floor(palette.rain[2] * decay * 0.4);
            curCells[outIdx] = `\x1b[38;2;${r};${g};${b}m▀`;
          } else {
            curCells[outIdx] = ' ';
          }
        } else {
          // Shaded face pixels
          let rT = 0, gT = 0, bT = 0;
          let rB = 0, gB = 0, bB = 0;

          if (hasT) {
            let nx = normBufX[idxT], ny = normBufY[idxT], nz = normBufZ[idxT];
            const nl = Math.hypot(nx, ny, nz) || 1;
            nx /= nl; ny /= nl; nz /= nl;
            const dot = Math.max(0, nx * KEY_DIR[0] + ny * KEY_DIR[1] + nz * KEY_DIR[2]);
            const fill = Math.max(0, nx * FILL_DIR[0] + ny * FILL_DIR[1] + nz * FILL_DIR[2]);
            const spec = Math.pow(Math.max(0, nz), 14);
            const inten = Math.max(0, Math.min(1, 0.10 + 0.65 * dot + 0.15 * fill + 0.35 * spec));

            if (inten > 0.72) {
              const f = (inten - 0.72) / 0.28;
              rT = Math.floor(palette.primary[0] * (1 - f) + palette.highlight[0] * f);
              gT = Math.floor(palette.primary[1] * (1 - f) + palette.highlight[1] * f);
              bT = Math.floor(palette.primary[2] * (1 - f) + palette.highlight[2] * f);
            } else {
              const f = inten / 0.72;
              rT = Math.floor(palette.dark[0] * (1 - f) + palette.primary[0] * f);
              gT = Math.floor(palette.dark[1] * (1 - f) + palette.primary[1] * f);
              bT = Math.floor(palette.dark[2] * (1 - f) + palette.primary[2] * f);
            }
          }

          if (hasB) {
            let nx = normBufX[idxB], ny = normBufY[idxB], nz = normBufZ[idxB];
            const nl = Math.hypot(nx, ny, nz) || 1;
            nx /= nl; ny /= nl; nz /= nl;
            const dot = Math.max(0, nx * KEY_DIR[0] + ny * KEY_DIR[1] + nz * KEY_DIR[2]);
            const fill = Math.max(0, nx * FILL_DIR[0] + ny * FILL_DIR[1] + nz * FILL_DIR[2]);
            const spec = Math.pow(Math.max(0, nz), 14);
            const inten = Math.max(0, Math.min(1, 0.10 + 0.65 * dot + 0.15 * fill + 0.35 * spec));

            if (inten > 0.72) {
              const f = (inten - 0.72) / 0.28;
              rB = Math.floor(palette.primary[0] * (1 - f) + palette.highlight[0] * f);
              gB = Math.floor(palette.primary[1] * (1 - f) + palette.highlight[1] * f);
              bB = Math.floor(palette.primary[2] * (1 - f) + palette.highlight[2] * f);
            } else {
              const f = inten / 0.72;
              rB = Math.floor(palette.dark[0] * (1 - f) + palette.primary[0] * f);
              gB = Math.floor(palette.dark[1] * (1 - f) + palette.primary[1] * f);
              bB = Math.floor(palette.dark[2] * (1 - f) + palette.primary[2] * f);
            }
          }

          if (hasT && !hasB) {
            curCells[outIdx] = `\x1b[38;2;${rT};${gT};${bT}m▀`;
          } else if (!hasT && hasB) {
            curCells[outIdx] = `\x1b[38;2;${rB};${gB};${bB}m▄`;
          } else {
            curCells[outIdx] = `\x1b[38;2;${rT};${gT};${bT};48;2;${rB};${gB};${bB}m▀`;
          }
        }
      }
    }
  } else {
    // ─── Mode 1: True Matrix Katakana & Code Grid ──────────────
    for (let j = 0; j < termH; j++) {
      for (let i = 0; i < termW; i++) {
        const idx = j * gridW + i;
        const outIdx = j * termW + i;
        const hasSurface = depthBuf[idx] > -990;

        if (hasSurface) {
          let nx = normBufX[idx], ny = normBufY[idx], nz = normBufZ[idx];
          const nl = Math.hypot(nx, ny, nz) || 1;
          nx /= nl; ny /= nl; nz /= nl;

          const dot = Math.max(0, nx * KEY_DIR[0] + ny * KEY_DIR[1] + nz * KEY_DIR[2]);
          const fill = Math.max(0, nx * FILL_DIR[0] + ny * FILL_DIR[1] + nz * FILL_DIR[2]);
          const spec = Math.pow(Math.max(0, nz), 14);
          const inten = Math.max(0, Math.min(1, 0.08 + 0.70 * dot + 0.18 * fill + 0.32 * spec));

          // Character index
          const ramp = visualMode === 'wireframe' ? WIREFRAME_RAMP : MATRIX_RAMP;
          const charIdx = Math.floor(inten * (ramp.length - 1));
          const char = ramp[charIdx];

          // 24-bit TrueColor
          let r = 0, g = 0, b = 0;
          if (inten > 0.75) {
            const f = (inten - 0.75) / 0.25;
            r = Math.floor(palette.primary[0] * (1 - f) + palette.highlight[0] * f);
            g = Math.floor(palette.primary[1] * (1 - f) + palette.highlight[1] * f);
            b = Math.floor(palette.primary[2] * (1 - f) + palette.highlight[2] * f);
          } else {
            const f = inten / 0.75;
            r = Math.floor(palette.dark[0] * (1 - f) + palette.primary[0] * f);
            g = Math.floor(palette.dark[1] * (1 - f) + palette.primary[1] * f);
            b = Math.floor(palette.dark[2] * (1 - f) + palette.primary[2] * f);
          }

          curCells[outIdx] = `\x1b[38;2;${r};${g};${b}m${char}`;
        } else {
          // Digital rain background
          const rain = rainColumns[i % rainColumns.length];
          const dropY = Math.floor(rain.y);
          if (j === dropY) {
            const glyph = rain.chars[0];
            curCells[outIdx] = `\x1b[38;2;${palette.highlight[0]};${palette.highlight[1]};${palette.highlight[2]}m${glyph}`;
          } else if (j < dropY && j >= dropY - 8) {
            const decay = 1 - (dropY - j) / 8;
            const r = Math.floor(palette.rain[0] * decay * 0.45);
            const g = Math.floor(palette.rain[1] * decay * 0.45);
            const b = Math.floor(palette.rain[2] * decay * 0.45);
            const glyph = rain.chars[(dropY - j) % rain.chars.length];
            curCells[outIdx] = `\x1b[38;2;${r};${g};${b}m${glyph}`;
          } else {
            curCells[outIdx] = ' ';
          }
        }
      }
    }
  }

  // 7. Title Bar & Controls Hint
  const cpuMs = performance.now() - cpuStart;
  dtMsAvg = dtMsAvg * 0.9 + (dt * 1000) * 0.1;
  cpuMsAvg = cpuMsAvg * 0.9 + cpuMs * 0.1;
  const fps = 1000 / Math.max(dtMsAvg, 0.01);

  const modeTag = visualMode.toUpperCase();
  const title = ` 🟢 ${palette.name} · ${modeTag} · ${fps.toFixed(0)} FPS (${cpuMsAvg.toFixed(1)}ms) · [m] МЕНЮ `;
  const titleX = Math.max(0, Math.floor((termW - title.length) / 2));
  for (let k = 0; k < title.length && titleX + k < termW; k++) {
    curCells[titleX + k] = `\x1b[38;2;${palette.primary[0]};${palette.primary[1]};${palette.primary[2]};1m${title[k]}`;
  }

  if (termH > 1) {
    const hint = ' Keys: [m] Центр Управления | [1..7] 4D Облики | [v] Режим | [r] Центр | [q] Выход ';
    const hintX = Math.max(0, Math.floor((termW - hint.length) / 2));
    const base = (termH - 1) * termW;
    for (let k = 0; k < hint.length && hintX + k < termW; k++) {
      curCells[base + hintX + k] = `\x1b[38;2;0;160;70m${hint[k]}`;
    }
  }

  // Overlay Menu Box
  if (showMenuOverlay && termH >= 14 && termW >= 58) {
    const lines = [
      '┌────────────────────────────────────────────────────────┐',
      '│  ⚡ EVA 4D MASTER CONTROL DECK // ТЕРМИНАЛ             │',
      '├────────────────────────────────────────────────────────┤',
      '│  [1] Phosphor Green       [2] Vector Hologram (Eco)    │',
      '│  [3] Electra Cyan         [4] Solar Amber              │',
      '│  [5] Rain Cascade         [6] Solid HD Blocks (▀)      │',
      '│  [7] Cyber Wireframe      [v] Режим: ' + visualMode.toUpperCase().padEnd(18) + '│',
      '│  [r] Центрировать         [q] Выход                    │',
      '│                                                        │',
      '│  Мышь: Взгляд и вращение (пружинный возврат в центр)   │',
      '│  Нажмите [m] или [пробел] чтобы скрыть это меню        │',
      '└────────────────────────────────────────────────────────┘',
    ];
    const boxW = 58;
    const startX = Math.max(0, Math.floor((termW - boxW) / 2));
    const startY = Math.max(1, Math.floor((termH - lines.length) / 2));

    for (let l = 0; l < lines.length; l++) {
      const row = startY + l;
      if (row >= termH) break;
      const lineStr = lines[l];
      for (let c = 0; c < lineStr.length && startX + c < termW; c++) {
        const char = lineStr[c];
        const cellIdx = row * termW + (startX + c);
        const isHeader = l <= 1;
        const color = isHeader ? '\x1b[38;2;0;255;102;48;2;2;14;6;1m' : '\x1b[38;2;220;255;235;48;2;1;18;8m';
        curCells[cellIdx] = `${color}${char}\x1b[0m`;
      }
    }
  }

  // 8. Differential Redraw Output
  if (prevCells === null) {
    clearScreen();
  }

  let out = '';
  let runStart = 0;
  let runLen = 0;
  let lastIdx = -2;

  for (let j = 0; j < termH; j++) {
    for (let i = 0; i < termW; i++) {
      const idx = j * termW + i;
      const c = curCells[idx];
      if (prevCells !== null && prevCells[idx] === c) continue;

      if (runLen > 0 && idx === lastIdx + 1) {
        runLen++;
      } else {
        if (runLen > 0) out += curCells.slice(runStart, runStart + runLen).join('');
        out += `\x1b[${j + 1};${i + 1}H`;
        runStart = idx;
        runLen = 1;
      }
      lastIdx = idx;
    }
  }
  if (runLen > 0) out += curCells.slice(runStart, runStart + runLen).join('');

  if (out) stdout.write(out + '\x1b[0m');
  prevCells = curCells;

  // Schedule next frame (~30 FPS target)
  setTimeout(renderFrame, 28);
}

// ─── Cleanup ───────────────────────────────────────────────────

process.on('SIGINT', () => {
  disableRawMode();
  clearScreen();
  process.exit(0);
});

process.on('SIGTERM', () => {
  disableRawMode();
  clearScreen();
  process.exit(0);
});

process.on('exit', () => {
  disableRawMode();
  if (wsBridge) {
    try { wsBridge.close(); } catch (_) {}
  }
});

// Startup
[termW, termH] = getTermSize();
initRain(termW);
initBridge();
hideCursor();
enableRawMode();
clearScreen();
renderFrame();
