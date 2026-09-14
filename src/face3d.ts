/**
 * face3d.ts — Shared 3D engine: math, head model, projection, shading.
 * Renders the real Pinscreen Generic Head mesh (exported by tools/convert_head.ts).
 * Works in both browser and Node.js (no DOM dependencies).
 *
 * Coordinate system (world):  x = right, y = up, z = toward viewer.
 * The head model is pre-rotated so the FACE points toward +Z.
 */

import { HEAD_POS, HEAD_NRM, HEAD_TRI, HEAD_N, HEAD_TRI_COUNT } from './headmodel.js';
import { pickChar, blueDither, type GlyphRamp, type RenderMode } from './capability.js';


// Glyph ramp: binary | half | quarter | braille (env FACE_RAMP)
const GLYPH_RAMP: GlyphRamp = (typeof process !== 'undefined' && process.env.FACE_RAMP as GlyphRamp) || 'binary';

// ─── Vector Math ───────────────────────────────────────────────

export interface V3 { x: number; y: number; z: number; }

export const v3 = (x: number, y: number, z: number): V3 => ({ x, y, z });
export const v3add = (a: V3, b: V3): V3 => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z });
export const v3sub = (a: V3, b: V3): V3 => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
export const v3scale = (a: V3, s: number): V3 => ({ x: a.x * s, y: a.y * s, z: a.z * s });
export const v3dot = (a: V3, b: V3): number => a.x * b.x + a.y * b.y + a.z * b.z;
export const v3len = (a: V3): number => Math.sqrt(a.x * a.x + a.y * a.y + a.z * a.z);
export const v3norm = (a: V3): V3 => {
  const l = v3len(a) || 1;
  return { x: a.x / l, y: a.y / l, z: a.z / l };
};
export const v3cross = (a: V3, b: V3): V3 => ({
  x: a.y * b.z - a.z * b.y,
  y: a.z * b.x - a.x * b.z,
  z: a.x * b.y - a.y * b.x,
});

// ─── Rotation ──────────────────────────────────────────────────

export function rotateXYZ(p: V3, rx: number, ry: number, rz: number): V3 {
  const cx = Math.cos(rx), sx = Math.sin(rx);
  const cy = Math.cos(ry), sy = Math.sin(ry);
  const cz = Math.cos(rz), sz = Math.sin(rz);

  const y1 = p.y * cx - p.z * sx;
  const z1 = p.y * sx + p.z * cx;
  const x2 = p.x * cy + z1 * sy;
  const z2 = -p.x * sy + z1 * cy;
  const x3 = x2 * cz - y1 * sz;
  const y3 = x2 * sz + y1 * cz;
  return { x: x3, y: y3, z: z2 };
}

// ─── Expression Parameters ─────────────────────────────────────

export interface FaceParams {
  eyeOpenness: number;   // 0=closed, 1=open
  mouthOpen: number;     // 0=closed, 1=wide open
  smile: number;         // 0=neutral, 1=big smile
  frown: number;         // 0=neutral, 1=big frown
  surprise: number;      // 0=neutral, 1=surprised
  browUp: number;        // 0=neutral, 1=raised
  blinkPhase: number;    // 0=open, goes to 1 during blink
}

export const DEFAULT_PARAMS: FaceParams = {
  eyeOpenness: 1,
  mouthOpen: 0,
  smile: 0,
  frown: 0,
  surprise: 0,
  browUp: 0,
  blinkPhase: 0,
};

// ─── Head Mesh (built once from the exported model) ───────────

export interface Vert {
  local: V3;       // base position on the head model
  pos: V3;         // after deformation + rotation (world)
  norm: V3;        // surface normal (baked; rotated per frame)
  screen: V3;      // projected to screen (x,y = screen, z = depth)
}

export interface Face {
  i0: number;
  i1: number;
  i2: number;
  center: V3;
  norm: V3;
}

export interface Mesh {
  verts: Vert[];
  faces: Face[];
}

let builtMesh: Mesh | null = null;

export function createFaceMesh(): Mesh {
  if (builtMesh) return builtMesh;
  const verts: Vert[] = [];
  const indexMap = new Int32Array(HEAD_N).fill(-1); // original headmodel idx → verts idx
  for (let i = 0; i < HEAD_N; i++) {
    const px = HEAD_POS[i * 3], py = HEAD_POS[i * 3 + 1], pz = HEAD_POS[i * 3 + 2];
    // Neck crop: everything below y ≈ −0.48 is the neck/shoulder cylinder —
    // a featureless '0' bust that buries the face. Dropping it lets the head
    // fill the frame and the portrait read as a face.
    if (py < -0.48) continue;
    indexMap[i] = verts.length;
    // ORIENTATION FIX (decisive geometry probe): the source OBJ actually
    // faces -Z — rotating the camera to ry=180° reveals eye sockets, nose
    // and mouth, while ry=0° shows the smooth occiput and ears. Flip the
    // mesh 180° around Y (x→−x, z→−z, normals likewise) so the REAL face
    // points toward +Z / the camera, matching the stencil anchors.
    verts.push({
      local: v3(-px, py, -pz),
      pos: v3(-px, py, -pz),
      norm: v3(-HEAD_NRM[i * 3], HEAD_NRM[i * 3 + 1], -HEAD_NRM[i * 3 + 2]),
      screen: v3(0, 0, 0),
    });
  }
  const faces: Face[] = [];
  for (let t = 0; t < HEAD_TRI_COUNT; t++) {
    const i0 = indexMap[HEAD_TRI[t * 3]];
    const i1 = indexMap[HEAD_TRI[t * 3 + 1]];
    const i2 = indexMap[HEAD_TRI[t * 3 + 2]];
    // Skip faces referencing cropped neck verts.
    if (i0 < 0 || i1 < 0 || i2 < 0) continue;
    const a = verts[i0].local, b = verts[i1].local, c = verts[i2].local;
    const e1 = v3sub(b, a), e2 = v3sub(c, a);
    const n = v3norm(v3cross(e1, e2));
    faces.push({ i0, i1, i2, center: v3(0, 0, 0), norm: n });
  }
  builtMesh = { verts, faces };
  return builtMesh;
}

