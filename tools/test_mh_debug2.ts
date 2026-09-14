import { buildMesh, renderMultiView } from '../src/mhface3d';

const res = renderMultiView('default', [{ rx: 0, ry: 0, rz: 0, label: 'FRONT' }], 36, 30);
const W3 = 37;
console.log('drawing head on 36x30 panel:');
for (let j = 0; j < 30; j++) {
  let line = '';
  for (let i = 0; i < 37; i++) {
    const ch = res.chars[j][i];
    line += ch && ch !== ' ' ? ch : '.';
  }
  console.log(`${String(j).padStart(2)}: ${line}`);
}
