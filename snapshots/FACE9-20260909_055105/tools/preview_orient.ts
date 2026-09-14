import { createFaceMesh, projectAndShade } from '../src/face3d.js';

// Same character mapping the terminal renderer uses (getChar(forceBinary=true)):
//   >0.75  -> '1'
//   >0.40  -> '0'
//   else   -> shade ramp
const RAMP = ' .\'`:-=+*#%@';
function charFor(intensity: number): string {
  if (intensity > 0.75) return '1';
  if (intensity > 0.4) return '0';
  const idx = Math.floor(intensity * (RAMP.length - 1));
  return RAMP[Math.max(0, Math.min(RAMP.length - 1, idx))];
}

function render(cols: number, rows: number, ry: number, rx = 0): string {
  const mesh = createFaceMesh();
  const res = projectAndShade(mesh, rx, ry, 0, cols, rows, 0.5);
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

console.log('=== FRONT (yaw 0) ===');
console.log(render(80, 40, 0));
console.log('=== TURN 40deg ===');
console.log(render(80, 40, -0.7));
console.log('=== BACK (yaw 180) ===');
console.log(render(80, 40, 3.1416));