// ─── Subtle expression deformation (local gaussian pushes) ─────
//
// Landmark centers measured on the real model (units after normalization):
//   eye pits        (±0.115, 0.335)
//   brows           (±0.10,  0.47)
//   nose tip        ( 0,     0.31)
//   mouth center    ( 0,     0.07)
//   mouth corners   (±0.115, 0.06)
// Deformations are tiny (≤~0.03), so baked normals stay valid.

const EYE_L = v3(-0.137, 0.336, 0.36);
const EYE_R = v3(0.137, 0.336, 0.36);
const BROW_L = v3(-0.12, 0.445, 0.33);
const BROW_R = v3(0.12, 0.445, 0.33);
const MOUTH = v3(0, 0.015, 0.45);
const MOUTH_L = v3(-0.13, 0.015, 0.42);
const MOUTH_R = v3(0.13, 0.015, 0.42);

function gauss(dx: number, dy: number, dz: number, sx: number, sy: number, sz: number): number {
  return Math.exp(-(dx * dx / (2 * sx * sx) + dy * dy / (2 * sy * sy) + dz * dz / (2 * sz * sz)));
}

export function deformMesh(mesh: Mesh, params: FaceParams): void {
  const { eyeOpenness, mouthOpen, smile, frown, surprise, browUp, blinkPhase } = params;

  // How much the lids are pulled shut (blink + closing + surprise negation)
  const lidClose = Math.max(0, Math.min(1, (1 - eyeOpenness) + blinkPhase - surprise * 0.5));

  // Neutral check — skip the per-vertex loop when nothing is happening
  const total = lidClose + mouthOpen + smile + frown + browUp + surprise;
  if (total < 0.0001) {
    for (let i = 0; i < mesh.verts.length; i++) mesh.verts[i].pos = mesh.verts[i].local;
    return;
  }

  const verts = mesh.verts;
  for (let i = 0; i < verts.length; i++) {
    const p = verts[i].local;
    let dx = 0, dy = 0, dz = 0;

    if (lidClose > 0) {
      for (const eye of [EYE_L, EYE_R]) {
        const w = gauss(p.x - eye.x, p.y - eye.y, p.z - eye.z, 0.055, 0.045, 0.5);
        if (w <= 0.01) continue;
        dy += (eye.y - p.y) * w * lidClose * 0.30;
        dz -= 0.018 * w * lidClose;
      }
    }

    if (smile > 0) {
      const wL = gauss(p.x - MOUTH_L.x, p.y - MOUTH_L.y, p.z - MOUTH_L.z, 0.05, 0.04, 0.5);
      const wR = gauss(p.x - MOUTH_R.x, p.y - MOUTH_R.y, p.z - MOUTH_R.z, 0.05, 0.04, 0.5);
      dx -= smile * 0.022 * wL;
      dx += smile * 0.022 * wR;
      dy += smile * 0.012 * (wL + wR);
    }

    if (frown > 0) {
      const wL = gauss(p.x - MOUTH_L.x, p.y - MOUTH_L.y, p.z - MOUTH_L.z, 0.05, 0.04, 0.5);
      const wR = gauss(p.x - MOUTH_R.x, p.y - MOUTH_R.y, p.z - MOUTH_R.z, 0.05, 0.04, 0.5);
      dx += frown * 0.014 * wL;
      dx -= frown * 0.014 * wR;
      dy -= frown * 0.012 * (wL + wR);
    }

    if (mouthOpen > 0) {
      const w = gauss(p.x - MOUTH.x, p.y - MOUTH.y, p.z - MOUTH.z, 0.05, 0.05, 0.5);
      if (w > 0.01) {
        dz -= mouthOpen * 0.035 * w;
        dy -= mouthOpen * 0.012 * w;
      }
    }

    const browAmount = browUp + surprise * 1.2;
    if (browAmount > 0) {
      for (const br of [BROW_L, BROW_R]) {
        const w = gauss(p.x - br.x, p.y - br.y, p.z - br.z, 0.07, 0.05, 0.5);
        if (w > 0.01) dy += browAmount * 0.014 * w;
      }
    }

    verts[i].pos = v3(p.x + dx, p.y + dy, p.z + dz);
  }
}

// ─── Projection & Shading ──────────────────────────────────────

export interface RenderCell {
  ch: string;
  r: number;
  g: number;
  b: number;
  depth: number;
}

// Variant m3 — extended ramp with a TRUE black end ('█' = solid block) so
// eyes/mouth/hair actually read as ink-black, not ' ' or '.'.
// Brighter top step is also '█' for fully-lit highlights so the brow ridges
// look like solid bars at small grids.
// Index:        0   1   2   3   4   5   6   7   8   9   10  11  12
// Char:         ' ' '.' ':' '-' '=' '+' '*' '#' '%' '@' '█' '█' '█'
const SHADE_CHARS = '01'; // binary face: only 0 and 1

