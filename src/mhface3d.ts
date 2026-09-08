// mhface3d.ts — multi-head + multi-view ASCII face renderer.
//
// Reuses the face projection/shading code from face3d.ts, but:
//   - swaps between 4 MakeHuman CC0 head variants (default/female/male/child)
//   - renders 3 camera angles side-by-side ("3-view matrix")
//
// All variants share the same coord convention (y-up, face +Z, ~0.95 units tall).
// The original Pinscreen head was [−x, y, −z] baked; MH is already [x, y, z]
// with face toward +Z, so we can pass the raw coordinates to the projection.

import { v3, rotateXYZ, v3norm } from './face3d.js';
import * as M0 from './headmodel_m0_default.js';
import * as M1 from './headmodel_m1_female.js';
import * as M2 from './headmodel_m2_male.js';
import * as M3 from './headmodel_m3_child.js';
import { createFaceMesh as _origCreate } from './face3d.js';
import { projectAndShade } from './face3d.js';

export type HeadVariant = 'default' | 'female' | 'male' | 'child';

interface HeadData {
  n: number; pos: Float32Array; nrm: Float32Array; tri: Uint32Array; triCount: number;
}

const HEADS: Record<HeadVariant, HeadData> = {
  default: { n: M0.HEAD_N, pos: M0.HEAD_POS, nrm: M0.HEAD_NRM, tri: M0.HEAD_TRI, triCount: M0.HEAD_TRI_COUNT },
  female:  { n: M1.HEAD_N, pos: M1.HEAD_POS, nrm: M1.HEAD_NRM, tri: M1.HEAD_TRI, triCount: M1.HEAD_TRI_COUNT },
  male:    { n: M2.HEAD_N, pos: M2.HEAD_POS, nrm: M2.HEAD_NRM, tri: M2.HEAD_TRI, triCount: M2.HEAD_TRI_COUNT },
  child:   { n: M3.HEAD_N, pos: M3.HEAD_POS, nrm: M3.HEAD_NRM, tri: M3.HEAD_TRI, triCount: M3.HEAD_TRI_COUNT },
};

// MH head is ~0.95 units tall (y=0..0.95). Centroid y ≈ 0.475. The original
// face3d.ts uses HEAD_CY=0.185 (for the Pinscreen head which spans −0.48..0.83).
// Override HEAD_CY for the MH head so the eyes land at screen center.
export const MH_HEAD_CY = 0.475;

export function buildMesh(variant: HeadVariant = 'default') {
  const h = HEADS[variant];
  const verts: any[] = [];
  for (let i = 0; i < h.n; i++) {
    const px = h.pos[i * 3], py = h.pos[i * 3 + 1], pz = h.pos[i * 3 + 2];
    // MH head: y is up, face toward +Z. NO rotation needed (unlike Pinscreen).
    // Crop the very base (y < 0.02) to remove any neck-stub artifacts.
    if (py < 0.02) continue;
    verts.push({
      local: v3(px, py, pz),
      pos: v3(px, py, pz),
      norm: v3(h.nrm[i * 3], h.nrm[i * 3 + 1], h.nrm[i * 3 + 2]),
      screen: v3(0, 0, 0),
    });
  }
  // remap face indices for the crop
  const oldToNew = new Int32Array(h.n);
  oldToNew.fill(-1);
  let ni = 0;
  for (let i = 0; i < h.n; i++) {
    if (h.pos[i * 3 + 1] >= 0.02) oldToNew[i] = ni++;
  }
  const faces: any[] = [];
  for (let t = 0; t < h.triCount; t++) {
    const a = oldToNew[h.tri[t * 3]], b = oldToNew[h.tri[t * 3 + 1]], c = oldToNew[h.tri[t * 3 + 2]];
    if (a < 0 || b < 0 || c < 0) continue;
    faces.push({ i0: a, i1: b, i2: c, center: v3(0, 0, 0), norm: v3(0, 0, 0) });
  }
  return { verts, faces };
}

