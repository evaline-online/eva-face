// Visual test dump: front / profile / back of the head at terminal (80x40,
// cellAspect 0.5) and browser (120x45, 9/16) layouts.
// Run: npx tsx tools/preview_all.ts
import { createFaceMesh, projectAndShade } from '../src/face3d';

const RAMP = ' .\'`:-=+*#%@';
function charFor(intensity: number): string {
  if (intensity > 0.75) return '1';
  if (intensity > 0.4) return '0';
  const idx = Math.floor(intensity * (RAMP.length - 1));
  return RAMP[Math.max(0, Math.min(RAMP.length - 1, idx))];
}

const mesh = createFaceMesh();
const LAYOUTS: [string, number, number, number][] = [
  ['TERMINAL 80x40', 80, 40, 0.5],
  ['BROWSER 120x45', 120, 45, 9 / 16],
];
const VIEWS: [string, number, number][] = [
  ['FRONT', 0, 0],
  ['PROFILE (yaw -0.7)', 0, -0.7],
  ['BACK (yaw PI)', 0, Math.PI],
];

for (const [lname, W, H, aspect] of LAYOUTS) {
  for (const [vname, rx, ry] of VIEWS) {
    console.log(`=== ${lname} ${vname} ===`);
    const res = projectAndShade(mesh, rx, ry, 0, W, H, aspect);
    for (let j = 0; j < H; j++) {
      let line = '';
      for (let i = 0; i < W; i++) {
        const c = res.cells[j][i];
        const draw = c.depth > -98;
        line += draw ? charFor(Math.max(c.r, c.g, c.b) / 255) : ' ';
      }
      console.log(line.replace(/\s+$/, ''));
    }
    console.log('');
  }
}
