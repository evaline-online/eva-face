import { createFaceMesh, projectAndShade } from '../src/face3d';
const W = 120, H = 45;
const mesh = createFaceMesh();
const res = projectAndShade(mesh, 0, 0, 0, W, H, 9 / 16);
const cells = res.cells;
let out = '';
for (let j = 0; j < H; j++) {
  let row = '';
  for (let i = 0; i < W; i++) {
    const c = cells[j][i];
    if (c.depth <= -98) { row += '.. '; continue; }
    const v = Math.round((c.g / 255) * 100);
    row += (v < 10 ? '0' : v < 100 ? String(v) : 'XX') + ' ';
  }
  out += row.replace(/\s+$/, '') + '\n';
}
console.log(out);
