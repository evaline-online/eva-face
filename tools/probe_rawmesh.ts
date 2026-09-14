/**
 * Raw mesh render — vertex splat + lighting ONLY, no stencils.
 * Shows what the geometry itself looks like from the front.
 */
import { HEAD_POS, HEAD_NRM, HEAD_N } from '../src/headmodel.js';

const W = 110, H = 55;
const CAM_Z = 3.4, HEAD_CY = 0.185;
const light = [0.4, 0.45, 0.8]; const ll = Math.hypot(...light);
const L = light.map(v => v / ll);
const RAMP = ' .:-=+*#%@';

const sxS = (W / 2) / 0.62, syS = (H / 2) / 0.62;
const depth = new Float32Array(W * H).fill(-99);
const tone = new Float32Array(W * H).fill(0);

for (let i = 0; i < HEAD_N; i++) {
  const x = HEAD_POS[i*3], y = HEAD_POS[i*3+1], z = HEAD_POS[i*3+2];
  if (y < -0.48) continue;
  const nz = HEAD_NRM[i*3], ny = HEAD_NRM[i*3+1], nx = HEAD_NRM[i*3+2];
  const dist = CAM_Z - z;
  if (dist <= 0.2) continue;
  const pers = CAM_Z / dist;
  const sx = Math.round(W/2 + x * sxS * pers);
  const sy = Math.round(H/2 - (y - HEAD_CY) * syS * pers);
  if (sx < 0 || sx >= W || sy < 0 || sy >= H) continue;
  const idx = sy * W + sx;
  if (z <= depth[idx]) continue;
  depth[idx] = z;
  const d = Math.max(0, nx*L[0] + ny*L[1] + nz*L[2]);
  tone[idx] = 0.25 + 0.65 * Math.pow(d, 1.2);
}

for (let j = 0; j < H; j++) {
  let row = '';
  for (let i = 0; i < W; i++) {
    const idx = j * W + i;
    row += depth[idx] > -98 ? RAMP[Math.min(RAMP.length-1, Math.floor(tone[idx] * RAMP.length))] : ' ';
  }
  console.log(row);
}
