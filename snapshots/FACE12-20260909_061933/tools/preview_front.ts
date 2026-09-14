import { createFaceMesh, projectAndShade } from '../src/face3d.js';
const RAMP = ' .\'`:-=+*#%@';
function charFor(intensity: number): string {
  if (intensity > 0.75) return '1';
  if (intensity > 0.4) return '0';
  const idx = Math.floor(intensity * (RAMP.length - 1));
  return RAMP[Math.max(0, Math.min(RAMP.length - 1, idx))];
}
const mesh = createFaceMesh();
const res = projectAndShade(mesh, 0, 0, 0, 142, 45, 9 / 16);
let out = '';
for (let j = 0; j < 45; j++) {
  let line = '';
  for (let i = 0; i < 142; i++) {
    const c = res.cells[j]?.[i];
    const draw = c && c.ch !== ' ' && c.ch !== '\0';
    line += draw ? charFor(Math.max(c!.r, c!.g, c!.b) / 255) : ' ';
  }
  out += '|' + line.slice(40, 105) + '|' + '\n';
}
console.log(out);