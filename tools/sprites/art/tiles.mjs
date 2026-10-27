// Tiles 64x64 para montar os cenários das fases.
// Tiles "repetíveis" encaixam com eles mesmos na horizontal e/ou vertical.
import { Grid, sheet, rng } from '../lib/grid.mjs';

const wrap = (v) => ((v % 64) + 64) % 64;
/** Desenha com coordenadas que dão a volta (para tiles repetíveis). */
function wset(g, x, y, c) { g.set(wrap(Math.round(x)), wrap(Math.round(y)), c); }
function wcircle(g, cx, cy, r, c) {
  for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r + r * 0.6) wset(g, cx + x, cy + y, c);
}

// ═══════════════════ COMPARTILHADOS ═══════════════════
function moon() {
  const g = new Grid();
  g.circle(32, 32, 26, 'y4@12');
  g.circle(32, 32, 22, 'y4@20');
  const M = new Grid();
  M.circle(32, 32, 18, 'q4');
  M.shade({ light: 0, dark: 1, depth: 3 });
  g.blit(M);
  for (const [x, y, r] of [[26, 26, 3], [37, 35, 4], [30, 40, 2], [39, 24, 2]]) g.circle(x, y, r, 'q3');
  return g;
}

function cloud() {
  const g = new Grid();
  for (const [x, y, r] of [[12, 40, 9], [24, 32, 12], [38, 34, 11], [52, 40, 9], [32, 44, 10]]) g.circle(x, y, r, 'p2');
  g.rect(4, 42, 56, 8, 'p2');
  g.erase((x, y) => y > 50);
  g.shade({ light: 1, dark: 0 });
  return g;
}

function fog() {
  const g = new Grid();
  const r = rng(4);
  for (let y = 20; y < 52; y++) {
    const dens = 1 - Math.abs(y - 36) / 16;
    for (let x = 0; x < 64; x++) {
      const wave = Math.sin((x / 64) * Math.PI * 4 + y * 0.3) * 0.25;
      if (r() < dens * 0.55 + wave) g.set(x, y, dens > 0.6 ? 'gh4@35' : 'gh3@25');
    }
  }
  return g;
}

// ═══════════════════ FLORESTA (fase 1) ═══════════════════
function treeFar() {
  const g = new Grid();
  const r = rng(21);
  g.rect(0, 44, 64, 20, 'c1');
  // copas pontudas que se repetem (pinheiros) — posições simétricas no ciclo
  for (const [cx, h, w] of [[8, 34, 10], [24, 44, 12], [40, 30, 10], [56, 40, 12]]) {
    for (let y = 0; y < h; y++) {
      const half = Math.round((y / h) * w);
      for (let x = -half; x <= half; x++) wset(g, cx + x, 64 - h - 6 + y + 6, 'c1');
    }
  }
  for (let i = 0; i < 20; i++) wset(g, r() * 64, 30 + r() * 30, 'c2'); // folhas iluminadas pela lua
  return g;
}

function treeTrunk() {
  const g = new Grid();
  g.rect(20, 0, 24, 64, 'm2');
  g.rect(20, 0, 3, 64, 'm3');
  g.rect(41, 0, 3, 64, 'm1');
  const r = rng(31);
  for (let i = 0; i < 14; i++) {
    const x = 24 + Math.floor(r() * 16), y = Math.floor(r() * 64), h = 3 + Math.floor(r() * 8);
    for (let j = 0; j < h; j++) wset(g, x, y + j, 'm1');
  }
  for (let i = 0; i < 6; i++) wset(g, 23 + r() * 18, r() * 64, 'm3');
  // musgo
  for (let y = 10; y < 22; y++) if (y % 3) g.set(21 + (y % 2), y, 'v3');
  g.frame(19, -1, 26, 66, 'k');
  return g;
}

function treeRoots() {
  const g = treeTrunk();
  g.erase((x, y) => y > 40);
  g.poly([[18, 40], [46, 40], [60, 62], [4, 62]], 'm2');
  g.poly([[18, 40], [26, 40], [12, 62], [4, 62]], 'm3');
  g.poly([[38, 40], [46, 40], [60, 62], [50, 62]], 'm1');
  g.rect(4, 62, 56, 2, 'm1');
  g.rect(18, 40, 1, 2, 'k'); g.rect(45, 40, 1, 2, 'k');
  g.line(18, 41, 4, 62, 'k').line(45, 41, 60, 62, 'k');
  return g;
}