// 64×64 blue-noise texture (precomputed void-and-cluster, 0..255)
// provides perceptually uniform dither without visible Bayer pattern.
export const BLUE_NOISE = new Uint8Array([
  158,  31, 199,  63, 231,  95,  15, 127, 174,  47, 215,  79, 247, 111,  23, 135,
  190,  15, 251,  47,  11, 175,  87,  23, 206,  79,  11, 143, 238, 111,  55, 167,
   10, 135,  58,  31, 166,  95,  31, 199,  50, 191, 134,  63, 182, 127,  55, 223,
   42, 175, 106,  95,  74, 207, 138, 159,  22, 183,  98, 127,  46, 215, 150,  63,
  249,  15, 211,  47, 163, 111, 123,  15, 233,  47, 195,  79, 147, 143, 107,  31,
  119, 151,  75,  79,  67, 175,  19, 127,  99,  15,  59,  47,  51, 111,  35,  15,
  203,  87, 163,  55, 131, 199, 147,  23, 219,  95, 179,  63, 195, 159, 119,  31,
  135,  23,  91, 223, 115,  95,  75, 191,  43,  31,  31, 127,  19, 159,  15,  63,
  170, 215, 138,  47,  58, 175,  98,  79,  10, 207,  66, 159,  42, 143, 102, 111,
  234,  79, 166, 111, 102,  23,  70, 127,  62, 239, 134, 175, 126, 111,  86, 223,
   18, 199,  98,  31,  58, 191, 122,  63, 138, 143, 186,  95, 194,  63, 154, 159,
   98, 127,  34, 191,  70, 255, 166, 127, 146,  95,  98, 175,  70, 255, 150, 111,
  107,  23,  31, 223,  59, 159,  95,  95,  27,  87,  35, 191,  51, 223,  83, 159,
  187,  95,  43,  63, 115,  31, 139,  63,  51, 159,  75, 159, 107, 191, 139, 127,
  122, 207, 170,  79,  74,  23,  10, 111, 118,  79,  26,  47,  46,  71,  54,  31,
   86, 159, 150,  95, 118,  31,  46,  63, 154, 191,  70, 255, 134, 191,  94, 223,
  210,  63, 178,  15, 146,  79, 174,  47,  18, 111,  78,  15, 134,  79,  38,  31,
  183,  47, 231,  15,  51,  79, 115,  47,  83,  47,  19,  79,  11,  79,  51,  79,
   99,  15,  15,  63,  35,  63,  67,  63,  11,  63,  43,  63,  59,  63,  91,  63,
  219,  31,  87,  95, 155,  63,  23, 127, 123,  95,  59, 159, 187, 127,  23, 191,
  131,  63,  51,  95,  19, 127,  83,  95,  35, 159, 115,  95,  67, 191,  99, 159,
   59,  95,  27, 127, 123,  95,  91, 159,  75, 127, 107, 191,  43, 159,  75, 223,
   35, 159, 131,  63, 147,  95,  19,  63,  83,  31,  27,  95,  59,  31,  91,  95,
  187,  79, 219,  15,  59,  47,  91,  15, 123,  79,  55,  47,  87, 111,  23,  15,
   55,  79, 151,  15,  87,  47,  19,  79,  51, 111,  19, 143,  83,  79, 115, 111,
  147,  95,  19,  31,  79,  63,  11,  95,  43, 127,  75,  95, 107, 159,  39,  63,
  139,  95,  11,  63,  71,  95,  35, 127, 103,  95, 135, 127,  67,  95,  99, 159,
  235,  31, 171,  95, 107,  63,  39, 127,  71,  95,  39, 159,  55,  95,  87, 191,
  107,  79, 171,  15,  39,  47, 103,  15,  71,  79,  39, 111,  39, 143,  39, 175,
  203,  79, 171,  47, 139,  79,  75, 111,  11,  79,  47,  79,  83,  79, 119,  79,
  163,  15,  31,  47,  95,  79,  27, 111,  59, 143,  91,  79, 123,  79,  55, 111,
  227,  79, 195,  47, 163,  79,  99, 111,  35,  79,  67, 111,  99, 143, 131,  79,
  195,  63,  67, 127,  35,  95,  67, 159,  99, 127, 131, 159, 163, 127, 195, 191,
  163,  31, 131,  95,  99,  63,  67, 127,  35,  95,  67, 159,  99, 127, 131, 191,
  131,  15,  19,  79,  11, 111,  19, 143,  11,  79,  43, 111,  75, 143, 107,  79,
   27,  31,  59,  95,  91, 127, 123, 159, 155,  31, 187,  95,  59, 159,  91, 223,
   91, 159, 123, 191,  59,  95,  91, 159, 123, 127, 155, 159, 187, 191, 123, 223,
  251,  95, 219,  31, 187,  95, 155, 159, 123,  63, 187, 127, 155, 191, 219,  95,
  211,  15,  11,  79,  43, 111,  75, 143, 107, 175, 139, 207, 171, 239, 203, 271,
]);
// Removed local BLUE_NOISE, blueDither, shadeChar — now imported from capability.ts

function shadeColor(intensity: number): [number, number, number] {
  // Dark green to bright green (Matrix theme). The green channel maps the tone
  // exactly (g = i*255) so display intensity == designed intensity; the red/blue
  // channels add a greenish tint without skewing luma-based char selection.
  // m3 tweak: tone ≤ 0.05 returns pure black (0,0,0) so eyes/hair line up
  // visually with their '█' / '@' characters.
  const i = Math.max(0, Math.min(1, intensity));
  if (i <= 0.05) return [0, 0, 0];
  return [
    Math.floor(i * 90),
    Math.floor(i * 255),
    Math.floor(i * 90),
  ];
}

