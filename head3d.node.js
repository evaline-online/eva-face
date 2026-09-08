#!/usr/bin/env node
'use strict';
const AsciiLab = require('./head.js');

function usage() {
  console.log(`
3D-ГоловА (шейдинг → объём) — отдельный проигрыватель. Работает и в терминале,
и в браузере (head3d.html) на ОДНОМ движке head.js.

  node head3d.node.js [опции]

Опции:
  --width <n>   ширина головы, по умолчанию 52
  --height <n>  высота головы, по умолчанию 26
  --fps <n>     частота кадров (по умолчанию 12)
  --preset <n>  пресет 0..5 (нейтрал, улыбка, грусть, злость, сюрприз, очки)
  --slow        медленно (речь медленнее, для разглядывания)
  --ascii       строго ASCII-символы (по умолчанию) 
  --blocks      использовать блочные символы ░▒▓█ для теней
  --once        вывести один кадр и выйти (для скриптов/проверки)

Интерактив (когда запущено как TTY):
  [q] выход   [ы/й] сменить пресет   [ВВОД] пауза/продолжить
  [<-][->]    наклон влево/вправо    [^][v] кивок вверх/вниз
  [b] тени-блоки / ascii-тени        [+] [-]: громче/тише рот
`);
}

function parseArgs() {
  const argv = process.argv.slice(2);
  const o = { width: 52, height: 26, fps: 12, preset: -1, slow: false, blocks: false, once: false, talk: 0.8 };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '-h' || a === '--help') { usage(); process.exit(0); }
    if (a === '--width') o.width = parseInt(argv[++i], 10) || 52;
    if (a === '--height') o.height = parseInt(argv[++i], 10) || 26;
    if (a === '--fps') o.fps = parseInt(argv[++i], 10) || 12;
    if (a === '--preset') o.preset = parseInt(argv[++i], 10);
    if (a === '--slow') o.slow = true;
    if (a === '--blocks') o.blocks = true;
    if (a === '--once') o.once = true;
  }
  return o;
}

const O = parseArgs();
const presets = AsciiLab.presets();
let presetIdx = O.preset >= 0 ? O.preset : -1;
let manual = null;
let paused = false;
let t = 0;
let rollOff = 0, pitchOff = 0;
let RAMP_MODE = O.blocks ? 'blocks' : 'ascii';

function frameParams() {
  if (paused) return manual || presetParams();
  if (presetIdx >= 0) {
    const b = presets[presetIdx];
    const sp = Math.max(0, Math.sin(t * 5) * 0.5 + Math.sin(t * 13) * 0.3 + Math.sin(t * 2.9 + 1) * 0.3);
    return {
      width: O.width, height: O.height,
      expression: b.expression, glasses: b.glasses,
      mouthOpen: clamp(b.mouthOpen + O.talk * 0.55 * Math.pow(sp, 1.3), 0, 1),
      smile: b.smile + 0.1 * Math.sin(t * 0.9),
      blink: (t % 3.6) > 3.42 ? 1 : 0,
      roll: rollOff + Math.sin(t * 0.7) * 5,
      pitch: pitchOff + Math.sin(t * 0.5 + 1.1) * 3,
      lookX: Math.sin(t * 0.4) * 0.6, lookY: Math.sin(t * 0.27) * 0.4
    };
  }
  const ap = AsciiLab.animateParams(t);
  ap.width = O.width; ap.height = O.height;
  ap.roll += rollOff; ap.pitch += pitchOff;
  return ap;
}

function presetParams() {
  const b = presets[presetIdx >= 0 ? presetIdx : 3];
  return {
    width: O.width, height: O.height,
    expression: b.expression, glasses: b.glasses,
    mouthOpen: b.mouthOpen, smile: b.smile, blink: 0,
    roll: rollOff, pitch: pitchOff, lookX: 0, lookY: 0
  };
}

function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

function renderFrame() {
  const p = frameParams();
  const rows = AsciiLab.renderHead(p);
  let out = rows;
  if (RAMP_MODE === 'blocks') out = rows.map(r => toBlocks(r));
  return out.join('\n');
}

const BLOCK_MAP = { '@': '█', '#': '▓', '%': '▓', '*': '▒', '+': '░', '-': '░', '=': '░', ':': ' ', '.': ' ', ' ': ' ' };
function toBlocks(row) {
  return row.split('').map(c => BLOCK_MAP[c] !== undefined ? BLOCK_MAP[c] : c).join('');
}

function hud() {
  const p = frameParams();
  const pm = presetIdx >= 0 ? presets[presetIdx].name : 'авто-речь';
  return `[${pm}] rpm ${fmt(p.mouthOpen)} smile ${fmt(p.smile)} blink ${p.blink ? 'ня' : '-'}  roll ${Math.round(p.roll)}°  pitch ${Math.round(p.pitch)}°  ` +
    `(q выход · ВВОД пауза · ←→↑↓ наклон/кивок · b тени · +/- рот)`;
}
function fmt(v) { return (+v).toFixed(2); }

if (O.once) {
  console.log(renderFrame());
  process.exit(0);
}

let frame = 0;
let first = true;
function tick() {
  frame++;
  t = O.slow ? frame * (1 / O.fps) * 0.5 : frame / O.fps;
  const body = renderFrame();
  if (process.stdout.isTTY && !O.once) {
    process.stdout.write('\x1b[H\x1b[2J');
  }
  console.log(body);
  console.log(hud());
  setTimeout(tick, Math.round(1000 / Math.max(1, O.fps)));
}

const readline = require('readline');
if (process.stdin.isTTY) {
  readline.emitKeypressEvents(process.stdin);
  process.stdin.setRawMode(true);
  process.stdin.on('keypress', (ch, key) => {
    if (!key) return;
    if (key.name === 'q') process.exit(0);
    if (key.name === 'return') { paused = !paused; }
    if (key.name === 'left') rollOff -= 8;
    if (key.name === 'right') rollOff += 8;
    if (key.name === 'up') pitchOff += 6;
    if (key.name === 'down') pitchOff -= 6;
    if (key.name === 'b') RAMP_MODE = RAMP_MODE === 'blocks' ? 'ascii' : 'blocks';
    if (key.name === 'plus' || key.name === 'add' || ch === '+') O.talk = clamp(O.talk + 0.2, 0, 1.5);
    if (key.name === 'minus' || ch === '-') O.talk = clamp(O.talk - 0.2, 0, 1.5);
    const presetKeys = ['1', '2', '3', '4', '5', '6'];
    if (presetKeys.indexOf(ch) >= 0) { presetIdx = presetKeys.indexOf(ch); paused = true; }
    if (ch === '0') { presetIdx = -1; paused = false; }
  });
  process.stdin.resume();
}

process.stdout.write('\x1b[?25l');
process.on('exit', () => process.stdout.write('\x1b[?25h'));
process.on('SIGINT', () => process.exit(0));

tick();