function treeCrown() {
  const g = new Grid();
  const r = rng(41);
  for (const [x, y, rad] of [[32, 34, 22], [14, 42, 13], [50, 42, 13], [24, 20, 14], [42, 22, 14], [32, 12, 11]]) g.circle(x, y, rad, 'v2');
  g.shade({ depth: 3, light: 1 });
  // tufos de folhas
  for (let i = 0; i < 40; i++) {
    const x = 6 + r() * 52, y = 6 + r() * 50;
    if (g.get(x, y) && g.get(x - 2, y - 2)) { g.set(x, y, 'v3'); g.set(x + 1, y, 'v3'); g.set(x, y - 1, 'v4'); }
  }
  g.outline('k');
  return g;
}

function grassTop() {
  const g = new Grid();
  const r = rng(51);
  g.rect(0, 20, 64, 44, 'm2');
  g.rect(0, 16, 64, 8, 'v2');
  for (let x = 0; x < 64; x++) {
    const h = 2 + Math.floor(r() * 6);
    for (let y = 0; y < h; y++) g.set(x, 16 - y, y > h - 2 ? 'v4' : 'v3');
    if (r() < 0.3) g.set(x, 24 + Math.floor(r() * 3), 'v2');
  }
  for (let i = 0; i < 12; i++) wset(g, r() * 64, 30 + r() * 32, r() > 0.5 ? 'm1' : 'm3');
  g.rect(0, 22, 64, 1, 'm1');
  return g;
}

function dirt() {
  const g = new Grid();
  const r = rng(61);
  g.rect(0, 0, 64, 64, 'm2');
  for (let i = 0; i < 30; i++) wset(g, r() * 64, r() * 64, r() > 0.4 ? 'm1' : 'm3');
  for (let i = 0; i < 4; i++) { const x = r() * 64, y = r() * 64; wset(g, x, y, 't3'); wset(g, x + 1, y, 't2'); }
  return g;
}

function bush() {
  const g = new Grid();
  for (const [x, y, rad] of [[18, 46, 13], [34, 40, 16], [50, 48, 11]]) g.circle(x, y, rad, 'v2');
  g.erase((x, y) => y > 60);
  g.shade({ depth: 2 });
  const r = rng(71);
  for (let i = 0; i < 20; i++) { const x = 8 + r() * 50, y = 30 + r() * 26; if (g.get(x, y) === 'v2') g.set(x, y, 'v3'); }
  for (const [x, y] of [[24, 40], [40, 36], [46, 48]]) { g.set(x, y, 'r3'); g.set(x + 1, y, 'r4'); }
  g.outline('k');
  return g;
}

function mushrooms() {
  const g = new Grid();
  g.ellipse(32, 60, 26, 3, 'c3@25');
  for (const [x, h, r] of [[18, 14, 8], [36, 22, 11], [50, 10, 6]]) {
    g.rect(x - 2, 60 - h, 5, h, 'q3');
    g.ellipse(x, 60 - h, r, Math.ceil(r * 0.6), 'c3');
  }
  g.shade();
  for (const [x, y] of [[33, 36], [39, 37], [16, 45], [49, 49]]) g.set(x, y, 'c5');
  g.outline('k');
  return g;
}

function mansionFar() {
  const g = new Grid();
  g.ellipse(32, 64, 34, 14, 'p1');                   // colina
  g.rect(14, 30, 36, 22, 'p1');                      // corpo
  g.poly([[12, 30], [32, 16], [52, 30]], 'p1');      // telhado
  g.rect(16, 14, 6, 18, 'p1'); g.poly([[14, 14], [19, 4], [24, 14]], 'p1');  // torre
  g.rect(42, 18, 5, 14, 'p1'); g.poly([[40, 18], [44, 10], [49, 18]], 'p1');
  for (const [x, y] of [[20, 36], [27, 36], [36, 36], [43, 36], [27, 44], [36, 44], [18, 18]]) {
    g.rect(x, y, 3, 4, (x * y) % 3 ? 'y3' : 'o3');
  }
  g.rect(31, 44, 3, 8, 'k');
  return g;
}

