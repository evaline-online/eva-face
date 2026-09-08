import { buildMesh, renderMultiView } from '../src/mhface3d';
import { writeFileSync } from 'node:fs';

const views = [
  { rx: 0, ry: 0, rz: 0, label: 'FRONT' },
  { rx: 0, ry: -0.6, rz: 0, label: '3/4' },
  { rx: 0, ry: -Math.PI / 1.4, rz: 0, label: 'SIDE' },
];
const res = renderMultiView('default', views, 50, 32);
const panelW = res.panelW, panelH = res.panelH;
const W = views.length * (panelW + 1);
console.log('panelW:', panelW, 'panelH:', panelH, 'W:', W);

let html = '<pre style="font-family:monospace; line-height:1.0; color:#0f0; background:#000;">\n';
for (let j = 0; j < panelH; j++) {
  let line = '';
  for (let i = 0; i < W; i++) {
    line += res.chars[j][i] || ' ';
  }
  html += line + '\n';
}
html += '</pre>';
writeFileSync('/tmp/mh_preview.html', html);
console.log('wrote /tmp/mh_preview.html');
