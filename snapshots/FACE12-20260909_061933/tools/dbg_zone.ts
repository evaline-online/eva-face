import { createFaceMesh, projectAndShade } from '../src/face3d';
const mesh = createFaceMesh();
const res = projectAndShade(mesh, 0, 0, 0, 142, 45, 9 / 16);
for (let j = 9; j <= 22; j++) {
  let line = '';
  for (let i = 50; i <= 70; i++) {
    const c = res.cells[j][i];
    if (c.depth <= -98) { line += '  ..'; continue; }
    const v = Math.round((c.g / 255) * 100);
    line += String(v).padStart(3, '0') + ' ';
  }
  console.log('r' + String(j).padStart(2), line);
}