function gravestone() {
  const g = new Grid();
  const S = new Grid();
  S.rect(20, 24, 24, 34, 't3');
  S.ellipse(32, 24, 12, 10, 't3');
  S.shade({ depth: 2 });
  g.blit(S);
  g.rect(30, 22, 4, 16, 't2'); g.rect(25, 27, 14, 4, 't2');
  g.px([[22, 50], [23, 49], [41, 44]], 'v3');
  g.rect(14, 58, 36, 4, 'm2');
  g.outline('k');
  return g;
}

// ═══════════════════ PÁTIO (fase 2) ═══════════════════
function fence() {
  const g = new Grid();
  g.rect(0, 30, 64, 3, 'g1');
  g.rect(0, 52, 64, 3, 'g1');
  for (let x = 4; x < 64; x += 12) {
    g.rect(x, 18, 3, 46, 'g1');
    g.poly([[x - 2, 19], [x + 1, 11], [x + 4, 19]], 'g1');
    g.set(x + 1, 13, 'g3');
    g.rect(x, 22, 1, 40, 'g2');
  }
  return g;
}

function wallStone() {
  const g = new Grid();
  g.rect(0, 0, 64, 64, 't2');
  for (let row = 0; row < 8; row++) {
    const y = row * 8, off = row % 2 ? 8 : 0;
    g.rect(0, y, 64, 1, 't1');
    for (let x = off; x < 64 + 16; x += 16) {
      g.rect(wrap(x), y, 1, 8, 't1');
      g.rect(wrap(x + 1), y + 1, 14, 1, 't3');
    }
  }
  const r = rng(81);
  for (let i = 0; i < 10; i++) wset(g, r() * 64, r() * 64, r() > 0.5 ? 'v2' : 't1');
  return g;
}

function windowLit(frame = 0) {
  const g = new Grid();
  g.rect(14, 8, 36, 50, 'k');
  g.ellipse(32, 12, 18, 10, 'k');
  g.erase((x, y) => y > 58);
  const glow = ['y3', 'y3', 'o4', 'y4'][frame];
  g.rect(17, 14, 30, 41, glow);
  g.ellipse(32, 14, 15, 7, glow);
  g.rect(31, 6, 2, 50, 'k'); g.rect(16, 30, 32, 2, 'k');
  g.rect(12, 56, 40, 4, 't4');
  // silhueta misteriosa na janela
  if (frame === 3) { g.ellipse(24, 40, 4, 5, 'k2'); g.rect(20, 44, 9, 10, 'k2'); }
  return g;
}

function deadTree() {
  const g = new Grid();
  g.stroke(32, 63, 30, 30, 6, 'k2');
  g.stroke(30, 34, 14, 14, 3, 'k2');
  g.stroke(31, 30, 46, 10, 3, 'k2');
  g.stroke(20, 22, 10, 22, 2, 'k2');
  g.stroke(40, 18, 52, 20, 2, 'k2');
  g.stroke(46, 10, 50, 2, 2, 'k2');
  g.stroke(14, 14, 10, 6, 2, 'k2');
  g.stroke(32, 50, 46, 44, 3, 'k2');
  g.line(30, 60, 30, 34, 'g1');
  return g;
}

function cobble() {
  const g = new Grid();
  g.rect(0, 0, 64, 64, 't1');
  const r = rng(91);
  for (let row = 0; row < 6; row++) {
    const off = row % 2 ? 6 : 0;
    for (let x = off - 12; x < 64; x += 12) {
      const y = row * 11 + 1;
      for (let j = 0; j < 9; j++) for (let i = 0; i < 10; i++) {
        const corner = (i === 0 || i === 9) && (j === 0 || j === 8);
        if (!corner) wset(g, x + i, y + j, j < 2 ? 't4' : j > 6 ? 't2' : 't3');
      }
      if (r() > 0.6) wset(g, x + 3, y + 7, 'v2');
    }
  }
  return g;
}

function lampPost(frame = 0) {
  const g = new Grid();
  g.rect(30, 22, 4, 42, 'g1');
  g.rect(26, 58, 12, 6, 'g1');
  g.poly([[24, 10], [40, 10], [38, 24], [26, 24]], 'g1');
  g.rect(27, 12, 10, 10, ['y3', 'y4', 'y3', 'o4'][frame]);
  g.rect(31, 12, 2, 10, 'g1');
  g.poly([[24, 10], [32, 3], [40, 10]], 'g1');
  return g;
}

