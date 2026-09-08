// render_blocks.ts — render the face using the new BLOCK-ELEMENT strategy.
//   - Truecolor (mode='color'): blocks + 24-bit RGB → photorealistic 3D face
//   - 256-color (mode='grey'):  blocks + 256-color greyscale
//   - Mono (mode='mono'):     blocks only, no color → universal fallback
// Run: npx tsx tools/render_blocks.ts
import { createFaceMesh, projectAndShade } from '../src/face3d';
import { detectMode, ansiSet, pickChar } from '../src/capability';

const mesh = createFaceMesh();
const W = 80, H = 40;
const A = 0.5;

const cap = detectMode();
const RAMP = ' ░▒▓█';
const RENDER_MODE = cap.mode;
console.error(`[render_blocks] mode=${RENDER_MODE} colors=${cap.colors}`);

const res = projectAndShade(mesh, 0, 0, 0, W, H, A);

let out = `MODE: ${RENDER_MODE.toUpperCase()} (${cap.colors} colors)\n\n`;
for (let j = 0; j < H; j++) {
  let line = '';
  for (let i = 0; i < W; i++) {
    const c = res.cells[j]?.[i];
    if (!c || c.depth <= -98) { line += ' '; continue; }
    const intensity = Math.max(c.r, c.g, c.b) / 255;
    const ch = pickChar(intensity, RENDER_MODE, RAMP);
    const color = ansiSet(c.r, c.g, c.b, RENDER_MODE);
    line += `${color}${ch}`;
  }
  out += line.replace(/\s+$/, '') + '\n';
}
console.log(out);
