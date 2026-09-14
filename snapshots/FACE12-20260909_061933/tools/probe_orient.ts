/**
 * Geometry probe: which way does the mesh actually face?
 * For a +Z-facing head: nose (y≈0.2-0.3) protrudes to z>0.6; skull back z≈-0.3.
 */
import { HEAD_POS, HEAD_N } from '../src/headmodel.js';

let noseZmax = -9, noseZmin = 9;      // band around nose level
let eyeZmax = -9, eyeZmin = 9;        // band around eye level
let frontCount = 0, backCount = 0;    // verts beyond ±0.55
for (let i = 0; i < HEAD_N; i++) {
  const x = HEAD_POS[i*3], y = HEAD_POS[i*3+1], z = HEAD_POS[i*3+2];
  if (Math.abs(x) < 0.12) {           // central strip (nose / mouth vertical band)
    if (y > 0.15 && y < 0.32) { if (z > noseZmax) noseZmax = z; if (z < noseZmin) noseZmin = z; }
    if (y > 0.28 && y < 0.40) { if (z > eyeZmax) eyeZmax = z; if (z < eyeZmin) eyeZmin = z; }
  }
  if (y > -0.1 && y < 0.5) {          // face band
    if (z >  0.55) frontCount++;
    if (z < -0.55) backCount++;
  }
}
console.log({ noseZmax, noseZmin, eyeZmax, eyeZmin, frontCount, backCount });
console.log('=> mesh faces', noseZmax > Math.abs(noseZmin) ? '+Z (front view OK)' : '-Z (FRONT VIEW SHOWS THE BACK OF THE HEAD — mesh must be flipped)');
