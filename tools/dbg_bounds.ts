import { createFaceMesh } from '../src/face3d';
const mesh = createFaceMesh();
let minY = 99, maxY = -99, minX = 99, maxX = -99, minZ = 99, maxZ = -99;
const bands: Record<string, { n: number; minX: number; maxX: number }> = {};
for (const v of mesh.verts) {
  minY = Math.min(minY, v.pos.y); maxY = Math.max(maxY, v.pos.y);
  minX = Math.min(minX, v.pos.x); maxX = Math.max(maxX, v.pos.x);
  minZ = Math.min(minZ, v.pos.z); maxZ = Math.max(maxZ, v.pos.z);
  const k = (Math.floor(v.pos.y * 10) / 10).toFixed(1);
  if (!bands[k]) bands[k] = { n: 0, minX: 99, maxX: -99 };
  const b = bands[k];
  b.n++; b.minX = Math.min(b.minX, v.pos.x); b.maxX = Math.max(b.maxX, v.pos.x);
}
console.log('bounds x', minX.toFixed(2), maxX.toFixed(2), 'y', minY.toFixed(2), maxY.toFixed(2), 'z', minZ.toFixed(2), maxZ.toFixed(2), 'verts', mesh.verts.length);
for (const k of Object.keys(bands).sort().reverse()) {
  const b = bands[k];
  console.log('y', k, 'n', String(b.n).padStart(4), 'x', b.minX.toFixed(2), '..', b.maxX.toFixed(2));
}
