import { createFaceMesh, projectAndShade } from '../src/face3d.js';
const RAMP = ' .\'`:-=+*#%@';
function charFor(intensity: number): string {
  if (intensity > 0.75) return '1';
  if (intensity > 0.4) return '0';
  const idx = Math.floor(intensity * (RAMP.length - 1));
  return RAMP[Math.max(0, Math.min(RAMP.length - 1, idx))];
}
function render(cols: number, rows: number, ry: number, rx = 0, cellAspect = 0.5625): string {
  const mesh = createFaceMesh();
  const res = projectAndShade(mesh, rx, ry, 0, cols, rows, cellAspect);
  let out = '';
  for (let j = 0; j < rows; j++) {
    let line = '';
    for (let i = 0; i < cols; i++) {
      const c = res.cells[j]?.[i];
      const draw = c && c.ch !== ' ' && c.ch !== '\0';
      line += draw ? charFor(Math.max(c!.r, c!.g, c!.b) / 255) : ' ';
    }
    out += line + '\n';
  }
  return out;
}
console.log('=== BROWSER 120x45 cellAspect 9/16, FRONT ===');
console.log(render(120, 45, 0, 0, 9 / 16));
console.log('=== BROWSER 120x45, TURN 35deg ===');
console.log(render(120, 45, -0.6, 0, 9 / 16));
