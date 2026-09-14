/**
 * DECISIVE orientation test: triangle-rasterized raw geometry, NO stencils.
 * Renders the mesh at ry=0 (+Z side to camera) and ry=PI (-Z side to camera).
 * The side with eye pits / nose / mouth is the real face.
 */
import { HEAD_POS, HEAD_NRM, HEAD_TRI, HEAD_TRI_COUNT, HEAD_N } from '../src/headmodel.js';

function render(ry: number, title: string) {
  const W = 100, H = 50;
  const CAM_Z = 3.4, HEAD_CY = 0.185;
  const L = [0.4, 0.45, 0.8].map(v => v / Math.hypot(0.4, 0.45, 0.8));
  const cy = Math.cos(ry), sy = Math.sin(ry);
  const sxS = (W / 2) / 0.62, syS = (H / 2) / 0.62;

  // rotate + project verts
  const SX = new Float32Array(HEAD_N), SY = new Float32Array(HEAD_N), SZ = new Float32Array(HEAD_N);
  const NX = new Float32Array(HEAD_N), NY = new Float32Array(HEAD_N), NZ = new Float32Array(HEAD_N);
  const keep = new Uint8Array(HEAD_N);
  for (let i = 0; i < HEAD_N; i++) {
    const x = HEAD_POS[i*3], y = HEAD_POS[i*3+1], z = HEAD_POS[i*3+2];
    if (y < -0.48) continue;
    keep[i] = 1;
    const rx2 = x * cy + z * sy;          // world x
    const rz2 = -x * sy + z * cy;         // world z
    const dist = CAM_Z - rz2;
    if (dist <= 0.2) continue;
    const pers = CAM_Z / dist;
    SX[i] = W/2 + rx2 * sxS * pers;
    SY[i] = H/2 - (y - HEAD_CY) * syS * pers;
    SZ[i] = rz2;
    const nx = HEAD_NRM[i*3], ny = HEAD_NRM[i*3+1], nz = HEAD_NRM[i*3+2];
    NX[i] = nx * cy + nz * sy;
    NZ[i] = -nx * sy + nz * cy;
    NY[i] = ny;
  }

  const depth = new Float32Array(W*H).fill(-99);
  const tone = new Float32Array(W*H).fill(0);
  const RAMP = ' .:-=+*#%@';

  for (let t = 0; t < HEAD_TRI_COUNT; t++) {
    const a = HEAD_TRI[t*3], b = HEAD_TRI[t*3+1], c = HEAD_TRI[t*3+2];
    if (!keep[a] || !keep[b] || !keep[c]) continue;
    const nz = NZ[a]; // flat-ish: vertex normal of first vert
    if (nz <= 0.01) continue; // backface
    const x0=SX[a], y0=SY[a], x1=SX[b], y1=SY[b], x2=SX[c], y2=SY[c];
    const area = (x1-x0)*(y2-y0) - (x2-x0)*(y1-y0);
    if (Math.abs(area) < 0.02) continue;
    const minI = Math.max(0, Math.floor(Math.min(x0,x1,x2))), maxI = Math.min(W-1, Math.ceil(Math.max(x0,x1,x2)));
    const minJ = Math.max(0, Math.floor(Math.min(y0,y1,y2))), maxJ = Math.min(H-1, Math.ceil(Math.max(y0,y1,y2)));
    const d = Math.max(0, NX[a]*L[0] + NY[a]*L[1] + nz*L[2]);
    const sh = 0.25 + 0.65 * Math.pow(d, 1.2);
    const z0=SZ[a], z1=SZ[b], z2=SZ[c];
    for (let j = minJ; j <= maxJ; j++) {
      for (let i = minI; i <= maxI; i++) {
        const px = i + 0.5, py = j + 0.5;
        const w0 = ((x2-x1)*(py-y1) - (y2-y1)*(px-x1)) / area;
        const w1 = ((x0-x2)*(py-y2) - (y0-y2)*(px-x2)) / area;
        const w2 = 1 - w0 - w1;
        if (w0 < -0.05 || w1 < -0.05 || w2 < -0.05) continue;
        const idx = j*W + i;
        const z = w0*z0 + w1*z1 + w2*z2;
        if (z <= depth[idx]) continue;
        depth[idx] = z;
        tone[idx] = sh;
      }
    }
  }
  console.log(`\n── ${title} ──`);
  for (let j = 0; j < H; j++) {
    let row = '';
    for (let i = 0; i < W; i++) {
      const idx = j*W + i;
      row += depth[idx] > -98 ? RAMP[Math.min(RAMP.length-1, Math.floor(tone[idx]*RAMP.length))] : ' ';
    }
    console.log(row);
  }
}

render(0, 'ry = 0° (model +Z toward camera)');
render(Math.PI, 'ry = 180° (model -Z toward camera)');
