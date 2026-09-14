// multihead.js — render 4 head variants × 3 camera angles in a 4×3 grid.
import { renderMultiView } from './src/mhface3d.js';
// expose for console inspection
globalThis.__debug = { renderMultiView, run: () => {
  const r = renderMultiView('default', [{rx:0,ry:0,rz:0,label:'F'}], 36, 30);
  return { sample: [
    { j: 10, i: 17, ch: r.chars[10][17], g: r.g[10*37+17] },
    { j: 12, i: 18, ch: r.chars[12][18], g: r.g[12*37+18] },
    { j: 14, i: 16, ch: r.chars[14][16], g: r.g[14*37+16] },
  ] };
} };

const VARIANTS = ['default', 'female', 'male', 'child'];
const VIEWS = [
  { rx: 0, ry: 0, rz: 0, label: 'FRONT' },
  { rx: 0, ry: -0.55, rz: 0, label: '3/4' },
  { rx: 0, ry: -1.0, rz: 0, label: 'SIDE' },
];

const cellW = 8, cellH = 16;
const panelW = 36, panelH = 30;
const cols = 3 * panelW + 2; // 3 viewports
const rows = 4 * panelH + 3; // 4 variants
const W = cols * cellW, H = rows * cellH;

const canvas = document.getElementById('c');
canvas.width = W; canvas.height = H;
const ctx = canvas.getContext('2d');
ctx.fillStyle = '#000';
ctx.fillRect(0, 0, W, H);
ctx.font = `${cellH}px "Courier New", monospace`;
ctx.textBaseline = 'top';

let totalDrawn = 0;
function draw() {
  for (let vi = 0; vi < VARIANTS.length; vi++) {
    const variant = VARIANTS[vi];
    let res;
    try {
      res = renderMultiView(variant, VIEWS, panelW, panelH);
    } catch (e) {
      console.error('renderMultiView failed for', variant, e);
      continue;
    }
    let variantDrawn = 0;
    const W3 = VIEWS.length * (panelW + 1);
    for (let pi = 0; pi < VIEWS.length; pi++) {
      const x0 = pi * (panelW + 1) * cellW;
      const y0 = vi * (panelH + 1) * cellH;
      for (let j = 0; j < panelH; j++) {
        for (let i = 0; i < panelW; i++) {
          const ch = res.chars[j][pi * (panelW + 1) + i];
          if (ch && ch !== ' ') {
            const x = pi * (panelW + 1) + i;
            ctx.fillStyle = `rgb(${res.r[j][x]},${res.g[j][x]},${res.b[j][x]})`;
            ctx.fillText(ch, x0 + i * cellW, y0 + j * cellH);
            variantDrawn++;
            totalDrawn++;
          }
        }
      }
    }
    console.log(`variant ${variant}: ${variantDrawn} cells drawn`);
  }
  // column headers (views)
  ctx.fillStyle = '#0a0';
  ctx.font = `${cellH * 0.7}px "Courier New", monospace`;
  for (let pi = 0; pi < VIEWS.length; pi++) {
    ctx.fillText(VIEWS[pi].label, pi * (panelW + 1) * cellW + 4, 4);
  }
  // row labels (variants)
  for (let vi = 0; vi < VARIANTS.length; vi++) {
    ctx.fillText(VARIANTS[vi].toUpperCase(), 4, vi * (panelH + 1) * cellH + cellH);
  }
  console.log('TOTAL drawn cells:', totalDrawn);
}

draw();
