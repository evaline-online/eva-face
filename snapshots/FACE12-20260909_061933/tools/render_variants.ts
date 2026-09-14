// render_variants.ts — compare capability-based rendering modes side-by-side.
//
// Reads the projection from projectAndShade, then paints the same cells with
// six different (mode, ramp) combinations and dumps them to stdout. This lets
// you pick the best rendering for a given terminal at a glance.
//
// Run: npx tsx tools/render_variants.ts
import { createFaceMesh, projectAndShade } from '../src/face3d';
import { detectMode, ansiSet, pickChar, RAMP_STD, RAMP_RICH, RAMP_BLOCK, RAMP_BINARY } from '../src/capability';

const mesh = createFaceMesh();
const W = 80, H = 40;
const A = 0.5;

const cap = detectMode();
console.error(`[detect] mode=${cap.mode}  colors=${cap.colors}`);

const res = projectAndShade(mesh, 0, 0, 0, W, H, A);

const RESET = '\x1b[0m';

interface Variant {
  name: string;
  mode: 'color' | 'grey' | 'mono';
  ramp: string;
  perCell: (intensity: number, r: number, g: number, b: number) => string;
  perReset?: string;
}

const variants: Variant[] = [
  {
    name: '1) color + RAMP_RICH (current m3 default)',
    mode: 'color',
    ramp: RAMP_RICH,
    perCell: (i, r, g, b) => `${ansiSet(r, g, b, 'color')}${pickChar(i, 'color', RAMP_RICH)}`,
    perReset: RESET,
  },
  {
    name: '2) color + RAMP_STD (10 levels)',
    mode: 'color',
    ramp: RAMP_STD,
    perCell: (i, r, g, b) => `${ansiSet(r, g, b, 'color')}${pickChar(i, 'color', RAMP_STD)}`,
    perReset: RESET,
  },
  {
    name: '3) grey (256-color palette, no RGB)',
    mode: 'grey',
    ramp: RAMP_RICH,
    perCell: (i, r, g, b) => `${ansiSet(r, g, b, 'grey')}${pickChar(i, 'grey', RAMP_RICH)}`,
    perReset: RESET,
  },
  {
    name: '4) B/W with block elements (no color, 5 levels)',
    mode: 'mono',
    ramp: RAMP_BLOCK,
    perCell: (i) => pickChar(i, 'mono', RAMP_BLOCK),
  },
  {
    name: '5) B/W with rich unicode ramp (no color, 11 levels)',
    mode: 'mono',
    ramp: RAMP_RICH,
    perCell: (i) => pickChar(i, 'mono', RAMP_RICH),
  },
  {
    name: '6) B/W with bold+dim (SGR only, #/space)',
    mode: 'mono',
    ramp: RAMP_BINARY,
    perCell: (i, r, g, b) => `${ansiSet(r, g, b, 'mono')}${pickChar(i, 'mono', RAMP_BINARY)}`,
    perReset: RESET,
  },
];

for (const v of variants) {
  console.log('\n' + '═'.repeat(80));
  console.log('VARIANT: ' + v.name);
  console.log('═'.repeat(80));
  for (let j = 0; j < H; j++) {
    let line = '';
    for (let i = 0; i < W; i++) {
      const c = res.cells[j]?.[i];
      if (!c || c.depth <= -98) { line += ' '; continue; }
      const intensity = Math.max(c.r, c.g, c.b) / 255;
      line += v.perCell(intensity, c.r, c.g, c.b);
    }
    if (v.perReset) line += v.perReset;
    console.log(line.replace(/\s+$/, ''));
  }
}
