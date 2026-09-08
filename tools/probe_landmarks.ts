/**
 * Measure the REAL face landmarks from the mesh geometry:
 *   nose tip   = max z in central band
 *   eye pits   = min z (socket bottom) per side, upper face band
 *   brow ridge = max z per side above the eye pits
 *   lips       = max z in lower central band
 *   chin       = lowest jaw point
 * Prints measured coordinates to plug into FACE_STENCIL.
 */
import { HEAD_POS, HEAD_N } from '../src/headmodel.js';

const P: { x: number; y: number; z: number }[] = [];
for (let i = 0; i < HEAD_N; i++) P.push({ x: HEAD_POS[i*3], y: HEAD_POS[i*3+1], z: HEAD_POS[i*3+2] });

const inBox = (p: typeof P[0], x0: number, x1: number, y0: number, y1: number) =>
  p.x >= x0 && p.x <= x1 && p.y >= y0 && p.y <= y1;
const best = (test: (p: typeof P[0]) => boolean, pick: (a: typeof P[0], b: typeof P[0]) => number) => {
  let b: typeof P[0] | null = null;
  for (const p of P) if (test(p) && (!b || pick(p, b) < 0)) b = p;
  return b;
};

const nose   = best(p => inBox(p, -0.10, 0.10, 0.05, 0.40), (a, b) => b.z - a.z);   // max z
const eyeL   = best(p => inBox(p, -0.45, -0.05, 0.20, 0.45) && p.z > 0.30, (a, b) => a.z - b.z);  // min z on FRONT surface (socket)
const eyeR   = best(p => inBox(p,  0.05, 0.45, 0.20, 0.45) && p.z > 0.30, (a, b) => a.z - b.z);
// eyeball centre: max-z point of the eye region (sphere front)
const eyeBallL = best(p => inBox(p, -0.42, -0.12, 0.22, 0.44) && p.z > 0.30, (a, b) => b.z - a.z);
const eyeBallR = best(p => inBox(p,  0.12, 0.42, 0.22, 0.44) && p.z > 0.30, (a, b) => b.z - a.z);
const browL  = best(p => inBox(p, -0.45, -0.05, 0.42, 0.58), (a, b) => b.z - a.z);  // max z (ridge)
const browR  = best(p => inBox(p,  0.05, 0.45, 0.42, 0.58), (a, b) => b.z - a.z);
const mouth  = best(p => inBox(p, -0.15, 0.15, -0.10, 0.10), (a, b) => b.z - a.z);  // lips protrude
const chin   = best(p => inBox(p, -0.15, 0.15, -0.50, -0.25), (a, b) => b.z - a.z);
const cheekL = best(p => inBox(p, -0.45, -0.20, 0.00, 0.25), (a, b) => b.z - a.z);
const cheekR = best(p => inBox(p,  0.20, 0.45, 0.00, 0.25), (a, b) => b.z - a.z);
const topY   = Math.max(...P.map(p => p.y));

const fmt = (n: string, p: typeof P[0] | null) => console.log(n.padEnd(9), p ? `x=${p.x.toFixed(3)} y=${p.y.toFixed(3)} z=${p.z.toFixed(3)}` : 'NOT FOUND');
fmt('nose', nose); fmt('eyeL(socket)"', eyeL); fmt('eyeBallL', eyeBallL); fmt('eyeR(socket)"', eyeR); fmt('eyeBallR', eyeBallR); fmt('browL', browL); fmt('browR', browR);
fmt('mouth', mouth); fmt('chin', chin); fmt('cheekL', cheekL); fmt('cheekR', cheekR);
console.log('headTopY', topY.toFixed(3));
