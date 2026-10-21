// Gera a fonte pixel JokenPixel (assets/fonts/jokenpixel.otf).
//
//   node tools/font/build.mjs
//
// Cada pixel vale 125 unidades e o em tem 8 pixels (1000 unidades),
// então tamanhos de 8, 16, 24, 32px renderizam nítidos.
import opentype from 'opentype.js';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { UPPER, LOWER, DIGITS, SYMBOLS, MARKS, ACCENTED, CEDILLA } from './glyphs.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const P = 125;           // unidades por pixel
const BASE_ROW = 6;      // linha da base

/** Converte linhas ASCII em lista de pixels [x, linha]. */
function toPixels(rows, rowOffset = 0) {
  const px = [];
  rows.forEach((r, y) => [...r].forEach((ch, x) => { if (ch === '#') px.push([x, y + rowOffset]); }));
  return px;
}

function bounds(px) {
  const xs = px.map(p => p[0]);
  return { min: Math.min(...xs), max: Math.max(...xs) };
}

/** Glifo = { px, width } com x a partir de 0. */
function glyphFrom(rows) {
  const width = Math.max(...rows.map(r => r.length));
  return { px: toPixels(rows), width };
}

const BITMAPS = new Map();
for (const set of [UPPER, LOWER, DIGITS, SYMBOLS]) {
  for (const [ch, rows] of Object.entries(set)) BITMAPS.set(ch, glyphFrom(rows));
}

/** Centraliza `extra` sobre a base e normaliza x >= 0. */
function compose(base, extra) {
  const eb = bounds(extra);
  const ew = eb.max - eb.min + 1;
  const off = Math.floor((base.width - ew) / 2) - eb.min;
  let px = [...base.px, ...extra.map(([x, y]) => [x + off, y])];
  const minX = Math.min(0, ...px.map(p => p[0]));
  px = px.map(([x, y]) => [x - minX, y]);
  const width = Math.max(base.width - minX, ...px.map(p => p[0] + 1));
  return { px, width };
}

for (const [ch, [baseCh, mark]] of Object.entries(ACCENTED)) {
  const base = BITMAPS.get(baseCh);
  const isUpper = baseCh === baseCh.toUpperCase() && baseCh !== 'ı';
  const rows = MARKS[mark];
  const extra = toPixels(rows, isUpper ? -rows.length : 2 - rows.length);
  BITMAPS.set(ch, compose(base, extra));
}
for (const [ch, baseCh] of Object.entries(CEDILLA)) {
  BITMAPS.set(ch, compose(BITMAPS.get(baseCh), toPixels(['.#', '#.'], 7)));
}

/**
 * Traça o contorno da união dos pixels (arestas internas se cancelam),
 * gerando polígonos limpos sem emendas entre pixels.
 */
function tracePath(px) {
  const key = (a, b) => `${a[0]},${a[1]}>${b[0]},${b[1]}`;
  const edges = new Map();
  const add = (a, b) => {
    const rev = key(b, a);
    if (edges.has(rev)) edges.delete(rev);
    else edges.set(key(a, b), [a, b]);
  };
  for (const [x, row] of px) {
    const y0 = BASE_ROW - row, y1 = y0 + 1; // coordenadas com y para cima
    // sentido horário em y-para-cima
    add([x, y0], [x, y1]);
    add([x, y1], [x + 1, y1]);
    add([x + 1, y1], [x + 1, y0]);
    add([x + 1, y0], [x, y0]);
  }
  const from = new Map();
  for (const [a, b] of edges.values()) {
    const k = `${a[0]},${a[1]}`;
    if (!from.has(k)) from.set(k, []);
    from.get(k).push(b);
  }
  const path = new opentype.Path();
  const used = new Set();
  for (const [a, b] of edges.values()) {
    if (used.has(key(a, b))) continue;
    const loop = [a];
    let cur = a, next = b;
    used.add(key(a, b));
    while (!(next[0] === a[0] && next[1] === a[1])) {
      loop.push(next);
      const options = from.get(`${next[0]},${next[1]}`).filter(n => !used.has(key(next, n)));
      const n = options[0];
      used.add(key(next, n));
      cur = next; next = n;
    }
    // remove vértices colineares
    const pts = loop.filter((p, i) => {
      const prev = loop[(i - 1 + loop.length) % loop.length], nxt = loop[(i + 1) % loop.length];
      return (p[0] - prev[0]) * (nxt[1] - p[1]) !== (p[1] - prev[1]) * (nxt[0] - p[0]);
    });
    pts.forEach(([x, y], i) => (i ? path.lineTo(x * P, y * P) : path.moveTo(x * P, y * P)));
    path.close();
  }
  return path;
}

const glyphs = [
  new opentype.Glyph({ name: '.notdef', unicode: 0, advanceWidth: 6 * P, path: tracePath(toPixels(['#####', '#...#', '#...#', '#...#', '#...#', '#...#', '#####'])) }),
];
for (const [ch, g] of BITMAPS) {
  if (ch === 'ı') continue;
  glyphs.push(new opentype.Glyph({
    name: `uni${ch.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')}`,
    unicode: ch.codePointAt(0),
    advanceWidth: (g.width + 1) * P,
    path: tracePath(g.px),
  }));
}
// i sem pingo também acessível pelo código U+0131
const dotless = BITMAPS.get('ı');
glyphs.push(new opentype.Glyph({ name: 'dotlessi', unicode: 0x131, advanceWidth: (dotless.width + 1) * P, path: tracePath(dotless.px) }));
// espaço inseparável
glyphs.push(new opentype.Glyph({ name: 'nbspace', unicode: 0xa0, advanceWidth: 4 * P, path: new opentype.Path() }));

const font = new opentype.Font({
  familyName: 'JokenPixel',
  styleName: 'Regular',
  unitsPerEm: 8 * P,
  ascender: 9 * P,
  descender: -2 * P,
  designer: 'JokenGhost',
  glyphs,
});

const out = join(ROOT, 'assets', 'fonts', 'jokenpixel.otf');
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, Buffer.from(font.toArrayBuffer()));
console.log(`${glyphs.length} glifos -> assets/fonts/jokenpixel.otf`);

// prévia opcional: node build.mjs --preview <arquivo.png>
const pi = process.argv.indexOf('--preview');
if (pi > 0) {
  const { Grid } = await import('../sprites/lib/grid.mjs');
  const { toPNG } = await import('../sprites/lib/export.mjs');
  const text = [
    'JOKENGHOST: CAÇADA EM TURNOS',
    'Aspirador, Estaca e Cruz! Fantasma?',
    'ÁÀÂÃ ÉÊ Í ÓÔÕ Ú Ç áàâã éê í óôõ ú ç',
    'abcdefghijklmnopqrstuvwxyz 0123456789',
    '$+-=/()[]%#&*<>"\' .,:;!? ♥★☠▶◀▼▲→•×',
    'Você venceu! Próxima fase: Pátio da Mansão',
  ];
  const g = new Grid(260, text.length * 12 + 4);
  text.forEach((line, li) => {
    let x = 2;
    for (const ch of line) {
      const b = BITMAPS.get(ch) || BITMAPS.get('?');
      for (const [px, row] of b.px) g.set(x + px, 4 + li * 12 + row, 'w');
      x += b.width + 1;
    }
  });
  writeFileSync(process.argv[pi + 1], toPNG(g, { scale: 4, background: '#1c1729' }));
}
