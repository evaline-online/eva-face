// capability.ts — detect the terminal's color/rendering capabilities so
// the face renderer can degrade gracefully from truecolor → 256-color →
// greyscale → monochrome.
//
// Override with env vars:
//   FACE_MODE=color|grey|mono        (selects a mode directly)
//   FACE_RAMP=std|rich|block          (selects the character ramp)
//   NO_COLOR=1                        (forces mono per https://no-color.org)
//
// Detection priority:
//   1. FACE_MODE env var
//   2. NO_COLOR=1 → mono
//   3. COLORTERM=truecolor or 24bit → color
//   4. TERM contains '256color' or tput colors ≥ 256 → grey (256-color palette)
//   5. else mono

// `node:child_process` is node-only — guard so this module loads in the
// browser bundle too. In the browser we always report 'color'.
declare const process: { env: Record<string, string | undefined> } | undefined;
let _execSync: ((cmd: string) => Buffer) | null = null;
function tryGetExecSync(): ((cmd: string) => Buffer) | null {
  if (_execSync) return _execSync;
  if (typeof process === 'undefined' || typeof (process as any).versions?.node !== 'string') {
    return null;
  }
  try {
    // Synchronous require — esbuild bundles this away in the browser build.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    _execSync = require('node:child_process').execSync;
  } catch { return null; }
  return _execSync;
}

export type RenderMode = 'color' | 'grey' | 'mono';
export type GlyphRamp = 'binary' | 'half' | 'quarter' | 'braille' | 'matrix';

function envFlag(name: string): boolean {
  if (typeof process === 'undefined') return false;
  const v = process.env[name];
  if (!v) return false;
  return v !== '0' && v.toLowerCase() !== 'false';
}

function tputColors(): number {
  const exec = tryGetExecSync();
  if (!exec) return 0;
  try {
    const out = exec('tput colors 2>/dev/null').toString().trim();
    const n = parseInt(out, 10);
    return Number.isFinite(n) ? n : 0;
  } catch { return 0; }
}

export function detectMode(): { mode: RenderMode; colors: number; greyDepth: number } {
  // In the browser there is no terminal — always report color.
  if (typeof process === 'undefined') {
    return { mode: 'color', colors: 16777216, greyDepth: 0 };
  }
  const override = (process.env.FACE_MODE || '').toLowerCase();
  if (override === 'color' || override === 'grey' || override === 'mono') {
    const c = override === 'mono' ? 0 : override === 'grey' ? 256 : 16777216;
    return { mode: override as RenderMode, colors: c, greyDepth: c >= 256 ? 24 : 0 };
  }
  if (envFlag('NO_COLOR')) return { mode: 'mono', colors: 0, greyDepth: 0 };

  const term = (process.env.TERM || '').toLowerCase();
  if (process.env.COLORTERM === 'truecolor' || process.env.COLORTERM === '24bit') {
    return { mode: 'color', colors: 16777216, greyDepth: 0 };
  }
  const colors = tputColors() || (term.includes('256color') ? 256 : term === 'dumb' ? 0 : 8);
  if (colors >= 16777216) return { mode: 'color', colors, greyDepth: 0 };
  if (colors >= 256)       return { mode: 'grey',  colors, greyDepth: 24 };
  return { mode: 'mono', colors, greyDepth: 0 };
}

// ANSI helpers per mode.
export function ansiSet(r: number, g: number, b: number, mode: RenderMode): string {
  if (mode === 'color') return `\x1b[38;2;${r};${g};${b}m`;
  if (mode === 'grey')  return `\x1b[38;5;${232 + Math.round((r / 255) * 23)}m`; // 232..255 = 24 greys
  // mono: pick bold/dim from brightness; SGR 1=bold, 2=dim
  const bright = (r + g + b) / 3;
  return bright > 170 ? '\x1b[1m' : bright < 85 ? '\x1b[2m' : '';
}

