/**
 * multihead_terminal.ts — terminal renderer for the 4×3 head matrix.
 *
 *   npm run dev:multihead                       (full 4×3 matrix, all variants)
 *   FACE_VARIANT=default npm run dev:multihead (single variant, 3 views)
 *   FACE_MODE=color|grey|mono                  (override capability detect)
 */
import { detectMode, ansiSet, pickChar, RAMP_BLOCK } from './capability.js';
import { renderMultiView, type HeadVariant, type ViewSpec } from './mhface3d.js';

const VARIANTS: HeadVariant[] = ['default', 'female', 'male', 'child'];
const VIEWS: ViewSpec[] = [
  { rx: 0, ry: 0, rz: 0, label: 'FRONT' },
  { rx: 0, ry: -0.55, rz: 0, label: '3/4' },
  { rx: 0, ry: -1.05, rz: 0, label: 'SIDE' },
];

function main() {
  const cap = detectMode();
  const termCols = process.stdout.columns || 120;
  const termRows = process.stdout.rows || 40;
  const single = process.env.FACE_VARIANT as HeadVariant | undefined;
  const variants: HeadVariant[] = single ? [single] : VARIANTS;
  // 3 viewports side by side. Each face is rendered at full-size for the
  // available vertical space. Terminal cells are ~2:1 tall so 1 face-cell-row
  // = 1 terminal-row (already correct for display; we don't squash).
  const views = VIEWS;
  const interCellW = 1; // gap between viewports
  const usableCols = termCols - 2; // 1 col left margin
  const panelW = Math.max(12, Math.floor((usableCols - (views.length - 1) * interCellW) / views.length));
  // Vertical: split remaining rows between variants
  const headerRows = 3;
  const footerRows = 2;
  const availableRows = termRows - headerRows - footerRows;
  const perVariantRows = Math.floor(availableRows / variants.length);
  // face is roughly square; with cellAspect 0.5 (terminal chars are 2:1 tall)
  // we want panelH ≈ 2*panelW to look natural
  const panelH = Math.min(28, Math.max(8, Math.min(perVariantRows, panelW * 2)));
  // Build all frames
  const frames: { title: string; lines: string[] }[] = [];
  for (const variant of variants) {
    const res = renderMultiView(variant, views, panelW, panelH);
    const lines = buildFrame(res, variant, views, panelW, panelH, cap.mode);
    frames.push({ title: variant.toUpperCase(), lines });
  }
  // Output: hide cursor, clear, position cursor
  const out: string[] = [];
  out.push('\x1b[?25l'); // hide cursor
  out.push('\x1b[2J'); // clear
  // Top header (1 row)
  out.push(`\x1b[1;1H\x1b[1mMATRIX FACE — ${variants.length} × ${views.length} grid · ${cap.mode}/${cap.colors}col\x1b[0m`);
  // View labels on the next row, aligned with each panel
  let labels = '\x1b[2;1H';
  for (let pi = 0; pi < views.length; pi++) {
    const x0 = pi * (panelW + interCellW) + 1;
    labels += `\x1b[${x0}G\x1b[36m${views[pi].label.padEnd(panelW)}\x1b[0m`;
  }
  out.push(labels);
  // Variant frames
  let row = 3;
  for (const f of frames) {
    out.push(`\x1b[${row};1H\x1b[33m── ${f.title} ──\x1b[0m`);
    for (const line of f.lines) {
      out.push(`\x1b[${row + 1};1H${line}\x1b[K`);
      row++;
    }
    row += 2; // gap
  }
  out.push(`\x1b[${termRows};1H\x1b[2mFACE_VARIANT=default|female|male|child  FACE_MODE=color|grey|mono  panel ${panelW}×${panelH}\x1b[0m`);
  out.push('\x1b[?25h'); // show cursor
  process.stdout.write(out.join('\n'));
}

function buildFrame(
  res: { chars: string[][]; r: number[][]; g: number[][]; b: number[][] },
  variant: string,
  views: ViewSpec[],
  panelW: number,
  panelH: number,
  mode: 'color' | 'grey' | 'mono',
): string[] {
  const lines: string[] = [];
  for (let j = 0; j < panelH; j++) {
    let line = '';
    for (let pi = 0; pi < views.length; pi++) {
      const x0 = pi * (panelW + 1);
      for (let i = 0; i < panelW; i++) {
        const ch = res.chars[j][x0 + i];
        if (!ch || ch === ' ') { line += ' '; continue; }
        const x = x0 + i;
        const r = res.r[j][x], g = res.g[j][x], b = res.b[j][x];
        line += ansiSet(r, g, b, mode) + ch;
      }
      if (pi < views.length - 1) line += ' '; // 1-col gap between viewports
    }
    lines.push(line);
  }
  return lines;
}

main();
