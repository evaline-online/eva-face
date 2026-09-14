import { createFaceMesh, projectAndShade, projectPoint } from '../src/face3d';
const mesh = createFaceMesh();
const res = projectAndShade(mesh, 0, 0.35, 0, 142, 45, 9/16);
const cells = res.cells;
const eye = projectPoint(-0.115, 0.335, 0.60, 0, 0.35, 0, 142, 45, 9/16);
console.log('eye at', eye.x.toFixed(1), eye.y.toFixed(1));
for (let j = Math.round(eye.y)-3; j <= Math.round(eye.y)+3; j++) {
  let line = `r${j.toString().padStart(2)}: `;
  for (let i = Math.round(eye.x)-3; i <= Math.round(eye.x)+3; i++) {
    const c = cells[j]?.[i];
    if (!c || c.depth <= -98) { line += ' ..'; continue; }
    const v = Math.round((c.g/255)*100);
    line += v < 10 ? ' 0' : (v < 100 ? String(v) : 'XX') + ' ';
  }
  console.log(line);
}