// Cached meshes per variant
const _meshCache: Record<string, any> = {};
export function getMesh(variant: HeadVariant) {
  if (!_meshCache[variant]) _meshCache[variant] = buildMesh(variant);
  return _meshCache[variant];
}

// Render multiple views of the same variant into a single grid.
// views: array of [rx, ry, rz, label] camera angles.
//   - returns a flat char grid plus per-cell colors.
// Layout: views side-by-side, each panel of (panelW × panelH) cells,
//         separated by a 1-col gap.
export interface ViewSpec { rx: number; ry: number; rz: number; label: string; }

export interface MultiViewResult {
  chars: string[][];    // [row][col] = char
  r: number[][];        // red
  g: number[][];        // green
  b: number[][];        // blue
  cellAspect: number;
  panelW: number;
  panelH: number;
  views: ViewSpec[];
}

// Local copy of the projection to allow different HEAD_CY per call without
// modifying the module-level HEAD_CY in face3d.ts (which is shared with
// other consumers).
import { CAM_Z } from './face3d.js';

function rotXYZ(p: { x: number; y: number; z: number }, a: number, b: number, c: number) {
  return rotateXYZ(p, a, b, c);
}
function v3nrm(p: { x: number; y: number; z: number }) {
  return v3norm(p);
}

function projectMesh(mesh: any, rx: number, ry: number, rz: number,
                    W: number, H: number, aspect: number, headCY: number) {
  const halfW = W / 2, halfH = H / 2;
  // tighter scale for taller heads (MH head is 0.95 tall, slightly bigger than Pinscreen)
  const scale = Math.min(W / 3.5, H / 1.7);
  const sx = scale * (0.9 / aspect) * 1.12;
  const sy = scale;
  const lightDir = v3norm(v3(0.4, 0.45, 0.8));
  const verts = mesh.verts;
  let maxRZ = -Infinity;
  for (let i = 0; i < verts.length; i++) {
    const v = verts[i];
    const rotated = rotXYZ(v.pos, rx, ry, rz);
    v.norm = v3nrm(rotXYZ(v.norm, rx, ry, rz));
    const dist = CAM_Z - rotated.z;
    if (dist <= 0.22) { v.screen = { x: -9999, y: -9999, z: -9999 }; continue; }
    const pers = CAM_Z / dist;
    v.screen = {
      x: halfW + rotated.x * sx * pers,
      y: halfH - (rotated.y - headCY) * sy * pers,
      z: rotated.z,
    };
    if (rotated.z > maxRZ) maxRZ = rotated.z;
  }
  // Initialize cells
  const cells: any[] = [];
  for (let j = 0; j < H; j++) { cells.push([]); for (let i = 0; i < W; i++) cells[j].push({ ch: ' ', r: 0, g: 0, b: 0, depth: -99 }); }
  const cellCount = W * H;
  const cellDepth = new Float32Array(cellCount).fill(-99);
  const cellNX = new Float32Array(cellCount);
  const cellNY = new Float32Array(cellCount);
  const cellNZ = new Float32Array(cellCount);
  const cellY = new Float32Array(cellCount);
  for (let i = 0; i < verts.length; i++) {
    const v = verts[i];
    if (v.screen.x < 0) continue;
    const cx = Math.round(v.screen.x);
    const cy = Math.round(v.screen.y);
    if (cx < 0 || cx >= W || cy < 0 || cy >= H) continue;
    const z = v.screen.z;
    if (z <= 0.05) continue;
    for (let dj = -1; dj <= 1; dj++) {
      const ny2 = cy + dj; if (ny2 < 0 || ny2 >= H) continue;
      for (let di = -1; di <= 1; di++) {
        const nx2 = cx + di; if (nx2 < 0 || nx2 >= W) continue;
        const idx = ny2 * W + nx2;
        if (z <= cellDepth[idx]) continue;
        cellDepth[idx] = z; cellNX[idx] = v.norm.x; cellNY[idx] = v.norm.y; cellNZ[idx] = v.norm.z; cellY[idx] = v.pos.y;
      }
    }
  }
  // Finalize silhouette (no stencil — MH mesh has plenty of detail, we want pure mesh shading)
  for (let j = 0; j < H; j++) {
    for (let i = 0; i < W; i++) {
      const idx = j * W + i;
      const z = cellDepth[idx];
      if (z <= -98) continue;
      const nx = cellNX[idx], ny = cellNY[idx], nz = cellNZ[idx];
      const d = Math.max(0, nx * lightDir.x + ny * lightDir.y + nz * lightDir.z);
      const relZ = Math.max(0, maxRZ - z);
      const proud = Math.min(relZ * 0.25, 0.08);
      let inten = 0.55 + 0.18 * Math.pow(d, 1.5) + proud;
      const f = nz;
      if (f < 0.25) inten *= Math.max(0.10, f / 0.25);
      if (cellY[idx] < 0.05) inten *= 0.85;
      inten = Math.max(0.10, Math.min(1, inten));
      const cell = cells[j][i];
      const i2 = inten;
      const g = Math.floor(i2 * 255);
      const r = Math.floor(i2 * 95);
      const b = Math.floor(i2 * 95);
      cell.ch = pickChar(i2);
      cell.r = r; cell.g = g; cell.b = b; cell.depth = z;
    }
  }
  // Contour darkening
  for (let j = 0; j < H; j++) {
    for (let i = 0; i < W; i++) {
      const cell = cells[j][i];
      if (cell.depth <= -98) continue;
      const interior = j > 0 && cells[j-1][i].depth > -98 && j < H-1 && cells[j+1][i].depth > -98
                     && i > 0 && cells[j][i-1].depth > -98 && i < W-1 && cells[j][i+1].depth > -98;
      if (interior) continue;
      const inten = Math.max(0.12, (cell.g / 255) * 0.5);
      const i2 = inten;
      cell.g = Math.floor(i2 * 255);
      cell.r = Math.floor(i2 * 95);
      cell.b = Math.floor(i2 * 95);
      cell.ch = pickChar(i2);
    }
  }

  // Face features — simple ellipses anchored to the head. Painted AFTER the
  // mesh silhouette so they read as a face. Coordinates are in the MH head
  // local frame (y=0..0.95 neck→top).
  paintFaceStencils(cells, rx, ry, rz, W, H, aspect);
  return cells;
}

