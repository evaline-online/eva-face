/**
 * Pure-geometry silhouette dump — NO stencils, NO shading.
 * Shows the true mesh profile at yaw -90° and +90° so we can see with our
 * own eyes which side the nose protrudes to.
 */
import { HEAD_POS, HEAD_N } from '../src/headmodel.js';

function dump(ry: number, title: string) {
  const W = 64, H = 32;
  const grid: string[][] = Array.from({ length: H }, () => Array(W).fill(' '));
  const cy = Math.cos(ry), sy = Math.sin(ry);
  for (let i = 0; i < HEAD_N; i++) {
    const x = HEAD_POS[i*3], y = HEAD_POS[i*3+1], z = HEAD_POS[i*3+2];
    if (y < -0.48) continue; // neck crop, same as renderer
    const px = x * cy + z * sy;   // same rotation as rotateXYZ (Y axis)
    const pz = -x * sy + z * cy;
    const sx = Math.round(W/2 + px * W/2.4);
    const syy = Math.round(H/2 - (y - 0.185) * H/2.2);
    if (sx < 0 || sx >= W || syy < 0 || syy >= H) continue;
    // nearer surface overwrites
    grid[syy][sx] = pz > 0 ? '@' : '.'; // +z toward viewer = '@'
  }
  console.log(`\n── ${title} ──   ('@' = surface toward camera, '.' = away)`);
  for (const row of grid) console.log(row.join(''));
}

// At ry = -PI/2: z=+1 (face, if mesh is +Z-facing) maps to px = z*sy = -1 → LEFT.
// So: if mesh faces +Z, the FACE silhouette appears on the LEFT at ry=-PI/2.
dump(-Math.PI/2, 'ry = -90°');
dump(+Math.PI/2, 'ry = +90°');
