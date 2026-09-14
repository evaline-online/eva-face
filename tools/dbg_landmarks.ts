import { createFaceMesh, projectAndShade } from '../src/face3d';
const W = 80, H = 40;
const mesh = createFaceMesh();
const res = projectAndShade(mesh, 0, 0, 0, W, H, 0.5);
const cells = res.cells;
const marks: Record<string,string> = {
  BROW_L: 'BR', BROW_R: 'BR', EYE_L:'EY', EYE_R:'EY', NOSTR_L:'NS', NOSTR_R:'NS',
  MOUTH:'MO', LIP_LOW:'LP', CHIN:'CH', JAW_L:'JW', JAW_R:'JW', HAIR:'HR', NOSE_TIP:'NT',
};
for (let j = 0; j < H; j++) {
  let row = '';
  for (let i = 0; i < W; i++) {
    const c = cells[j][i];
    const g = c.g / 255;
    const tag = marks[j + '_' + i] || '';
    if (c.depth <= -98) { row += ' '; continue; }
    const v = Math.round(g*100);
    if (v >= 40) row += '0'; else if (v >= 10) row += String.fromCharCode(97 + Math.floor(v/10)); else row += '.';
  }
  console.log(String(j).padStart(2) + ' ' + row);
}