// Face landmarks calibrated for the MakeHuman head (y=0..0.95, x=±0.5, z up
// to 0.5). Each entry paints a 2-D ellipse in screen space by projecting the
// feature centre and scaling rx/ry by the screen transform.
interface MHFaceFeature {
  name: string; lx: number; ly: number; lz: number; rx: number; ry: number; tone: number;
}
const MH_FEATURES: MHFaceFeature[] = [
  { name: 'eye_l',     lx: -0.11, ly: 0.55, lz: 0.50, rx: 0.080, ry: 0.038, tone: 0.10 },
  { name: 'eye_r',     lx:  0.11, ly: 0.55, lz: 0.50, rx: 0.080, ry: 0.038, tone: 0.10 },
  { name: 'brow_l',    lx: -0.11, ly: 0.66, lz: 0.50, rx: 0.090, ry: 0.022, tone: 0.88 },
  { name: 'brow_r',    lx:  0.11, ly: 0.66, lz: 0.50, rx: 0.090, ry: 0.022, tone: 0.88 },
  { name: 'nose',      lx:  0,    ly: 0.40, lz: 0.55, rx: 0.035, ry: 0.060, tone: 0.85 },
  { name: 'nose_tip',  lx:  0,    ly: 0.30, lz: 0.55, rx: 0.045, ry: 0.030, tone: 0.75 },
  { name: 'mouth',     lx:  0,    ly: 0.18, lz: 0.50, rx: 0.130, ry: 0.022, tone: 0.10 },
  { name: 'chin',      lx:  0,    ly: 0.08, lz: 0.55, rx: 0.080, ry: 0.040, tone: 0.65 },
  { name: 'hair',      lx:  0,    ly: 0.85, lz: 0.30, rx: 0.450, ry: 0.080, tone: 0.12 },
];

