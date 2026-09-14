import { createFaceMesh, projectAndShade } from '../src/face3d';
const mesh = createFaceMesh();
const res = projectAndShade(mesh, 0, 0, 0, 142, 45, 9 / 16);
// re-project to find which local y each row comes from
const W = 142, H = 45;
const rowY: Record<number, { min: number; max: number; n: number; minZ: number; maxZ: number }> = {};
for (const v of mesh.verts) {
  if (v.screen.x < 0 || v.screen.x >= W || v.screen.y < 0 || v.screen.y >= H) continue;
  if (v.screen.z <= 0.05) continue;
  const j = Math.round(v.screen.y);
  if (!rowY[j]) rowY[j] = { min: 9, max: -9, n: 0, minZ: 9, maxZ: -9 };
  const r = rowY[j];
  r.min = Math.min(r.min, v.pos.y); r.max = Math.max(r.max, v.pos.y);
  r.minZ = Math.min(r.minZ, v.pos.z); r.maxZ = Math.max(r.maxZ, v.pos.z);
  r.n++;
}
for (let j = 0; j < H; j++) {
  const r = rowY[j];
  if (!r) continue;
  console.log('row', String(j).padStart(2), 'y', r.min.toFixed(2), '..', r.max.toFixed(2), 'z', r.minZ.toFixed(2), '..', r.maxZ.toFixed(2), 'n', r.n);
}