function hedge() {
  const g = new Grid();
  g.rect(0, 26, 64, 38, 'v1');
  const r = rng(101);
  for (let x = 0; x < 64; x += 4) wcircle(g, x, 26, 4, 'v1');
  for (let i = 0; i < 50; i++) { const x = r() * 64, y = 24 + r() * 38; if (g.get(x, y)) wset(g, x, y, 'v2'); }
  return g;
}

// ═══════════════════ INTERIOR (fase 3) ═══════════════════
function wallpaper() {
  const g = new Grid();
  g.rect(0, 0, 64, 64, 'p2');
  // padrão damasco (losangos e flor)
  for (const [cx, cy] of [[16, 16], [48, 48], [48, 16], [16, 48]]) {
    const big = (cx + cy) % 64 === 32;
    for (let i = 0; i < 6; i++) {
      wset(g, cx + i, cy - 6 + i, 'p3'); wset(g, cx - i, cy - 6 + i, 'p3');
      wset(g, cx + i, cy + 6 - i, 'p3'); wset(g, cx - i, cy + 6 - i, 'p3');
    }
    if (big) { wcircle(g, cx, cy, 2, 'p3'); wset(g, cx, cy, 'p4'); }
    else wset(g, cx, cy, 'p4');
  }
  for (let y = 0; y < 64; y += 32) g.rect(0, y, 64, 1, 'p1');
  return g;
}

function wainscot() {
  const g = new Grid();
  g.rect(0, 0, 64, 64, 'm2');
  g.rect(0, 0, 64, 6, 'm4'); g.rect(0, 6, 64, 2, 'm1');
  g.rect(0, 1, 64, 1, 'm5');
  for (const x of [4, 36]) {
    g.frame(x, 14, 24, 42, 'm1');
    g.rect(x + 1, 15, 22, 1, 'm3');
    g.rect(x + 1, 15, 1, 40, 'm3');
  }
  g.rect(0, 60, 64, 4, 'm1');
  return g;
}

function windowMoon() {
  const g = new Grid();
  g.rect(14, 6, 36, 54, 'k');
  g.rect(16, 8, 32, 50, 'b2');
  g.circle(38, 20, 6, 'q4');
  g.circle(36, 19, 5, 'b2');
  for (const [x, y] of [[22, 14], [28, 30], [42, 40], [20, 46]]) g.set(x, y, 'w');
  g.rect(31, 8, 2, 50, 'k'); g.rect(16, 30, 32, 2, 'k');
  // cortinas vermelhas
  for (const side of [0, 1]) {
    const C = new Grid();
    const x0 = side ? 42 : 8;
    C.poly(side ? [[44, 2], [58, 2], [58, 62], [52, 62], [46, 30]] : [[6, 2], [20, 2], [18, 30], [12, 62], [6, 62]], 'r2');
    C.shade();
    for (let y = 4; y < 60; y += 1) if (y % 6 === 0) C.set(x0 + 6, y, 'r1');
    g.blit(C);
  }
  g.rect(4, 0, 56, 3, 'y2');
  return g;
}

function portrait() {
  const g = new Grid();
  g.rect(14, 8, 36, 46, 'y2');
  g.frame(14, 8, 36, 46, 'y1');
  g.rect(18, 12, 28, 38, 'k2');
  g.ellipse(32, 26, 7, 8, 'q2');
  g.rect(24, 34, 17, 16, 'r1');
  g.rect(28, 25, 3, 2, 'r3'); g.rect(34, 25, 3, 2, 'r3'); // olhos que seguem você
  g.rect(25, 18, 15, 4, 'k');
  g.px([[16, 10], [17, 10], [16, 11]], 'y4');
  g.outline('k');
  return g;
}

function candelabra(frame = 0) {
  const g = new Grid();
  const r = rng(200 + frame);
  g.rect(30, 30, 4, 28, 'y2');
  g.rect(22, 58, 20, 4, 'y2');
  g.rect(16, 30, 32, 3, 'y2');
  for (const x of [17, 31, 45]) {
    g.rect(x, 22, 3, 8, 'q3');
    const h = 4 + Math.floor(r() * 3);
    g.poly([[x - 1, 22], [x + 4, 22], [x + 1 + (frame % 2), 22 - h - 1]], 'o3');
    g.rect(x + 1, 19, 1, 2, 'y4');
  }
  g.outline('k');
  return g;
}