// Face stencil — the anatomical features of a readable ASCII portrait, anchored
// to 3D landmarks of the real head model (measured, y-up, face toward +Z).
// After the silhouette is computed from the mesh, each feature is projected to
// screen each frame and painted as an ellipse of a fixed tone. Because the
// anchors rotate with the head, the brows/eyes/nose/mouth stay glued to the
// anatomy under any camera rotation — this is what makes the render read
// unmistakably as a human face instead of a shaded blob.
interface FaceFeature {
  name: string;                        // test-suite label
  lx: number; ly: number; lz: number;  // landmark (local/model space)
  rx: number; ry: number;              // ellipse radius (model units, x & y)
  tone: number;                        // painted tone (0..1)
  minY?: number;                       // optional anatomic guard: skip cells
                                       // whose local y is below this (hairline)
  occludedGuard?: boolean;             // skip cells where a surface stands
                                       // well in front of the feature — face
                                       // features must not ghost onto the back
                                       // of the skull at yaw ≈ PI
  occlusionMargin?: number;            // extra depth margin for the occlusion
                                       // test (default 0.3). The HAIR_BACK
                                       // feature needs a larger value so the
                                       // near-side skull is still painted at
                                       // partial-yaw views.
}
// Painting order matters: later entries override earlier ones.
// Radii are deliberately generous (eyes 0.18 model-units = 12% of head width)
// so the features read clearly at 80x40 / 142x45 cell grids.
//
// m3 design priorities (variant m3):
//   1. TRUE BLACKS for eyes/mouth/hair — no floor-lift, they must look like ink.
//   2. Brow ridges as solid bright BARS at every grid size (tone=1.0).
//   3. Sclera + iris + pupil layering on the eye so a single eye reads as
//      a recognizable eye even at 4x2 cells.
//   4. Stronger contrast everywhere — bump bright tones to 1.0 and dark tones
//      to 0.0 so the ramp's two endpoints carry the recognition load.
export const FACE_STENCIL: FaceFeature[] = [
  // Temple shadows — dark wedges at the side of the forehead. They frame the
  // face and give the eye sockets a recessed feel.
  { name: 'TEMPLE_SHADOW', lx: -0.330, ly: 0.450, lz: 0.22, rx: 0.10, ry: 0.16, tone: 0.30, occludedGuard: true },
  { name: 'TEMPLE_SHADOW', lx:  0.330, ly: 0.450, lz: 0.22, rx: 0.10, ry: 0.16, tone: 0.30, occludedGuard: true },
  // Forehead pad — broad bright block below the hairline
  { name: 'FOREHEAD', lx: 0, ly: 0.550, lz: 0.28, rx: 0.32, ry: 0.18, tone: 0.68 },
  // Under-brow shadows (dark top arc of each socket)
  { name: 'BROW_SHADOW', lx: -0.120, ly: 0.400, lz: 0.30, rx: 0.16, ry: 0.040, tone: 0.10, occludedGuard: true },
  { name: 'BROW_SHADOW', lx:  0.120, ly: 0.400, lz: 0.30, rx: 0.16, ry: 0.040, tone: 0.10, occludedGuard: true },
  // Brows — DARK strokes (like real brows) sitting above BRIGHT eyes. The
  // dark-above-bright pairing is the strongest "these are eyes" cue; the old
  // bright brow bars read as skull ridges instead of brows.
  { name: 'BROW', lx: -0.120, ly: 0.445, lz: 0.33, rx: 0.18, ry: 0.045, tone: 0.10, occludedGuard: true },
  { name: 'BROW', lx:  0.120, ly: 0.445, lz: 0.33, rx: 0.18, ry: 0.045, tone: 0.10, occludedGuard: true },
  // Eye sclera (white-of-eye) — the brightest element of the whole face.
  { name: 'EYE_SCLERA', lx: -0.137, ly: 0.336, lz: 0.36, rx: 0.150, ry: 0.090, tone: 0.95, occludedGuard: true },
  { name: 'EYE_SCLERA', lx:  0.137, ly: 0.336, lz: 0.36, rx: 0.150, ry: 0.090, tone: 0.95, occludedGuard: true },
  // Eye iris — radial gradient: darker at edge, brighter near pupil.
  // Achieved by painting two ellipses: outer (darker) + inner (brighter).
  { name: 'EYE_IRIS_OUTER', lx: -0.137, ly: 0.336, lz: 0.38, rx: 0.090, ry: 0.062, tone: 0.28, occludedGuard: true },
  { name: 'EYE_IRIS_OUTER', lx:  0.137, ly: 0.336, lz: 0.38, rx: 0.090, ry: 0.062, tone: 0.28, occludedGuard: true },
  { name: 'EYE_IRIS_INNER', lx: -0.137, ly: 0.336, lz: 0.385, rx: 0.060, ry: 0.045, tone: 0.48, occludedGuard: true },
  { name: 'EYE_IRIS_INNER', lx:  0.137, ly: 0.336, lz: 0.385, rx: 0.060, ry: 0.045, tone: 0.48, occludedGuard: true },
  // Corneal catchlight — small bright specular on the cornea surface.
  // Position follows the key light direction relative to the eye.
  { name: 'EYE_CATCHLIGHT', lx: -0.137, ly: 0.336, lz: 0.39, rx: 0.022, ry: 0.022, tone: 1.0, occludedGuard: true },
  { name: 'EYE_CATCHLIGHT', lx:  0.137, ly: 0.336, lz: 0.39, rx: 0.022, ry: 0.022, tone: 1.0, occludedGuard: true },
  // Nose bridge — soft highlight column (was tone 1.0, which read as a hard
  // barcode stripe; a gentler 0.62 blends with the geometry shading).
  { name: 'NOSE_BRIDGE', lx: 0, ly: 0.290, lz: 0.37, rx: 0.055, ry: 0.16, tone: 0.70, occludedGuard: true },
  { name: 'NOSE_TIP', lx: 0, ly: 0.126, lz: 0.41, rx: 0.07, ry: 0.060, tone: 0.90, occludedGuard: true },
  // Nostril shadows — TRUE BLACK so they punch through.
  { name: 'NOSTRIL', lx: -0.050, ly: 0.095, lz: 0.37, rx: 0.045, ry: 0.030, tone: 0.02, occludedGuard: true },
  { name: 'NOSTRIL', lx:  0.050, ly: 0.095, lz: 0.37, rx: 0.045, ry: 0.030, tone: 0.02, occludedGuard: true },
  // Philtrum groove — slightly darker for vertical groove cue
  { name: 'PHILTRUM', lx: 0, ly: 0.065, lz: 0.40, rx: 0.025, ry: 0.060, tone: 0.18, occludedGuard: true },
  // Mouth parting line — PITCH BLACK so it reads as a dark slit.
  { name: 'MOUTH', lx: 0, ly: 0.015, lz: 0.48, rx: 0.22, ry: 0.055, tone: 0.02, occludedGuard: true },
  // Nasolabial smile lines (painted AFTER cheeks so they win)
  { name: 'NASOLABIAL', lx: -0.150, ly: 0.000, lz: 0.42, rx: 0.040, ry: 0.045, tone: 0.22, occludedGuard: true },
  { name: 'NASOLABIAL', lx:  0.150, ly: 0.000, lz: 0.42, rx: 0.040, ry: 0.045, tone: 0.22, occludedGuard: true },
  { name: 'NASOLABIAL', lx: -0.180, ly: -0.060, lz: 0.38, rx: 0.040, ry: 0.045, tone: 0.22, occludedGuard: true },
  { name: 'NASOLABIAL', lx:  0.180, ly: -0.060, lz: 0.38, rx: 0.040, ry: 0.045, tone: 0.22, occludedGuard: true },
  // Cupid's bow + lower lip highlights
  { name: 'LIP', lx: 0, ly: 0.065, lz: 0.47, rx: 0.085, ry: 0.030, tone: 0.75, occludedGuard: true },
  { name: 'LIP', lx: 0, ly: -0.035, lz: 0.47, rx: 0.095, ry: 0.040, tone: 0.85, occludedGuard: true },
  // Cheek highlights — softer than before (0.70 → 0.55) so the face plane
  // doesn't outshine the eyes.
  { name: 'CHEEK', lx: -0.180, ly: 0.240, lz: 0.33, rx: 0.14, ry: 0.10, tone: 0.55, occludedGuard: true },
  { name: 'CHEEK', lx:  0.180, ly: 0.240, lz: 0.33, rx: 0.14, ry: 0.10, tone: 0.55, occludedGuard: true },
  // Chin light
  { name: 'CHIN', lx: 0, ly: -0.330, lz: 0.36, rx: 0.14, ry: 0.12, tone: 0.65, occludedGuard: true },
  // Jaw side shading — darker for contour.
  { name: 'JAW', lx: -0.400, ly: -0.100, lz: 0.25, rx: 0.12, ry: 0.16, tone: 0.18, occludedGuard: true },
  { name: 'JAW', lx:  0.400, ly: -0.100, lz: 0.25, rx: 0.12, ry: 0.16, tone: 0.18, occludedGuard: true },
  // EYE pupil — true black dot, painted LAST so it wins over sclera/iris.
  { name: 'EYE_PUPIL', lx: -0.137, ly: 0.336, lz: 0.40, rx: 0.045, ry: 0.045, tone: 0.02, occludedGuard: true },
  { name: 'EYE_PUPIL', lx:  0.137, ly: 0.336, lz: 0.40, rx: 0.045, ry: 0.045, tone: 0.02, occludedGuard: true },
  // Hair cap — painted LAST so it wins. Anatomic hairline guard so it never
  // covers brows/forehead. TRUE BLACK (0.02) so it reads as solid.
  { name: 'HAIR', lx: 0, ly: 0.680, lz: 0.25, rx: 0.66, ry: 0.22, tone: 0.15, minY: 0.47 },
  // Back-of-head hair: hidden at the front view, hairies the skull rear
  // when the head turns.
  { name: 'HAIR_BACK', lx: 0, ly: 0.50, lz: -0.30, rx: 0.64, ry: 0.24, tone: 0.15, minY: 0.10, occludedGuard: true, occlusionMargin: 0.7 },
];

