#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const AsciiLab = require('./head.js');

const dir = __dirname;
const FACES = JSON.parse(fs.readFileSync(path.join(dir, 'faces.json'), 'utf8'));

function usage() {
  console.log(`
ASCII•ЛИЦА — просмотр коллекции (одинаково с браузером viewer.html)

  node viewer.node.js [опции]

Опции:
  --list              показать список всех работ (id · автор · название)
  --show <id|keyword> показать одну работу (id или подстрока из названия)
  --filter <keyword>  показать все работы, где встречается keyword
  --head              поиграть с НАШЕЙ 3D-головой (шейдинг → объём)
  --preview           все работы подряд с рамками (указатель печати)
  --tiny              колонка по одной работе (по умолчанию)
  -w <cols>           ширина терминала (авто-определение, если опущено)

Навигация в режиме показа:
  [n]   следующая работа      [p] предыдущая
  [q]   выход                 [g] показать все (preview)
  [h]   открыть режим головы
`);
}

function termWidth() {
  if (process.stdout.isTTY && process.stdout.columns) return process.stdout.columns - 2;
  return 80;
}

function drawBlock(title, lines, width) {
  const w = Math.min(width, Math.max.apply(null, [0].concat(lines.map(l => l.length))));
  const out = AsciiLab.frame(title, lines);
  return out.join('\n');
}

let filter = null;
let show = null;
let headMode = false;
let preview = false;
let width = null;

const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === '--list') { modeList(); process.exit(0); }
  if (a === '--head') { headMode = true; continue; }
  if (a === '--preview') { preview = true; continue; }
  if (a === '--show') { show = argv[++i]; continue; }
  if (a === '--filter') { filter = argv[++i]; continue; }
  if (a === '-w') { width = parseInt(argv[++i], 10); continue; }
  if (a === '-h' || a === '--help') { usage(); process.exit(0); }
}

function modeList() {
  FACES.items.forEach(it => {
    const num = String(it.id).padStart(2, ' ');
    console.log(`  #${num}  ${it.artist.padEnd(30).slice(0, 30)}  ${it.title}`);
  });
  console.log(`\n  Итого: ${FACES.items.length} работ`);
}

function matches(it) {
  if (!filter) return true;
  const f = filter.toLowerCase();
  return it.title.toLowerCase().includes(f) || it.artist.toLowerCase().includes(f);
}

function collect() {
  let items = FACES.items.filter(matches);
  if (show) {
    const s = String(show);
    const num = parseInt(s, 10);
    if (!isNaN(num)) {
      const hit = items.filter(it => it.id === num);
      if (hit.length) items = hit;
    } else {
      const found = items.filter(it => it.title.toLowerCase().includes(s.toLowerCase()));
      if (found.length) items = found;
    }
  }
  return items;
}

const W = width || termWidth();

function drawArt(it) {
  const heading = it.artist === it.title ? it.title : `${it.title}  ·  ${it.artist}`;
  const title = `#${it.id} ${heading}`;
  return drawBlock(title, it.art.split('\n'), W);
}

async function runPreview() {
  const items = collect();
  if (!items.length) { console.error('ничего не найдено'); process.exit(1); }
  for (let i = 0; i < items.length; i++) {
    console.log(drawArt(items[i]));
    console.log('');
    if (items[i + 1]) console.log('\n'.repeat(1));
  }
}

if (headMode) {
  require('./head3d.node.js');
  return;
}

if (preview) {
  runPreview();
} else if (show) {
  const items = collect();
  if (!items.length) { console.error('ничего не найдено'); process.exit(1); }
  drawArtStandalone(items);
} else {
  runPreview();
}

function drawArtStandalone(items) {
  let i = 0;
  function draw() {
    console.log('');
    console.log(drawArt(items[i]));
    console.log('');
    console.log(`  [n] след.  [p] пред.  [g] все  [h] голова  [q] выход   (${i + 1}/${items.length})`);
  }
  draw();

  const readline = require('readline');
  readline.emitKeypressEvents(process.stdin);
  if (process.stdin.isTTY) process.stdin.setRawMode(true);
  process.stdin.on('keypress', function (_, key) {
    if (!key) return;
    if (key.name === 'q') process.exit(0);
    if (key.name === 'n') { i = (i + 1) % items.length; process.stdout.write('\x1b[2J\x1b[H'); draw(); }
    if (key.name === 'p') { i = (i - 1 + items.length) % items.length; process.stdout.write('\x1b[2J\x1b[H'); draw(); }
    if (key.name === 'g') { process.exit(0); }
    if (key.name === 'h') { process.exit(0); }
  });
  process.stdin.resume();
}