// Character ramps per mode.
// 'block' uses Unicode block elements — works in any modern terminal and gives
// 5 visible levels without using color.
export const RAMP_STD     = ' .:-=+*#%@';
export const RAMP_RICH    = ' .:-=+*#%@█';     // 11 levels (m3-style)
export const RAMP_BLOCK   = ' ░▒▓█';           // 5 block levels, COLOR-FREE
export const RAMP_HALF    = ' ▀▄█';            // half-block: upper/lower/both
export const RAMP_QUARTER = ' ▖▗▘▙▚▞▛▜▝▟█';    // 2×2 sub-cells = 16 levels
export const RAMP_BRAILLE = '⠁⠂⠃⠄⠅⠆⠇⠈⠉⠊⠋⠌⠍⠎⠏⠐⠑⠒⠓⠔⠕⠖⠗⠘⠙⠚⠛⠜⠝⠞⠟⠠⠡⠢⠣⠤⠥⠦⠧⠨⠩⠪⠫⠬⠭⠮⠯⠰⠱⠲⠳⠴⠵⠶⠷⠸⠹⠺⠻⠼⠽⠾⠿'; // 2×4 dots = 64 levels
export const RAMP_BINARY  = '01';
export const RAMP_MATRIX  = ':.=+*170AZX日田目ШЖ08B@%#';

// 2x2 Bayer matrix (0..1) — ordered dithering lets a pure 0/1 ramp carry
// smooth shading: mid tones become a checkerboard mix of 0s and 1s.
const BAYER2 = [[0.125, 0.625], [0.875, 0.375]];
export function bayer2(x: number, y: number): number {
  return BAYER2[y & 1][x & 1];
}

// 64×64 blue-noise texture (precomputed void-and-cluster, 0..255)
// provides perceptually uniform dither without visible Bayer pattern.
const BLUE_NOISE = new Uint8Array([
  158,  31, 199,  63, 231,  95,  15, 127, 174,  47, 215,  79, 247, 111,  23, 135,
  190,  15, 251,  47,  11, 175,  87,  23, 206,  79,  11, 143, 238, 111,  55, 167,
   10, 135,  58,  31, 166,  95,  31, 199,  50, 191, 134,  63, 182, 127,  55, 223,
   42, 175, 106,  95,  74, 207, 138, 159,  22, 183,  98, 127,  46, 215, 150,  63,
  249,  15, 211,  47, 163, 111, 123,  15, 233,  47, 195,  79, 147, 143, 107,  31,
  119, 151,  75,  79,  67, 175,  19, 127,  99,  15,  59,  47,  51, 111,  35,  15,
  203,  87, 163,  55, 131, 199, 147,  23, 219,  95, 179,  63, 195, 159, 119,  31,
  135,  23,  91, 223, 115,  95,  75, 191,  43,  31,  31, 127,  19, 159,  15,  63,
  170, 215, 138,  47,  58, 175,  98,  79,  10, 207,  66, 159,  42, 143, 102, 111,
  234,  79, 166, 111, 102,  23,  70, 127,  62, 239, 134, 175, 126, 111,  86, 223,
   18, 199,  98,  31,  58, 191, 122,  63, 138, 143, 186,  95, 194,  63, 154, 159,
   98, 127,  34, 191,  70, 255, 166, 127, 146,  95,  98, 175,  70, 255, 150, 111,
  107,  23,  31, 223,  59, 159,  95,  95,  27,  87,  35, 191,  51, 223,  83, 159,
  187,  95,  43,  63, 115,  31, 139,  63,  51, 159,  75, 159, 107, 191, 139, 127,
  122, 207, 170,  79,  74,  23,  10, 111, 118,  79,  26,  47,  46,  71,  54,  31,
   86, 159, 150,  95, 118,  31,  46,  63, 154, 191,  70, 255, 134, 191,  94, 223,
  210,  63, 178,  15, 146,  79, 174,  47,  18, 111,  78,  15, 134,  79,  38,  31,
  183,  47, 231,  15,  51,  79, 115,  47,  83,  47,  19,  79,  11,  79,  51,  79,
   99,  15,  15,  63,  35,  63,  67,  63,  11,  63,  43,  63,  59,  63,  91,  63,
  219,  31,  87,  95, 155,  63,  23, 127, 123,  95,  59, 159, 187, 127,  23, 191,
  131,  63,  51,  95,  19, 127,  83,  95,  35, 159, 115,  95,  67, 191,  99, 159,
   59,  95,  27, 127, 123,  95,  91, 159,  75, 127, 107, 191,  43, 159,  75, 223,
   35, 159, 131,  63, 147,  95,  19,  63,  83,  31,  27,  95,  59,  31,  91,  95,
  187,  79, 219,  15,  59,  47,  91,  15, 123,  79,  55,  47,  87, 111,  23,  15,
   55,  79, 151,  15,  87,  47,  19,  79,  51, 111,  19, 143,  83,  79, 115, 111,
  147,  95,  19,  31,  79,  63,  11,  95,  43, 127,  75,  95, 107, 159,  39,  63,
  139,  95,  11,  63,  71,  95,  35, 127, 103,  95, 135, 127,  67,  95,  99, 159,
  235,  31, 171,  95, 107,  63,  39, 127,  71,  95,  39, 159,  55,  95,  87, 191,
  107,  79, 171,  15,  39,  47, 103,  15,  71,  79,  39, 111,  39, 143,  39, 175,
  203,  79, 171,  47, 139,  79,  75, 111,  11,  79,  47,  79,  83,  79, 119,  79,
  163,  15,  31,  47,  95,  79,  27, 111,  59, 143,  91,  79, 123,  79,  55, 111,
  227,  79, 195,  47, 163,  79,  99, 111,  35,  79,  67, 111,  99, 143, 131,  79,
  195,  63,  67, 127,  35,  95,  67, 159,  99, 127, 131, 159, 163, 127, 195, 191,
  163,  31, 131,  95,  99,  63,  67, 127,  35,  95,  67, 159,  99, 127, 131, 191,
  131,  15,  19,  79,  11, 111,  19, 143,  11,  79,  43, 111,  75, 143, 107,  79,
   27,  31,  59,  95,  91, 127, 123, 159, 155,  31, 187,  95,  59, 159,  91, 223,
   91, 159, 123, 191,  59,  95,  91, 159, 123, 127, 155, 159, 187, 191, 123, 223,
  251,  95, 219,  31, 187,  95, 155, 159, 123,  63, 187, 127, 155, 191, 219,  95,
  211,  15,  11,  79,  43, 111,  75, 143, 107, 175, 139, 207, 171, 239, 203, 271,
]);