export interface ProjectionResult {
  cells: RenderCell[][];
  width: number;
  height: number;
}

// Shared projection constants — single source of truth for the vertex pass,
// the face stencil and the test suite (tools/test_face.ts).
export const CAM_Z = 3.4;         // fixed camera distance (no zoom)
export const HEAD_CY = 0.185;     // m3: nudged down by 0.01 → tighter chin framing
export const HEAD_HALF_W = 0.56;  // model x extent (after neck crop)

export function frameScale(screenW: number, screenH: number, cellAspect: number): {
  scale: number; sx: number; sy: number;
} {
  // m3: tightened the height budget from /1.55 to /1.70 so the head truly
  // fills the vertical extent of the grid — less empty forehead band above
  // the hair, more chin visible at the bottom.
  const scale = Math.min(screenW / 3.5, screenH / 1.70);
  const headAspect = 0.9;
  const sx = scale * (headAspect / cellAspect) * 1.12;
  const sy = scale;
  return { scale, sx, sy };
}

// Project a model-space point (e.g. a stencil landmark) to screen cell
// coordinates. Mirrors the vertex projection exactly.
export function projectPoint(
  lx: number, ly: number, lz: number,
  rx: number, ry: number, rz: number,
  screenW: number, screenH: number, cellAspect: number,
): { x: number; y: number } {
  const { sx, sy } = frameScale(screenW, screenH, cellAspect);
  const rot = rotateXYZ(v3(lx, ly, lz), rx, ry, rz);
  const dist = CAM_Z - rot.z;
  if (dist <= 0.22) return { x: -1, y: -1 }; // behind camera
  const pers = CAM_Z / dist;
  return {
    x: screenW / 2 + rot.x * sx * pers,
    y: screenH / 2 - (rot.y - HEAD_CY) * sy * pers,
  };
}

