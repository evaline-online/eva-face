/**
 * terminal.ts — Terminal renderer: ANSI output + raw mouse input.
 * Run with: npx tsx src/terminal.ts
 *
 * Renders the face using capability-based output:
 *   - Truecolor terminal: Unicode block elements (░▒▓█) + 24-bit RGB → 3D photo
 *   - 256-color terminal:  same blocks but 256-color greyscale palette
 *   - Mono terminal:      same blocks, no color → crisp face on any terminal
 *
 * Override with env: FACE_MODE=color|grey|mono
 */
import {
  createFaceMesh, projectAndShade, computeParams,
  deformMesh, v3norm, v3dot, v3,
  type Mesh, type FaceParams,
} from './face3d.js';
import { detectMode, ansiSet, type GlyphRamp, type RenderMode } from './capability.js';

// Node globals `process`, `stdout`, `stdin` are available globally in ESM.

// ─── Terminal Setup ────────────────────────────────────────────

const stdout = process.stdout;
const stdin = process.stdin;

function getTermSize(): [number, number] {
  const cols = stdout.columns || 80;
  const rows = stdout.rows || 24;
  return [cols, rows];
}

function hideCursor() { stdout.write('\x1b[?25l'); }
function showCursor() { stdout.write('\x1b[?25h'); }
function clearScreen() { stdout.write('\x1b[2J\x1b[H'); }
function moveTo(x: number, y: number) { stdout.write(`\x1b[${y + 1};${x + 1}H`); }

// Raw mode for mouse input
function enableRawMode() {
  if (stdin.isTTY) {
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');
  }
  // Enable SGR extended mouse tracking
  stdout.write('\x1b[?1003h'); // Any mouse tracking
  stdout.write('\x1b[?1006h'); // SGR extended mode
}

function disableRawMode() {
  stdout.write('\x1b[?1003l');
  stdout.write('\x1b[?1006l');
  if (stdin.isTTY) {
    stdin.setRawMode(false);
  }
  showCursor();
}

// ─── Mouse State ───────────────────────────────────────────────

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
// Startup view is a straight FRONT portrait; idle auto-sway only begins
// after the first mouse event.
let hasInteracted = false;
let termW = 80;
let termH = 24;

// ─── Parse Mouse Input ─────────────────────────────────────────

let inputBuffer = '';
let buttonDown = false; // true while left button is held