function floorWood() {
  const g = new Grid();
  for (let row = 0; row < 4; row++) {
    const y = row * 16;
    g.rect(0, y, 64, 16, row % 2 ? 'm3' : 'm2');
    g.rect(0, y, 64, 1, 'm1');
    g.rect(0, y + 1, 64, 1, row % 2 ? 'm4' : 'm3');
    const off = (row * 23) % 64;
    g.rect(wrap(off), y, 1, 16, 'm1');
    g.rect(wrap(off + 32), y, 1, 16, 'm1');
  }
  return g;
}

function carpet() {
  const g = floorWood();
  g.rect(0, 8, 64, 48, 'r2');
  g.rect(0, 8, 64, 3, 'y2'); g.rect(0, 53, 64, 3, 'y2');
  for (let x = 0; x < 64; x += 8) { g.rect(x + 2, 16, 4, 4, 'r3'); g.rect(x + 3, 17, 2, 2, 'y2'); }
  g.rect(0, 30, 64, 4, 'r1');
  return g;
}

function bookshelf() {
  const g = new Grid();
  g.rect(6, 2, 52, 62, 'm2');
  g.frame(6, 2, 52, 62, 'm1');
  const r = rng(300);
  const colors = ['r2', 'b2', 'v2', 'p3', 'y2', 'm4'];
  for (const sy of [6, 26, 46]) {
    g.rect(8, sy + 16, 48, 2, 'm4');
    let x = 9;
    while (x < 54) {
      const w = 2 + Math.floor(r() * 3), h = 10 + Math.floor(r() * 6);
      if (x + w > 55) break;
      g.rect(x, sy + 16 - h, w, h, colors[Math.floor(r() * colors.length)]);
      g.set(x, sy + 16 - h + 2, 'y3');
      x += w + (r() > 0.8 ? 2 : 0);
    }
  }
  g.outline('k');
  return g;
}

// ═══════════════════ CÂMARA (fase 4) ═══════════════════
function brickDark() {
  const g = new Grid();
  g.rect(0, 0, 64, 64, 'g1');
  for (let row = 0; row < 8; row++) {
    const y = row * 8, off = row % 2 ? 10 : 0;
    g.rect(0, y, 64, 1, 'k2');
    for (let x = off; x < 64 + 20; x += 20) g.rect(wrap(x), y, 1, 8, 'k2');
  }
  const r = rng(400);
  for (let i = 0; i < 14; i++) wset(g, r() * 64, r() * 64, r() > 0.7 ? 'r1' : 'g2');
  return g;
}

function pillar() {
  const g = new Grid();
  g.rect(14, 0, 36, 64, 't2');
  g.rect(14, 0, 4, 64, 't3'); g.rect(46, 0, 4, 64, 't1');
  for (const x of [22, 30, 38]) g.rect(x, 0, 2, 64, 't1');
  g.rect(13, 0, 1, 64, 'k'); g.rect(50, 0, 1, 64, 'k');
  return g;
}

function torch(frame = 0) {
  const g = new Grid();
  const r = rng(500 + frame);
  g.poly([[26, 34], [38, 34], [35, 44], [29, 44]], 'g2');
  g.rect(30, 44, 4, 14, 'm2');
  g.rect(28, 52, 8, 3, 'g2');
  for (let i = 0; i < 3; i++) {
    const c = ['r3', 'o3', 'y3'][i], w = 6 - i * 2, h = 16 - i * 4 + Math.floor(r() * 4);
    g.poly([[32 - w, 34], [32 + w, 34], [32 + Math.floor(r() * 4) - 2, 34 - h]], c);
  }
  g.set(31 + Math.floor(r() * 4), 10 - frame, 'o4');
  return g;
}

