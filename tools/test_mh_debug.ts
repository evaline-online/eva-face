import { buildMesh, renderMultiView } from '../src/mhface3d';

const res = renderMultiView('default', [{ rx: 0, ry: 0, rz: 0, label: 'FRONT' }], 36, 30);
const W3 = 1 * 37; // views.length * (panelW + 1) = 37
let nonSpace = 0, total = 0;
for (let j = 0; j < 30; j++) {
  for (let i = 0; i < 37; i++) {
    const ch = res.chars[j][i];
    total++;
    if (ch && ch !== ' ') {
      nonSpace++;
      if (nonSpace < 30) process.stdout.write(ch);
    }
  }
}
console.log('\n\nnonSpace:', nonSpace, '/', total);
console.log('first non-space cells (col,row,ch,g):');
let cnt = 0;
for (let j = 0; j < 30 && cnt < 10; j++) {
  for (let i = 0; i < 37 && cnt < 10; i++) {
    if (res.chars[j][i] && res.chars[j][i] !== ' ') {
      console.log(`  (${i},${j}) = '${res.chars[j][i]}' g=${res.g[j][i]}`);
      cnt++;
    }
  }
}