function handleInput(data: Buffer) {
  const str = data.toString('utf8');
  inputBuffer += str;

  // Parse SGR mouse: ESC [ < Cb ; Cx ; Cy M/m
  //   M (uppercase) = press or motion · m (lowercase) = release
  //   In SGR format a release may arrive as Cb (same as press) or Cb+3.
  const mouseRegex = /\x1b\[<(\d+);(\d+);(\d+)([Mm])/g;
  let match;
  while ((match = mouseRegex.exec(inputBuffer)) !== null) {
    const rawBtn = parseInt(match[1]);
    const x = parseInt(match[2]) - 1; // 0-based
    const y = parseInt(match[3]) - 1;
    const isRelease = match[4] === 'm';
    const btn = rawBtn >= 32 ? rawBtn - 32 : rawBtn; // motion-with-button mask

    if (isRelease || rawBtn % 32 >= 3) {
      // Button released
      if (btn === 0) {
        dragging = false;
        buttonDown = false;
      }
    } else if (rawBtn === 0 || rawBtn === 32) {
      if (rawBtn === 0 && !buttonDown) {
        // First <0> event while up = real left-button press; without
        // button state tracking, 1003-motion events (also <0;M>) would
        // be misread as presses. Distinguish them via buttonDown.
        dragging = true;
        buttonDown = true;
        lastMX = x;
        lastMY = y;
      } else if (rawBtn === 32) {
        // Motion with no button held (mode 1003 any-motion)
        dragging = false;
        buttonDown = false;
      } else if (dragging) {
        // Drag motion while held → accumulate rotation
        const dx = (x - lastMX) / termW * 3;
        const dy = (y - lastMY) / termH * 3;
        targetRY += dx;
        targetRX += dy;
        lastMX = x;
        lastMY = y;
      }
    }

    mouseX = (x / termW) * 2 - 1;
    mouseY = (y / termH) * 2 - 1;
    hasInteracted = true;

    // Head follows cursor unless the user is mid-drag (then we keep the
    // rotation they've turned to and only add the drag offset above).
    if (!dragging) {
      targetRX = mouseY * 0.25;
      targetRY = mouseX * 0.4;
    }

    inputBuffer = inputBuffer.substring(match.index + match[0].length);
  }

  // Check for partial escape sequence at end
  if (inputBuffer.startsWith('\x1b') && !inputBuffer.match(/\x1b\[</)) {
    // Might be a key press — ignore for now
    if (inputBuffer.length > 1) inputBuffer = '';
  }

  // Clear stale buffer
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
  initRain(HALF ? termH * 2 : termH);
  prevCells = null;
  clearScreen();
});

// ─── Color Helpers ─────────────────────────────────────────────

const RESET = '\x1b[0m';

// Foreground per render mode (color=24bit, grey=256-palette, mono=SGR attr).
function ansiFg(r: number, g: number, b: number): string {
  return ansiSet(r, g, b, RENDER_MODE);
}
// Background per render mode (mono has no background palette → '').
function ansiBg(r: number, g: number, b: number): string {
  if (RENDER_MODE === 'color') return `\x1b[48;2;${r};${g};${b}m`;
  if (RENDER_MODE === 'grey') return `\x1b[48;5;${232 + Math.round((r / 255) * 23)}m`;
  return '';
}

// ─── Render mode (capability-based) ────────────────────────────
//
// Detects terminal colour depth and picks:
//   - mode = 'color' → 24-bit RGB, blocks + 3D shading
//   - mode = 'grey'  → 256-colour palette, blocks + 2D shading
//   - mode = 'mono'  → no colour, blocks only (works on dumb terminals)
//
// Override: FACE_MODE=color|grey|mono

const cap = detectMode();
const RENDER_MODE = cap.mode;
const RAMP_BLOCK = ' ░▒▓█';

// ─── Render mode (capability-based) ────────────────────────────

const BINARY_CHARS = '01';
const SHADE_CHARS = ' .\'`:-=+*#%@';
const SHADE_LEN = SHADE_CHARS.length;

function getChar(intensity: number, useBinary: boolean): string {
  if (useBinary && intensity > 0.75) {
    return BINARY_CHARS[1]; // '1'
  }
  if (useBinary && intensity > 0.4) {
    return BINARY_CHARS[0]; // '0'
  }
  const idx = Math.floor(intensity * (SHADE_LEN - 1));
  return SHADE_CHARS[Math.max(0, Math.min(SHADE_LEN - 1, idx))];
}

// ─── Rain Background ───────────────────────────────────────────

interface RainDrop {
  x: number;
  y: number;
  speed: number;
  char: string;
  bright: boolean;
}

let rain: RainDrop[] = [];

// Rain lives on the VIRTUAL-row grid (termH*2 in half-block mode). The
// `rows` param is the virtual height; drop y-coordinates are virtual rows.
function initRain(rows: number) {
  rain = [];
  for (let i = 0; i < termW + 10; i++) {
    rain.push({
      x: i,
      y: Math.random() * rows * 2 - rows,
      speed: 0.15 + Math.random() * 0.6, // half-rows/sec ≈ old cell speed
      char: Math.random() > 0.5 ? '0' : '1',
      bright: Math.random() < 0.08,
    });
  }
}

function updateRain(dt: number, rows: number) {
  for (const drop of rain) {
    drop.y += drop.speed * dt * 10;
    if (drop.y > rows + 2) {
      drop.y = -1 - Math.random() * 8;
      drop.x = Math.floor(Math.random() * termW);
      drop.char = Math.random() > 0.5 ? '0' : '1';
      drop.speed = 0.15 + Math.random() * 0.6;
      drop.bright = Math.random() < 0.08;
    }
  }
  // Adjust rain array size if terminal resized
  while (rain.length < termW + 10) {
    rain.push({
      x: rain.length,
      y: Math.random() * rows * 2,
      speed: 0.15 + Math.random() * 0.6,
      char: Math.random() > 0.5 ? '0' : '1',
      bright: Math.random() < 0.08,
    });
  }
}

// ─── Main Loop ─────────────────────────────────────────────────

const mesh = createFaceMesh();
[termW, termH] = getTermSize();

// Half-block mode: the render grid is termH*2 virtual rows tall. Must match
// the HALF computation in render() (mono terminals have no bg palette).
const HALF = RENDER_MODE !== 'mono' && process.env.FACE_HALF !== '0';
const GH = HALF ? termH * 2 : termH;
initRain(GH);

// Previous frame's serialized cells ('' = first frame → full repaint).
// Reset to null on resize so the diff pass emits a full frame.
let prevCells: string[] | null = null;

hideCursor();
enableRawMode();
clearScreen();

let prevTime = performance.now();
let frameCount = 0;

function render() {
  const now = performance.now();
  const dt = Math.min((now - prevTime) / 1000, 0.1);
  prevTime = now;
  const time = now / 1000;
  frameCount++;

  const [w, h] = getTermSize();
  if (w !== termW || h !== termH) {
    termW = w;
    termH = h;
    initRain(HALF ? termH * 2 : termH);
    prevCells = null;
    clearScreen();
  }

  // Smooth rotation
  const lerpSpeed = dragging ? 8 : 3;
  rotX += (targetRX - rotX) * Math.min(1, dt * lerpSpeed);
  rotY += (targetRY - rotY) * Math.min(1, dt * lerpSpeed);

  if (!dragging && hasInteracted) {
    autoRotY += dt * 0.3;
    const autoTarget = targetRY + Math.sin(autoRotY) * 0.15;
    rotY += (autoTarget - rotY) * dt * 0.5;
  }

  // Face params
  const params = computeParams(time, mouseX, mouseY, dragging);

  // Deform
  deformMesh(mesh, params);

  // Half-block mode (module-level HALF): each terminal cell is split into two
  // virtual rows rendered as '▀' with fg=upper color, bg=lower color → 2×
  // vertical detail. Virtual cells are square (cellAspect 1.0 instead of 0.5).
  // Disable with FACE_HALF=0. Mono terminals skip it (no bg palette).
  const GH = HALF ? termH * 2 : termH;
  const aspect = HALF ? 1.0 : 0.5;

  // Project (cellAspect ≈ 0.5 for terminal cells: ~2x taller than wide)
  // Eyes (pupils + irises) track the cursor via gaze, same as the browser.
  const result = projectAndShade(mesh, rotX, rotY, 0, termW, GH, aspect,
    { gx: mouseX, gy: mouseY }, RENDER_MODE, (process.env.FACE_RAMP as GlyphRamp) || 'half');

  // Update rain (lives on the same virtual-row grid)
  updateRain(dt, GH);

  // ── Build the current frame as one string per cell ─────────────
  // Cells carry their full escape sequence; unchanged cells are plain
  // strings that the diff pass below simply skips.
  const N = termW * termH;
  const cur: string[] = new Array(N);

  for (let j = 0; j < termH; j++) {
    const rT = result.cells[HALF ? j * 2 : j];
    const rB = HALF ? result.cells[j * 2 + 1] : null;

    for (let i = 0; i < termW; i++) {
      const t = rT?.[i];
      const b = rB?.[i];
      const tFace = !!t && t.ch !== ' ' && t.ch !== '\0';
      const bFace = !!b && b.ch !== ' ' && b.ch !== '\0';
      const idx = j * termW + i;

      if (tFace || bFace) {
        // Face cell: upper-half digit glyph tinted with the upper pixel color,
        // lower half painted via background color (when both rows are face).
        const f = tFace ? t! : b!;
        const bg = tFace && bFace ? b! : null;
        cur[idx] = ansiFg(f.r, f.g, f.b) + (bg ? ansiBg(bg.r, bg.g, bg.b) : '') + f.ch;
      } else {
        // Background: matrix rain, resolved on the virtual-row grid.
        let topRain = 0;
        let botRain = 0;
        const rows = HALF ? [j * 2, j * 2 + 1] : [j];
        for (const j2 of rows) {
          const drop = rain[i % rain.length];
          if (Math.floor(drop.y) === j2) {
            if (j2 % 2 === 0 || !HALF) topRain = drop.bright ? 2 : 1;
            else botRain = drop.bright ? 2 : 1;
          }
          if (!topRain && !botRain && (i + j2 * 3) % 13 === 0 &&
              Math.sin(time + i * 0.7 + j2 * 0.4) > 0.96) {
            if (j2 % 2 === 0 || !HALF) topRain = 1;
            else botRain = 1;
          }
        }
        if (topRain && botRain) {
          cur[idx] = ansiFg(0, topRain === 2 ? 255 : 80, 0) + '█';
        } else if (topRain) {
          cur[idx] = ansiFg(0, topRain === 2 ? 255 : 80, 0) + '▀';
        } else if (botRain) {
          cur[idx] = ansiFg(0, botRain === 2 ? 255 : 80, 0) + '▄';
        } else {
          cur[idx] = ' ';
        }
      }
    }
  }

  // Title (row 0) and controls hint (last row), as plain cell strings.
  const title = ` MATRIX FACE · ${RENDER_MODE.toUpperCase()}${HALF ? ' · 2×' : ''} `;
  const titleX = Math.max(0, Math.floor((termW - title.length) / 2));
  for (let k = 0; k < title.length && titleX + k < termW; k++) {
    cur[titleX + k] = ansiFg(0, 255, 0) + title[k];
  }
  if (termH > 1) {
    const hint = ' Move mouse: head follows | Click+drag: rotate | Ctrl+C: quit ';
    const hintX = Math.max(0, Math.floor((termW - hint.length) / 2));
    const base = (termH - 1) * termW;
    for (let k = 0; k < hint.length && hintX + k < termW; k++) {
      cur[base + hintX + k] = ansiFg(0, 100, 0) + hint[k];
    }
  }

  // Header note: log the mode to stderr (visible when run manually)
  if (frameCount === 1) {
    console.error(`[terminal] mode=${RENDER_MODE}  colors=${cap.colors}  half=${HALF}  (override: FACE_MODE=color|grey|mono  FACE_HALF=0)`);
  }

  // ── Differential output ────────────────────────────────────────
  // Emit ONLY the cells that changed since the previous frame. A full-screen
  // rewrite with per-cell escapes (~20 bytes/cell × ~10k cells × 30fps)
  // saturates the pty — the terminal can't paint that fast, so output backs
  // up and floods the screen. Cursor jumps are emitted per contiguous run.
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
      const c = cur[idx];
      if (prevCells !== null && prevCells[idx] === c) continue;

      if (runLen > 0 && idx === lastIdx + 1) {
        runLen++;
      } else {
        if (runLen > 0) out += cur.slice(runStart, runStart + runLen).join('');
        out += `\x1b[${j + 1};${i + 1}H`;
        runStart = idx;
        runLen = 1;
      }
      lastIdx = idx;
    }
  }
  if (runLen > 0) out += cur.slice(runStart, runStart + runLen).join('');

  if (out) stdout.write(out + RESET);
  prevCells = cur;

  setTimeout(render, 33); // ~30fps
}

// ─── Cleanup on exit ───────────────────────────────────────────

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
});

// Start
render();
