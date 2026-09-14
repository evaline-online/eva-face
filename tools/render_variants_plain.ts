// render_variants_plain.ts — same as render_variants.ts but without ANSI colors
// so we can read the variants as plain text in a log.
import { createFaceMesh, projectAndShade } from '../src/face3d';
import { detectMode, ansiSet, pickChar, RAMP_STD, RAMP_RICH, RAMP_BLOCK, RAMP_BINARY } from '../src/capability';

const mesh = createFaceMesh();
const W = 80, H = 40;
const A = 0.5;

const cap = detectMode();
console.error(`[detect] mode=${cap.mode}  colors=${cap.colors}`);

const res = projectAndShade(mesh, 0, 0, 0, W, H, A);

interface Variant {
  name: string;
  mode: 'color' | 'grey' | 'mono';
  ramp: string;
  perCell: (intensity: number, r: number, g: number, b: number) => string;
}

const variants: Variant[] = [
  {
    name: '1) color+RAMP_RICH (m3 default)',
    mode: 'color', ramp: RAMP_RICH,
    perCell: (i) => pickChar(i, 'color', RAMP_RICH),
  },
  {
    name: '2) color+RAMP_STD (10 levels)',
    mode: 'color', ramp: RAMP_STD,
    perCell: (i) => pickChar(i, 'color', RAMP_STD),
  },
  {
    name: '3) grey (256-color)',
    mode: 'grey', ramp: RAMP_RICH,
    perCell: (i) => pickChar(i, 'grey', RAMP_RICH),
  },
  {
    name: '4) BW block (5 levels)',
    mode: 'mono', ramp: RAMP_BLOCK,
    perCell: (i) => pickChar(i, 'mono', RAMP_BLOCK),
  },
  {
    name: '5) BW rich (11 levels)',
    mode: 'mono', ramp: RAMP_RICH,
    perCell: (i) => pickChar(i, 'mono', RAMP_RICH),
  },
  {
    name: '6) BW bold+dim (#/space)',
    mode: 'mono', ramp: RAMP_BINARY,
    perCell: (i) => pickChar(i, 'mono', RAMP_BINARY),
  },
];

let out = '';
for (const v of variants) {
  out += '\n' + '═'.repeat(80) + '\n';
  out += 'VARIANT: ' + v.name + '\n';
  out += '═'.repeat(80) + '\n';
  for (let j = 0; j < H; j++) {
    let line = '';
    for (let i = 0; i < W; i++) {
      const c = res.cells[j]?.[i];
      if (!c || c.depth <= -98) { line += ' '; continue; }
      const intensity = Math.max(c.r, c.g, c.b) / 255;
      line += v.perCell(intensity, c.r, c.g, c.b);
    }
    out += line.replace(/\s+$/, '') + '\n';
  }
}
console.log(out);