function floorStone() {
  const g = new Grid();
  g.rect(0, 0, 64, 64, 'g2');
  g.rect(0, 0, 64, 1, 'k2'); g.rect(0, 32, 64, 1, 'k2');
  g.rect(0, 0, 1, 32, 'k2'); g.rect(32, 0, 1, 32, 'k2');
  g.rect(16, 32, 1, 32, 'k2'); g.rect(48, 32, 1, 32, 'k2');
  g.rect(1, 1, 31, 1, 'g3'); g.rect(33, 1, 31, 1, 'g3');
  g.rect(0, 33, 16, 1, 'g3'); g.rect(17, 33, 31, 1, 'g3'); g.rect(49, 33, 15, 1, 'g3');
  const r = rng(600);
  for (let i = 0; i < 10; i++) wset(g, r() * 64, r() * 64, 'g1');
  return g;
}

function rune(frame = 0) {
  const g = new Grid();
  const c = ['r2', 'r3', 'r4', 'r3'][frame];
  g.ring(32, 32, 28, 2, c);
  const pts = [];
  for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i * Math.PI * 4 / 5; pts.push([32 + Math.cos(a) * 26, 32 + Math.sin(a) * 26]); }
  for (let i = 0; i < 5; i++) g.line(...pts[i], ...pts[(i + 1) % 5], c);
  // achatado para parecer no chão
  const flat = new Grid();
  g.forEach((x, y, col) => flat.set(x, 40 + Math.round((y - 32) * 0.35), col));
  return flat;
}

function chains() {
  const g = new Grid();
  for (const x of [18, 44]) for (let y = 0; y < 64; y += 8) {
    if ((y / 8) % 2) g.frame(x - 1, y, 3, 8, 'g3');
    else g.frame(x - 3, y, 7, 8, 'g3');
  }
  return g;
}

function banner() {
  const g = new Grid();
  g.rect(10, 2, 44, 3, 'm3');
  g.poly([[14, 5], [50, 5], [50, 58], [32, 50], [14, 58]], 'r2');
  g.shade();
  // emblema do Kastle (chapéu de bobo)
  g.poly([[24, 30], [40, 30], [32, 16]], 'c3');
  g.poly([[24, 30], [20, 22], [28, 28]], 'c3');
  g.poly([[40, 30], [44, 22], [36, 28]], 'c3');
  g.circle(20, 21, 2, 'y3'); g.circle(44, 21, 2, 'y3'); g.circle(32, 15, 2, 'y3');
  g.rect(24, 30, 17, 2, 'y3');
  g.outline('k');
  return g;
}

function skulls() {
  const g = new Grid();
  for (const [x, y] of [[20, 52], [36, 54], [50, 53], [28, 42], [44, 43], [36, 32]]) {
    const S = new Grid();
    S.ellipse(x, y, 7, 6, 'g5');
    S.rect(x - 4, y + 3, 9, 4, 'g5');
    S.shade();
    S.ellipse(x - 3, y, 1, 2, 'k2'); S.ellipse(x + 3, y, 1, 2, 'k2');
    S.outline('k');
    g.blit(S);
  }
  return g;
}

// ═══════════════════ MAPA DE FASES ═══════════════════
/** Moldura redonda de madeira das vinhetas: fundo `bgC` e o desenho `inner` recortado no círculo. */
export function framedLocation(bgC, inner) {
  const g = new Grid();
  g.circle(32, 32, 28, bgC);
  inner.erase((x, y) => Math.hypot(x - 32, y - 32) > 27 || (inner.get(x, y) || '').includes('@'));
  g.blit(inner);
  g.ring(32, 32, 29, 3, 'm3');
  g.ring(32, 32, 30, 1, 'm5');
  g.outline('k');
  return g;
}

/** Vinhetas 64x64 que representam cada local no mapa. */
function location(kind) {
  const bgC = { floresta: 'v1', patio: 'p1', mansao: 'p2', camara: 'r1' }[kind];
  const inner = new Grid();
  if (kind === 'floresta') {
    inner.blit(treeCrown().shifted(0, -6));
    inner.rect(28, 44, 8, 20, 'm2');
    inner.circle(48, 16, 5, 'q4');
  } else if (kind === 'patio') {
    inner.blit(fence().shifted(0, 4));
    inner.blit(mansionFar().shifted(0, -16));
  } else if (kind === 'mansao') {
    inner.rect(12, 18, 40, 46, 'm2');
    inner.ellipse(32, 18, 20, 10, 'm2');
    inner.rect(18, 22, 28, 42, 'k2');
    inner.ellipse(32, 22, 14, 7, 'k2');
    inner.circle(32, 34, 3, 'y3');
    inner.rect(26, 50, 12, 14, 'r2');
  } else {
    inner.blit(skulls().shifted(0, -14));
    inner.blit(torch(1).shifted(-18, 0));
    inner.blit(torch(2).shifted(18, 0));
  }
  return framedLocation(bgC, inner);
}