function paintFaceStencils(cells: any[][], rx: number, ry: number, rz: number,
                           W: number, H: number, aspect: number) {
  const scale = Math.min(W / 3.5, H / 1.95);
  const sx = scale * (0.9 / aspect) * 1.12;
  const sy = scale;
  for (const f of MH_FEATURES) {
    const rot = rotateXYZ({ x: f.lx, y: f.ly, z: f.lz }, rx, ry, rz);
    const dist = CAM_Z - rot.z;
    if (dist <= 0.22) continue;
    const pers = CAM_Z / dist;
    const pcx = W / 2 + rot.x * sx * pers;
    const pcy = H / 2 - (rot.y - MH_HEAD_CY) * sy * pers;
    const rrX = Math.max(1, f.rx * sx * pers);
    const rrY = Math.max(1, f.ry * sy * pers);
    const x0 = Math.max(0, Math.floor(pcx - rrX));
    const x1 = Math.min(W - 1, Math.ceil(pcx + rrX));
    const y0 = Math.max(0, Math.floor(pcy - rrY));
    const y1 = Math.min(H - 1, Math.ceil(pcy + rrY));
    const tone = Math.max(0.10, Math.min(1, f.tone));
    for (let j = y0; j <= y1; j++) {
      for (let i = x0; i <= x1; i++) {
        if (cells[j][i].depth <= -98) continue; // only inside the head silhouette
        const dx = (i - pcx) / rrX;
        const dy = (j - pcy) / rrY;
        if (dx * dx + dy * dy > 1) continue;
        const i2 = tone;
        cells[j][i].ch = pickChar(i2);
        cells[j][i].r = Math.floor(i2 * 95);
        cells[j][i].g = Math.floor(i2 * 255);
        cells[j][i].b = Math.floor(i2 * 95);
      }
    }
  }
}

const RAMP_BLOCK = ' ░▒▓█';
function pickChar(intensity: number): string {
  // Binary face (per spec): only '0' and '1' — '1' = lit, '0' = shadow/ink.
  const i = Math.max(0, Math.min(1, intensity));
  return i > 0.48 ? '1' : '0';
}

export function renderMultiView(
  variant: HeadVariant,
  views: ViewSpec[],
  panelW: number,
  panelH: number,
): MultiViewResult {
  const mesh = getMesh(variant);
  const gap = 1;
  const W = views.length * panelW + (views.length - 1) * gap;
  const H = panelH;
  const aspect = 0.55;
  const chars: string[][] = [];
  const r: number[][] = []; const g: number[][] = []; const b: number[][] = [];
  for (let j = 0; j < H; j++) { chars.push(new Array(W).fill(' ')); r.push(new Array(W).fill(0)); g.push(new Array(W).fill(0)); b.push(new Array(W).fill(0)); }
  for (let vi = 0; vi < views.length; vi++) {
    const v = views[vi];
    const cells = projectMesh(mesh, v.rx, v.ry, v.rz, panelW, panelH, aspect, MH_HEAD_CY);
    const x0 = vi * (panelW + gap);
    for (let j = 0; j < panelH; j++) {
      for (let i = 0; i < panelW; i++) {
        const c = cells[j][i];
        const x = x0 + i;
        if (c.ch && c.ch !== ' ') {
          chars[j][x] = c.ch;
          r[j][x] = c.r; g[j][x] = c.g; b[j][x] = c.b;
        }
      }
    }
  }
  return { chars, r, g, b, cellAspect: aspect, panelW, panelH, views };
}