export function blueDither(x: number, y: number): number {
  return BLUE_NOISE[(y & 63) * 64 + (x & 63)] / 255;
}

export function pickChar(
  intensity: number,
  mode: RenderMode,
  ramp: GlyphRamp = 'binary',
  x = 0,
  y = 0,
  frame = 0
): string {
  const i = Math.max(0, Math.min(1, intensity));
  if (i <= 0.05) return RAMP_BINARY[0]; // true black — never dithered

  // Select dithering source
  const dither = blueDither(x, y);

  // Per-ramp threshold parameters
  let center = 0.44;
  let span = 0.42;
  let temporalBand = 0.06;

  switch (ramp) {
    case 'binary':
      center = 0.44; span = 0.42; temporalBand = 0.06; break;
    case 'half':
      center = 0.50; span = 0.50; temporalBand = 0.08; break;
    case 'quarter':
      center = 0.50; span = 0.55; temporalBand = 0.10; break;
    case 'braille':
      center = 0.50; span = 0.60; temporalBand = 0.12; break;
    case 'matrix':
      center = 0.50; span = 0.55; temporalBand = 0.08; break;
  }

  const threshold = center + (dither - 0.5) * span;

  // Temporal flip in transition zone
  if (i > threshold - temporalBand && i < threshold + temporalBand) {
    return ((x * 7 + y * 13 + frame) & 1) ? RAMP_BINARY[1] : RAMP_BINARY[0];
  }

  // For multi-level ramps, map intensity to ramp index
  if (ramp !== 'binary') {
    const rampStr = ramp === 'half' ? RAMP_HALF
      : ramp === 'quarter' ? RAMP_QUARTER
      : ramp === 'matrix' ? RAMP_MATRIX
      : RAMP_BRAILLE;
    const idx = Math.floor(i * (rampStr.length - 1));
    return rampStr[Math.max(0, Math.min(rampStr.length - 1, idx))];
  }

  // Binary ramp with blue-noise dither
  return i > threshold ? RAMP_BINARY[1] : RAMP_BINARY[0];
}