function pathDot() {
  const g = new Grid();
  g.ellipse(32, 32, 7, 5, 'm4');
  g.shade();
  g.outline('k');
  return g;
}


// ═══════════════════ PLATAFORMAS (batalha estilo Pokémon) ═══════════════════
/** Oval achatado onde os lutadores ficam de pé. C = [topo, luz, borda, lateral]. */
export function platformBase(C) {
  const g = new Grid();
  g.ellipse(32, 36, 30, 10, C[3]);           // lateral (espessura)
  g.ellipse(32, 33, 30, 10, C[2]);
  g.ellipse(32, 32, 29, 9, C[0]);
  g.ellipse(30, 30, 22, 5, C[1]);            // luz no topo
  g.ellipse(32, 32, 20, 5, C[0]);
  return g;
}

function platform(kind) {
  const C = {
    grama: ['v3', 'v4', 'v2', 'm2'],
    pedra: ['t3', 't4', 't2', 't1'],
    tapete: ['r2', 'r3', 'r1', 'm1'],
    runa: ['g2', 'g3', 'g1', 'k2'],
  }[kind];
  const g = platformBase(C);
  if (kind === 'grama') {
    const r = rng(77);
    for (let i = 0; i < 16; i++) {
      const x = 6 + r() * 52, y = 26 + r() * 12;
      if (g.get(x, y) && g.get(x, y + 2)) { g.set(x, y, 'v5'); g.set(x, y - 1, 'v4'); }
    }
  } else if (kind === 'pedra') {
    for (const [x0, y0, x1, y1] of [[10, 30, 54, 30], [16, 35, 48, 35], [24, 25, 22, 41], [40, 25, 42, 41]]) g.line(x0, y0, x1, y1, C[2]);
  } else if (kind === 'tapete') {
    const T = new Grid();
    T.ellipse(32, 32, 24, 7, 'y2');
    T.ellipse(32, 32, 22, 6, null);
    T.erase((x, y) => Math.hypot((x - 32) / 22, (y - 32) / 6) < 1);
    g.blit(T);
  } else if (kind === 'runa') {
    const R = new Grid();
    R.ellipse(32, 32, 24, 7, 'r3');
    R.erase((x, y) => Math.hypot((x - 32) / 22, (y - 32) / 5.5) < 1);
    g.blit(R);
    for (const [x, y] of [[32, 26], [14, 32], [50, 32], [22, 37], [42, 37]]) g.set(x, y, 'r4');
  }
  g.outline('k');
  return g;
}

export function tileSheets() {
  return {
    moon: moon(), cloud: cloud(), fog: fog(),
    tree_far: treeFar(), tree_trunk: treeTrunk(), tree_roots: treeRoots(), tree_crown: treeCrown(),
    grass_top: grassTop(), dirt: dirt(), bush: bush(), mushrooms: mushrooms(),
    mansion_far: mansionFar(), gravestone: gravestone(),
    fence: fence(), wall_stone: wallStone(), window_lit: sheet([0, 1, 2, 3].map(windowLit)),
    dead_tree: deadTree(), cobble: cobble(), lamp: sheet([0, 1, 2, 3].map(lampPost)), hedge: hedge(),
    wallpaper: wallpaper(), wainscot: wainscot(), window_moon: windowMoon(), portrait: portrait(),
    candelabra: sheet([0, 1, 2, 3].map(candelabra)), floor_wood: floorWood(), carpet: carpet(), bookshelf: bookshelf(),
    brick_dark: brickDark(), pillar: pillar(), torch: sheet([0, 1, 2, 3].map(torch)), floor_stone: floorStone(),
    rune: sheet([0, 1, 2, 3].map(rune)), chains: chains(), banner: banner(), skulls: skulls(),
    loc_floresta: location('floresta'), loc_patio: location('patio'), loc_mansao: location('mansao'), loc_camara: location('camara'),
    path_dot: pathDot(),
    plat_grama: platform('grama'), plat_pedra: platform('pedra'), plat_tapete: platform('tapete'), plat_runa: platform('runa'),
  };
}
