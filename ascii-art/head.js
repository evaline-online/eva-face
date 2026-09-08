(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) module.exports = factory();
  else root.AsciiLab = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var RAMP = '@%#*+=-:. ';
  var HAIR = '%#@';
  var OUT = '+*#';

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function step(a, b, x) { return clamp((x - a) / (b - a), 0, 1); }
  function shade(d) { return RAMP[clamp(Math.round(clamp(d, 0, 1) * (RAMP.length - 1)), 0, RAMP.length - 1)]; }
  function segDist(px, py, x1, y1, x2, y2) {
    var dx = x2 - x1, dy = y2 - y1;
    var t = clamp(((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy), 0, 1);
    var ex = px - (x1 + t * dx), ey = py - (y1 + t * dy);
    return Math.sqrt(ex * ex + ey * ey);
  }

  function PRESETS() {
    return [
      { name: 'нейтральный',  expression: 'neutral',   mouthOpen: 0.22, smile: 0.2,  blink: 0, glasses: 0, roll: 0, pitch: 0 },
      { name: 'улыбка',       expression: 'happy',     mouthOpen: 0.45, smile: 1,    blink: 0, glasses: 0, roll: 0, pitch: 0 },
      { name: 'грусть',       expression: 'sad',       mouthOpen: 0.12, smile: -1,   blink: 0, glasses: 0, roll: 0, pitch: 0 },
      { name: 'сердитый',     expression: 'angry',     mouthOpen: 0.12, smile: -0.6, blink: 0, glasses: 0, roll: 0, pitch: 0 },
      { name: 'сюрприз',      expression: 'surprised', mouthOpen: 0.95, smile: 0.1,  blink: 0, glasses: 0, roll: 0, pitch: 0 },
      { name: 'очки',         expression: 'neutral',   mouthOpen: 0.25, smile: 0.5,  blink: 0, glasses: 1, roll: 0, pitch: 0 }
    ];
  }

  var EXPR = {
    neutral:   { browY: -0.52, browIn: 0,    eye: 'o', browSlant: 0 },
    happy:     { browY: -0.54, browIn: 0,    eye: '^', browSlant: 0 },
    sad:       { browY: -0.50, browIn: 0.05, eye: '.', browSlant: 0.05 },
    angry:     { browY: -0.48, browIn: 0.09, eye: 'o', browSlant: 0.1 },
    surprised: { browY: -0.57, browIn: 0,    eye: '0', browSlant: 0 }
  };

  function renderHead(opt) {
    var p = opt || {};
    var W = p.width || 52, H = p.height || 26;
    var expr = p.expression || 'neutral';
    var E = EXPR[expr] || EXPR['neutral'];
    var mouth = clamp(p.mouthOpen != null ? p.mouthOpen : 0.3, 0, 1);
    var smile = clamp(p.smile != null ? p.smile : 0.2, -1, 1);
    var blink = p.blink ? 1 : 0;
    var glasses = p.glasses ? 1 : 0;
    var roll = (p.roll || 0) * Math.PI / 180;
    var pitch = (p.pitch || 0) * Math.PI / 180;
    var lookX = clamp(p.lookX != null ? p.lookX : 0, -1, 1);
    var lookY = clamp(p.lookY != null ? p.lookY : 0, -1, 1);
    var cr = Math.cos(roll), sr = Math.sin(roll);
    var eyeY = -0.40, eyeC = 0.38;

    var cx = (W - 1) * 0.5, cy = (H - 1) * 0.48;
    var rx = (W - 1) * 0.47, ry = (H - 1) * 0.46;
    var POW = 2.4;
    var rows = [];

    function U(x) { return (x - cx) / rx; }
    function V(y) { return (y - cy) / ry; }

    function isIn(u, v) { return Math.pow(Math.abs(u), POW) + Math.pow(Math.abs(v), POW) <= 1; }

    function skinLight(u, v) {
      var nx = -Math.sign(u) * Math.pow(Math.abs(u), POW - 1);
      var ny = -Math.sign(v) * Math.pow(Math.abs(v), POW - 1);
      var mag = Math.sqrt(nx * nx + ny * ny + 1);
      var ndotl = (-nx * 0.42 - ny * 0.40 + 0.82) / (mag * 1.02);
      var d = 0.30 + 0.70 * clamp(ndotl, -0.2, 1);
      if (v > 0.03 && v < 0.34 && Math.abs(u) < 0.34) d *= lerp(0.86, 1, step(0.03, 0.34, v));
      if (v > 0.48 && v < 0.66 && Math.abs(u) < 0.30) d *= lerp(0.80, 1, step(0.48, 0.66, v));
      if (u > 0.05 && u < 0.30 && v > -0.30 && v < 0.12) d *= 0.9;
      if (Math.abs(u) > 0.7) d *= lerp(0.78, 1, Math.abs(u));
      return clamp(d, 0, 1);
    }
    function lerp(a, b, t) { return a + (b - a) * t; }

    for (var y = 0; y < H; y++) {
      var line = '';
      for (var x = 0; x < W; x++) {
        var u = U(x), v = V(y);
        var uu = u * cr - v * sr;
        var vv = u * sr + v * cr;
        u = uu; v = vv;
        v -= Math.tan(pitch) * 0.5 * (1 - 0.5 * u * u);

        var inside = isIn(u, v);
        var ae = Math.pow(Math.abs(u), POW) + Math.pow(Math.abs(v), POW);
        var ch = ' ';

        if (inside || (Math.abs(u) > 1.02 && Math.abs(u) < 1.12)) {
          var d = skinLight(u, v);
          if (Math.abs(u) > 1.02 && Math.abs(u) < 1.12 && v > -0.25 && v < 0.38) {
            ch = (u > 0) ? ')' : '(';
          } else if (v < -0.74 || (Math.abs(u) > 0.90 && v < 0.06 && v > -0.86)) {
            ch = HAIR[clamp(Math.round(d * (HAIR.length - 1)), 0, HAIR.length - 1)];
          } else {
            if (ae > 0.80) ch = OUT[clamp(Math.round(d * (OUT.length - 1)), 0, OUT.length - 1)];
            else if (ae > 0.60) ch = shade(d * 0.85);
            else ch = shade(d);
          }

          var s, bz;
          for (s = -1; s <= 1; s += 2) {
            var bY = E.browY + (E.browSlant * (s < 0 ? -1 : 1));
            bz = segDist(u, v, s * 0.50, bY, s * 0.26, bY + E.browIn * 2);
            if (bz < 0.034) { ch = (s < 0) ? '\\' : '/'; }
          }

          for (s = -1; s <= 1; s += 2) {
            var cen = s * eyeC, ecx = cen;
            var eyeD = Math.pow((u - ecx) / 0.19, 2) + Math.pow((v - eyeY) / 0.175, 2);
            if (eyeD <= 1) {
              if (glasses) {
                var gD = Math.pow((u - ecx) / 0.20, 2) + Math.pow((v - eyeY) / 0.19, 2);
                if (gD > 0.62 && gD <= 1) { ch = 'O'; }
                else if (gD <= 0.62) { ch = glassesInner(u, v, ecx, s); }
              } else {
                ch = eyeInner(u, v, ecx, s);
              }
            }
            if (glasses && Math.pow((u - 0) / 1.0, 2) < 1 && Math.abs(v - (-0.40 - 0.20)) < 0.09 && Math.abs(u) < 0.18 && eyeD > 0.99) {
              if (Math.abs(v - (eyeY - 0.195)) < 0.06) ch = '=';
            }
          }

          var nose = noseChar(u, v, d);
          if (nose) ch = nose;

          var m = mouthChar(u, v, d, mouth, smile);
          if (m) ch = m;

          var pz = pzChar(u, v, d);
          if (pz) ch = pz;
        } else {
          if (v > 1.06 && Math.abs(u) < 1.06 - (v - 1.06) * 3.0) {
            ch = shade(lerp(0.42, 0.55, step(1.06, 1.22, v)));
          } else if (v > 0.92 && Math.abs(u) < 0.10) {
            ch = shade(0.5);
          }
        }
        line += ch;
      }
      rows.push(line);
    }

    function eyeInner(u, v, ecx, s) {
      var px = ecx + lookX * 0.05, py = eyeY + lookY * 0.03;
      var pD = Math.pow((u - px) / 0.045, 2) + Math.pow((v - py) / 0.05, 2);
      var iD = Math.pow((u - px) / 0.10, 2) + Math.pow((v - py) / 0.105, 2);
      if (blink) {
        if (Math.abs(v - eyeY) < 0.045 && Math.abs(u - ecx) < 0.15) return '=';
        return ' ';
      }
      if (pD <= 1) return E.eye;
      if (iD <= 1) return 'o';
      return '*';
    }

    function glassesInner(u, v, ecx, s) {
      var px = ecx + lookX * 0.05, py = eyeY + lookY * 0.03;
      var pD = Math.pow((u - px) / 0.045, 2) + Math.pow((v - py) / 0.05, 2);
      if (blink) return Math.abs(v - eyeY) < 0.045 && Math.abs(u - ecx) < 0.15 ? '=' : ' ';
      if (pD <= 1) return E.eye;
      return '*';
    }

    function noseChar(u, v, d) {
      if (u >= -0.035 && u <= 0.035 && v >= -0.36 && v <= 0.16) {
        if (Math.abs(u) <= 0.012) return '|';
        if (u > 0) return shade(d * 0.72);
        return shade(d * 0.94);
      }
      if (v >= 0.14 && v <= 0.24) {
        if ((u >= 0.05 && u <= 0.15) || (u >= -0.15 && u <= -0.05)) return ',';
        if (u >= -0.05 && u <= 0.05) return '.';
      }
      return null;
    }

    function mouthChar(u, v, d, mouth, smile) {
      var mw = 0.17 + 0.12 * mouth;
      var mh = 0.025 + 0.09 * mouth * (0.6 + 0.4 * Math.abs(smile));
      var mA = smile * 0.06;
      var upl = 0.44 + mA * ((u / mw) * (u / mw));
      var mid = 0.44;
      var me = Math.pow(u / mw, 2) + Math.pow((v - (mid - smile * 0.03 * (u / mw) * (u / mw))) / mh, 2);
      if (me > 1) return null;
      if (me > 0.68) {
        if (v < mid) return '_';
        return '-';
      }
      if (mouth > 0.12) {
        if (v < mid + 0.01 && mouth > 0.45 && u > -mw * 0.6 && u < mw * 0.62) {
          if (Math.abs(v - upl) < mh * 0.55) return '=';
        }
        return '.';
      }
      return shade(d * 0.56);
    }

    function pzChar(u, v, d) {
      if (Math.abs(u) < 0.16 && v > 0.42 && v < 0.52) return shade(d * 0.8);
      return null;
    }

    return rows;
  }

  function frame(title, body) {
    var lines = typeof body === 'string' ? body.split('\n') : body;
    var w = (title || '').length;
    for (var i = 0; i < lines.length; i++) w = Math.max(w, lines[i].length);
    var pad = Math.max(0, w - (title || '').length);
    return ['+' + new Array(w + 3).join('=') + '+'].concat(
      title ? ['| ' + title + new Array(pad + 1).join(' ') + ' |'] : [],
      lines.map(function (l) {
        return '| ' + l + new Array(Math.max(0, w - l.length) + 1).join(' ') + ' |';
      }),
      ['+' + new Array(w + 3).join('=') + '+']
    );
  }

  function animateParams(t) {
    var speech = Math.max(0, Math.sin(t * 5.3) * 0.5 + Math.sin(t * 13.7) * 0.3 + Math.sin(t * 2.9 + 1.7) * 0.3);
    var blink = (t % 3.6) > 3.42 ? 1 : 0;
    return {
      roll: Math.sin(t * 0.7) * 6 + Math.sin(t * 0.23 + 2) * 3,
      pitch: Math.sin(t * 0.5 + 1.1) * 4,
      mouthOpen: clamp(0.12 + 0.88 * Math.pow(speech, 1.4), 0, 1),
      smile: 0.3 + 0.2 * Math.sin(t * 0.9),
      blink: blink,
      lookX: Math.sin(t * 0.4 + 0.5) * 0.7,
      lookY: Math.sin(t * 0.27) * 0.5,
      glasses: 0,
      expression: 'neutral'
    };
  }

  return {
    renderHead: renderHead,
    animateParams: animateParams,
    presets: PRESETS,
    frame: frame,
    RAMP: RAMP
  };
});