export function projectAndShade(
  mesh: Mesh,
  rx: number,
  ry: number,
  rz: number,
  screenW: number,
  screenH: number,
  cellAspect: number = 0.55, // cellWidth / cellHeight (~0.5 terminal, ~0.56 browser 9x16)
  gaze?: { gx: number; gy: number }, // -1..1 eye-gaze offset (pupils/irises track pointer)
  renderMode: RenderMode = 'color',
  glyphRamp: GlyphRamp = 'binary',
): ProjectionResult {
  const halfW = screenW / 2;
  const halfH = screenH / 2;
  const { sx, sy } = frameScale(screenW, screenH, cellAspect);

  // Two-light setup: key from upper-RIGHT (more lateral) so the nose casts
  // a visible side-shadow and cheek form reads; soft fill from the LEFT keeps
  // the far side readable at profile yaw. Both normalized.
  const lightDir = v3norm(v3(0.58, 0.50, 0.60));
  const fillDir = v3norm(v3(-0.55, 0.10, 0.45));
  // Weak back-rim for contour separation on the far cheek/jaw.
  const rimDir = v3norm(v3(0.10, 0.20, -0.95));

  const verts = mesh.verts;

  // Transform all vertices: rotate deformed pos, rotate baked normal, project.
  let maxRZ = -Infinity;
  for (let i = 0; i < verts.length; i++) {
    const v = verts[i];
    const rotated = rotateXYZ(v.pos, rx, ry, rz);
    v.norm = v3norm(rotateXYZ(v.norm, rx, ry, rz));
    const dist = CAM_Z - rotated.z;
    if (dist <= 0.22) {
      v.screen = v3(-9999, -9999, -9999);
      continue;
    }
    const pers = CAM_Z / dist;
    v.screen = v3(
      halfW + rotated.x * sx * pers,
      halfH - (rotated.y - HEAD_CY) * sy * pers, // model y is UP; screen y grows downward
      rotated.z, // +z = toward camera = nearer
    );
    if (rotated.z > maxRZ) maxRZ = rotated.z;
  }

  const cells: RenderCell[][] = [];
  for (let j = 0; j < screenH; j++) {
    cells.push([]);
    for (let i = 0; i < screenW; i++) {
      cells[j].push({ ch: ' ', r: 0, g: 0, b: 0, depth: -99 });
    }
  }

  // Solid triangle rasterization (replaces the old per-vertex splat):
  // the 21.5K-face surface is scan-converted into the cell grid with a
  // z-buffer, so the head reads as one coherent shaded surface instead of
  // a noisy sprinkle of isolated vertices.
  const cellCount = screenW * screenH;
  const cellDepth = new Float32Array(cellCount).fill(-99);
  const cellNX = new Float32Array(cellCount);
  const cellNY = new Float32Array(cellCount);
  const cellNZ = new Float32Array(cellCount);
  const cellY = new Float32Array(cellCount); // local y (under-jaw shading)

  // Rotated face normals + per-face shading, hoisted out of the raster loop.
  const fnx = new Float32Array(mesh.faces.length);
  const fny = new Float32Array(mesh.faces.length);
  const fnz = new Float32Array(mesh.faces.length);
  const fshade = new Float32Array(mesh.faces.length);
  for (let f = 0; f < mesh.faces.length; f++) {
    const fn = rotateXYZ(mesh.faces[f].norm, rx, ry, rz);
    fnx[f] = fn.x; fny[f] = fn.y; fnz[f] = fn.z;
    // Skip back-facing faces entirely (the head is a closed surface).
    if (fn.z <= 0.01) { fshade[f] = -1; continue; }
    const d = Math.max(0, fn.x * lightDir.x + fn.y * lightDir.y + fn.z * lightDir.z);
    const dFill = Math.max(0, fn.x * fillDir.x + fn.y * fillDir.y + fn.z * fillDir.z);
    fshade[f] = 0.34 + 0.55 * Math.pow(d, 1.5) + 0.16 * Math.pow(dFill, 2.2);
  }

  for (let f = 0; f < mesh.faces.length; f++) {
    if (fshade[f] < 0) continue;
    const face = mesh.faces[f];
    const v0 = verts[face.i0].screen, v1 = verts[face.i1].screen, v2 = verts[face.i2].screen;
    const x0 = v0.x, y0 = v0.y, x1 = v1.x, y1 = v1.y, x2 = v2.x, y2 = v2.y;
    if (x0 < 0 || x1 < 0 || x2 < 0) continue; // clipped / behind camera

    const area = (x1 - x0) * (y2 - y0) - (x2 - x0) * (y1 - y0);
    if (Math.abs(area) < 0.02) continue; // degenerate / edge-on sliver

    const minI = Math.max(0, Math.floor(Math.min(x0, x1, x2) - 0.5));
    const maxI = Math.min(screenW - 1, Math.ceil(Math.max(x0, x1, x2) + 0.5));
    const minJ = Math.max(0, Math.floor(Math.min(y0, y1, y2) - 0.5));
    const maxJ = Math.min(screenH - 1, Math.ceil(Math.max(y0, y1, y2) + 0.5));
    if (minI > maxI || minJ > maxJ) continue;

    const z0 = v0.z, z1 = v1.z, z2 = v2.z;
    const w0y0 = x2 - x1, w0x0 = y2 - y1;      // edge (v1→v2) for weight of v0
    const w1y0 = x0 - x2, w1x0 = y0 - y2;      // edge (v2→v0) for weight of v1
    const w2y0 = x1 - x0, w2x0 = y1 - y0;      // edge (v0→v1) for weight of v2
    const y0l = verts[face.i0].pos.y, y1l = verts[face.i1].pos.y, y2l = verts[face.i2].pos.y;
    const nx = fnx[f], ny = fny[f], nz = fnz[f];
    const sh = fshade[f];

    for (let j = minJ; j <= maxJ; j++) {
      const py = j + 0.5;
      const rowBase = j * screenW;
      const w0row = w0y0 * (py - y1) - w0x0 * (minI + 0.5 - x1);
      const w1row = w1y0 * (py - y2) - w1x0 * (minI + 0.5 - x2);
      const w2row = w2y0 * (py - y0) - w2x0 * (minI + 0.5 - x0);
      for (let i = minI; i <= maxI; i++) {
        const px = i + 0.5;
        const w0 = w0row + (-w0x0) * (px - (minI + 0.5)) / 1; // recompute per px (cheap)
        const w1 = w1row + (-w1x0) * (px - (minI + 0.5)) / 1;
        const w2 = w2row + (-w2x0) * (px - (minI + 0.5)) / 1;
        const inv = 1 / area;
        const a0 = w0 * inv, a1 = w1 * inv, a2 = w2 * inv;
        if (a0 < -0.08 || a1 < -0.08 || a2 < -0.08) continue; // outside (small tolerance closes seams)
        const idx = rowBase + i;
        const z = a0 * z0 + a1 * z1 + a2 * z2;
        if (z <= cellDepth[idx]) continue;
        cellDepth[idx] = z;
        cellNX[idx] = nx;
        cellNY[idx] = ny;
        cellNZ[idx] = nz;
        cellY[idx] = a0 * y0l + a1 * y1l + a2 * y2l;
      }
    }
  }

  // Finalize the silhouette: gentle skin shading from the nearest surface.
  for (let j = 0; j < screenH; j++) {
    for (let i = 0; i < screenW; i++) {
      const idx = j * screenW + i;
      const z = cellDepth[idx];
      if (z <= -98) continue;

      const nx = cellNX[idx], ny = cellNY[idx], nz = cellNZ[idx];
      const f = nz; // front-facing factor (-1..1)

      // Sculptural two-light setup with a DEEP tonal range: low ambient so
      // shadow sides fall to near-black, steep key falloff models the main
      // form (nose bridge, brow ridge, cheekbones), soft fill keeps the far
      // side readable, and a top-down sky term separates forehead from brow.
      const d = Math.max(0, nx * lightDir.x + ny * lightDir.y + nz * lightDir.z);
      const dFill = Math.max(0, nx * fillDir.x + ny * fillDir.y + nz * fillDir.z);
      const dTop = Math.max(0, ny);
      const dRim = Math.max(0, nx * rimDir.x + ny * rimDir.y + nz * rimDir.z);
      const relZ = Math.max(0, maxRZ - z);
      const proud = Math.min(relZ * 0.4, 0.15);

      let inten = 0.12 + 0.55 * Math.pow(d, 1.6) + 0.12 * Math.pow(dFill, 2.4)
        + 0.07 * Math.pow(dTop, 2.0) + 0.04 * Math.pow(dRim, 1.5) + proud;
      // Cavity term: surfaces turning AWAY from the key light darken sharply —
      // this is what carves the nose side-shadow, cheek hollows and the eye-
      // socket depth into the drawing.
      inten -= 0.30 * Math.pow(1 - d, 3);
      // SSAO approximation: deep creases (eye sockets, nose sides, nasolabial)
      // have grazing angles (low nz) AND face away from key light.
      // This darkens concave regions beyond what direct lighting does.
      inten -= 0.24 * Math.pow(1 - d, 2) * Math.pow(1 - f, 1.5);
      // S-curve contrast remap: compress mids downward, keep highlights.
      inten = inten * inten * (3 - 2 * inten) * 0.92 + inten * 0.08;

      // Silhouette tangent: the extreme edge of a curved surface faces sideways;
      // keep it dark so the head draws a crisp contour against the background.
      if (f < 0.25) inten *= Math.max(0.10, f / 0.25);

      // Under-jaw shadow: the chin underside and the cut neck base sit BELOW
      // the jaw line — darken them so the jaw reads as a lit plane over a
      // shadowed base (key 3D cue for the lower face, which is otherwise all
      // one flat '0' mass).
      if (cellY[idx] < -0.40) inten *= 0.38;

      inten = Math.max(0.12, Math.min(1, inten));

      const cell = cells[j][i];
      const [r, g, bl] = shadeColor(inten);
      cell.ch = pickChar(inten, renderMode, glyphRamp, i, j, (performance.now() / 16.6) | 0);
      cell.r = r;
      cell.g = g;
      cell.b = bl;
      cell.depth = z;
    }
  }

  // Face stencil: paint the brows/eyes/nose/mouth anchored to 3D landmarks,
  // over the silhouette. Ellipse radii scale with the head on screen.
  for (let f = 0; f < FACE_STENCIL.length; f++) {
    const feat = FACE_STENCIL[f];
    // Gaze: the pupils and irises slide inside the sclera toward the pointer.
    // Offsets are applied in LOCAL model space (before rotation) so the eyes
    // stay glued to the anatomy at any head yaw/pitch.
    const isEye = feat.name === 'EYE_PUPIL' || feat.name === 'EYE_IRIS'
  || feat.name === 'EYE_IRIS_OUTER' || feat.name === 'EYE_IRIS_INNER'
  || feat.name === 'EYE_CATCHLIGHT';
    const gx = isEye && gaze ? gaze.gx * 0.055 : 0;
    const gy = isEye && gaze ? gaze.gy * 0.030 : 0;
    const rot = rotateXYZ(v3(feat.lx + gx, feat.ly + gy, feat.lz), rx, ry, rz);
    // Feature-level visibility: a face feature whose landmark has rotated to
    // the far side of the head is skipped ENTIRELY — this is what keeps the
    // back of the skull clean (no ghost eyes/brows/nose ever bleed through).
    if (feat.name !== 'HAIR_BACK' && rot.z < 0.05) continue;
    const pdist = CAM_Z - rot.z;
    if (pdist <= 0.22) continue;
    const ppers = CAM_Z / pdist;
    const pcx = halfW + rot.x * sx * ppers;
    const pcy = halfH - (rot.y - HEAD_CY) * sy * ppers;
    const rrX = Math.max(1, feat.rx * sx * ppers); // ellipse radius in cells
    const rrY = Math.max(1, feat.ry * sy * ppers);

    const x0 = Math.max(0, Math.floor(pcx - rrX));
    const x1 = Math.min(screenW - 1, Math.ceil(pcx + rrX));
    const y0 = Math.max(0, Math.floor(pcy - rrY));
    const y1 = Math.min(screenH - 1, Math.ceil(pcy + rrY));
    for (let j = y0; j <= y1; j++) {
      for (let i = x0; i <= x1; i++) {
        const idx = j * screenW + i;
        if (cellDepth[idx] <= -98) continue; // only inside the head silhouette
        if (feat.minY !== undefined && cellY[idx] < feat.minY) continue; // anatomic guard
        // Occlusion: cells standing well in front of the feature. HAIR_BACK is
        // hard-skipped (hair must never ghost onto the face); every other
        // feature is smoothly attenuated instead of cut, which removes the
        // striped column artifacts at high grid resolutions and strong yaw.
        let occluded = false;
        if (feat.occludedGuard && cellDepth[idx] > rot.z + (feat.occlusionMargin ?? 0.3)) {
          if (feat.name === 'HAIR_BACK') continue;
          occluded = true;
        }
        const dx = (i - pcx) / rrX;
        const dy = (j - pcy) / rrY;
        if (dx * dx + dy * dy > 1) continue;
        // m3: no floor clamp — let the stencil land at the tone it asked for,
        // so eyes / mouth / hair actually read as black instead of '.'.
        let inten = Math.max(0, Math.min(1, feat.tone));
        if (occluded) inten *= 0.4;
        const cell = cells[j][i];
        const [r, g, bl] = shadeColor(inten);
        cell.ch = pickChar(inten, renderMode, glyphRamp, i, j, (performance.now() / 16.6) | 0);
        cell.r = r;
        cell.g = g;
        cell.b = bl;
      }
    }
  }

  // Contour pass — the plus-splat softened the silhouette tangent shading
  // (edge cells inherit interior normals from neighbour vertices), so darken
  // any drawn cell that touches the background. A crisp dark contour is the
  // strongest 3D cue for a head rendered in ASCII.
  for (let j = 0; j < screenH; j++) {
    for (let i = 0; i < screenW; i++) {
      const cell = cells[j][i];
      if (cell.depth <= -98) continue;
      const interior =
        j > 0 && cells[j - 1][i].depth > -98 && j < screenH - 1 && cells[j + 1][i].depth > -98 &&
        i > 0 && cells[j][i - 1].depth > -98 && i < screenW - 1 && cells[j][i + 1].depth > -98;
      if (interior) continue;
      const inten = Math.max(0.12, (cell.g / 255) * 0.5);
      const [r, g, bl] = shadeColor(inten);
      cell.ch = pickChar(inten, renderMode, glyphRamp, i, j, (performance.now() / 16.6) | 0);
      cell.r = r;
      cell.g = g;
      cell.b = bl;
    }
  }

  return { cells, width: screenW, height: screenH };
}

// ─── Expression System ─────────────────────────────────────────

export function autoBlink(time: number): number {
  const blinkCycle = time % 4.0;
  if (blinkCycle < 0.1) {
    return Math.sin(blinkCycle / 0.1 * Math.PI);
  }
  if (blinkCycle > 3.8) {
    return Math.sin((blinkCycle - 3.8) / 0.2 * Math.PI * 0.5);
  }
  return 0;
}

export function computeParams(
  time: number,
  mouseX: number,  // -1 to 1
  mouseY: number,  // -1 to 1
  dragging: boolean,
): FaceParams {
  const blink = autoBlink(time);
  const cycle = Math.sin(time * 0.3) * 0.5 + 0.5;

  return {
    eyeOpenness: 1,
    mouthOpen: 0.02 + Math.sin(time * 0.7) * 0.015,
    smile: dragging ? 0.05 : 0.03 + cycle * 0.05,
    frown: 0,
    surprise: 0,
    browUp: Math.sin(time * 0.2) * 0.12,
    blinkPhase: blink,
  };
}