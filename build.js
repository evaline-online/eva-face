const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname);

const md = fs.readFileSync(path.join(dir, 'best-ascii-faces.md'), 'utf8');
const lines = md.split(/\r?\n/);

const items = [];
const reHeading = /^(#{2,3})\s+\d+(\.\d+)*\.?\s*(.*)$/;

let cur = null;
let inFence = false;
let buf = [];

function flush() {
  if (!cur) return;
  const art = buf.join('\n').replace(/\n+$/, '').replace(/^\n+/, '');
  if (art) {
    items.push({
      id: cur.id,
      title: cur.title,
      artist: cur.artist || 'неизвестен',
      art: art
    });
  }
}

for (let i = 0; i < lines.length; i++) {
  const l = lines[i];
  const h = l.match(reHeading);
  if (h) {
    flush();
    cur = {
      id: items.length + 1,
      title: h[3].trim(),
      artist: null
    };
    buf = [];
    inFence = false;
    continue;
  }
  if (!cur) continue;
  if (/^\s*```/.test(l)) {
    if (inFence) { inFence = false; buf.push(''); }
    else inFence = true;
    continue;
  }
  if (inFence) { buf.push(l); continue; }
  const a = l.match(/^Автор:\s*(.*)$/);
  if (a) cur.artist = a[1].trim();
}
flush();

items.forEach(function (it) {
  if (it.artist === 'неизвестен') it.artist = it.title;
});

const headSrc = fs.readFileSync(path.join(dir, 'head.js'), 'utf8');
const data = { generated: new Date().toISOString(), count: items.length, items };

fs.writeFileSync(path.join(dir, 'faces.json'), JSON.stringify(data, null, 2));

let html = fs.readFileSync(path.join(dir, 'viewer.template.html'), 'utf8');
const facesJson = JSON.stringify(data);
html = html.replace('/*__HEADS__*/', () => headSrc)
           .replace('/*__FACES__*/', () => facesJson)
           .replace('__COUNT__', () => String(items.length));
fs.writeFileSync(path.join(dir, 'viewer.html'), html);

let h3 = fs.readFileSync(path.join(dir, 'head3d.template.html'), 'utf8');
h3 = h3.replace('/*__HEADS__*/', () => headSrc);
fs.writeFileSync(path.join(dir, 'head3d.html'), h3);

console.log('viewer.html + head3d.html generated');
console.log('faces.json:', items.length, 'items');
items.forEach(it => console.log('  #' + it.id + ' [' + it.artist + '] ' + it.title + '  (' + it.art.length + ' chars)'));